/**
 * Socket.IO transport: maps sockets ↔ (room, player), validates input, runs
 * the per-room phase timer and periodic housekeeping, and emits per-player
 * `state` (PublicGameState + PrivateView) after every change.
 *
 * Presence: a dropped socket or a `presence('hidden')` makes the player `away`
 * (still in the round); `room:rejoin` / a new socket / `presence('visible')`
 * makes them `online`; the engine turns away players `offline` after
 * awayGraceMs (lobbyAwayGraceMs in the lobby; the room timer wakes at
 * game.nextWakeAt()). Offline lobby players are removed after lobbyRemoveMs.
 */
import type { Server, Socket } from 'socket.io';
import { nanoid } from 'nanoid';
import type {
  Ack,
  ClientToServerEvents,
  JoinResult,
  PlayerID,
  ServerToClientEvents,
  WordPack
} from '@oncealiar/shared';
import { AWAY_GRACE_MS, AWAY_TURN_MS, LOBBY_AWAY_GRACE_MS, LOBBY_REMOVE_MS } from '@oncealiar/shared';
import { Game, GameError } from './engine/game.js';
import { isReaction, normalizeCode, randomCode, RateLimiter, sanitizeProfile } from './validation.js';
import { checkUnlockCode } from './premium.js';
import type { Accounts } from './accounts.js';
import { spawnBot } from './botBrain.js';

export interface SocketData {
  code?: string;
  playerId?: PlayerID;
}

type IO = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

interface Room {
  game: Game;
  timer: ReturnType<typeof setTimeout> | null;
  /** when the room last had zero connected players */
  emptySince: number | null;
  /** playerId → socket id */
  sockets: Map<PlayerID, string>;
  /** playerId → verified account id (signed-in players only) */
  users: Map<PlayerID, string>;
  /** this game's result has been written to history */
  recorded: boolean;
}

export interface RoomManagerOptions {
  packs: WordPack[];
  premiumCodes?: string[];
  /** optional accounts backend (history + Party Pass); null/undefined = guests only */
  accounts?: Accounts | null;
  /** extra wait after the host goes OFFLINE before migrating (default 0: migrate as soon as offline) */
  hostGraceMs?: number;
  /** away → offline (default AWAY_GRACE_MS) */
  awayGraceMs?: number;
  /** away → offline while in the lobby (default LOBBY_AWAY_GRACE_MS, 10 min) */
  lobbyAwayGraceMs?: number;
  /** clue turn length for a player who is away when it starts (default AWAY_TURN_MS) */
  awayTurnMs?: number;
  /** offline players are removed from the lobby after this long (default LOBBY_REMOVE_MS, 15 min) */
  lobbyRemoveMs?: number;
  emptyRoomMs?: number;
  sweepMs?: number;
  /** this server's own base URL, so the host can add in-lobby bots ('' = bots disabled) */
  selfUrl?: string;
  /** max bots per room */
  maxBots?: number;
  /** an ended session (final results) is deleted after this long at most (default 10 min) */
  endedRoomMs?: number;
}

export class RoomManager {
  readonly rooms = new Map<string, Room>();
  private reactions = new RateLimiter(5, 3000);
  private sweepTimer: ReturnType<typeof setInterval>;
  /** set once the HTTP server knows its own address (tests listen on a random port) */
  setSelfUrl(url: string): void {
    this.opts.selfUrl = url;
  }

  /** secret the server's own bots present at handshake, so their seats are flagged as bots */
  private readonly botKey = nanoid(32);
  private opts: Required<RoomManagerOptions>;

  constructor(private io: IO, opts: RoomManagerOptions) {
    this.opts = {
      premiumCodes: [],
      accounts: null,
      selfUrl: '',
      maxBots: 5,
      endedRoomMs: 10 * 60_000,
      hostGraceMs: 0,
      awayGraceMs: AWAY_GRACE_MS,
      lobbyAwayGraceMs: LOBBY_AWAY_GRACE_MS,
      awayTurnMs: AWAY_TURN_MS,
      lobbyRemoveMs: LOBBY_REMOVE_MS,
      emptyRoomMs: 10 * 60_000,
      sweepMs: 5_000,
      ...opts
    };
    io.on('connection', (socket) => this.onConnection(socket));
    this.sweepTimer = setInterval(() => this.sweep(Date.now()), this.opts.sweepMs);
    this.sweepTimer.unref?.();
  }

  close(): void {
    clearInterval(this.sweepTimer);
    for (const room of this.rooms.values()) if (room.timer) clearTimeout(room.timer);
    this.rooms.clear();
  }

  // ───────────────────────── connection ─────────────────────────

  private onConnection(socket: GameSocket): void {
    const reply = <T extends object>(ack: unknown, res: ({ ok: true } & T) | { ok: false; error: string }) => {
      if (typeof ack === 'function') (ack as Ack<T>)(res);
    };

    /** Run a game action for the socket's current player, then sync. */
    const act = (fn: (game: Game, playerId: PlayerID, now: number) => void, ack?: unknown) => {
      const room = socket.data.code ? this.rooms.get(socket.data.code) : undefined;
      const pid = socket.data.playerId;
      if (!room || !pid || !room.game.get(pid)) {
        if (ack) reply(ack, { ok: false, error: 'Not in a room' });
        return;
      }
      try {
        fn(room.game, pid, Date.now());
        reply(ack, { ok: true });
      } catch (e) {
        const msg = e instanceof GameError ? e.message : 'Something went wrong';
        if (!(e instanceof GameError)) console.error(e);
        if (typeof ack === 'function') reply(ack, { ok: false, error: msg });
        else socket.emit('toast', msg);
      }
      this.sync(room);
    };

    // Socket.IO connectionStateRecovery: a recovered socket keeps its id, rooms and data
    // (persisted before our disconnect handler cleared it) but sends no room:rejoin → rebind it.
    if (socket.recovered) {
      const { code, playerId } = socket.data ?? {};
      const room = code ? this.rooms.get(code) : undefined;
      if (room && playerId && room.game.get(playerId)) {
        this.bind(socket, room, playerId);
        this.sync(room);
      } else {
        if (code) socket.leave(code);
        socket.data = {};
      }
    }

    socket.on('room:create', (profile, ack) => {
      // a brand-new room is never premium yet → free avatars only
      const p = sanitizeProfile(profile, { premium: false });
      if (!p) return reply(ack, { ok: false, error: 'Invalid name or avatar' });
      this.detach(socket, true);
      const code = this.uniqueCode();
      const game = new Game({
        code,
        packs: this.opts.packs,
        idGen: () => nanoid(10),
        awayGraceMs: this.opts.awayGraceMs,
        lobbyAwayGraceMs: this.opts.lobbyAwayGraceMs,
        awayTurnMs: this.opts.awayTurnMs
      });
      const room: Room = { game, timer: null, emptySince: null, sockets: new Map(), users: new Map(), recorded: false };
      this.rooms.set(code, room);
      const player = game.addPlayer(p, nanoid(24), Date.now());
      this.bind(socket, room, player.id);
      reply<JoinResult>(ack, { ok: true, code, playerId: player.id, token: player.token });
      this.sync(room);
    });

    socket.on('room:join', (rawCode, profile, ack) => {
      const code = normalizeCode(rawCode);
      const room = code ? this.rooms.get(code) : undefined;
      if (!room) return reply(ack, { ok: false, error: 'Room not found' });
      if (room.game.sessionEnded) return reply(ack, { ok: false, error: 'This session has ended' });
      const p = sanitizeProfile(profile, { premium: room.game.premium });
      if (!p) return reply(ack, { ok: false, error: 'Invalid name or avatar' });
      try {
        this.detach(socket, true);
        const player = room.game.addPlayer(p, nanoid(24), Date.now());
        if ((socket.handshake.auth as { botKey?: unknown } | undefined)?.botKey === this.botKey) room.game.markBot(player.id);
        this.bind(socket, room, player.id);
        reply<JoinResult>(ack, { ok: true, code: room.game.code, playerId: player.id, token: player.token });
      } catch (e) {
        return reply(ack, { ok: false, error: e instanceof GameError ? e.message : 'Could not join' });
      }
      this.sync(room);
    });

    socket.on('room:rejoin', (rawCode, token, ack) => {
      const code = normalizeCode(rawCode);
      const room = code ? this.rooms.get(code) : undefined;
      if (!room) return reply(ack, { ok: false, error: 'Room not found' });
      const player = typeof token === 'string' ? room.game.byToken(token) : undefined;
      if (!player) return reply(ack, { ok: false, error: 'Session expired' });
      if (socket.data.code !== room.game.code || socket.data.playerId !== player.id) this.detach(socket, true);
      this.bind(socket, room, player.id);
      reply<JoinResult>(ack, { ok: true, code: room.game.code, playerId: player.id, token: player.token });
      this.sync(room);
    });

    socket.on('room:leave', () => {
      // the host explicitly leaving mid-game ends the session: final results for everyone
      // (in the lobby the host role migrates as usual; a mere disconnect never ends it)
      const room = socket.data.code ? this.rooms.get(socket.data.code) : undefined;
      const pid = socket.data.playerId;
      const me = room && pid ? room.game.get(pid) : undefined;
      if (room && me?.isHost && !room.game.sessionEnded && room.game.phase !== 'lobby') {
        if (!room.game.endSession(Date.now())) return this.endRoom(room.game.code);
      }
      this.detach(socket, true);
    });

    socket.on('profile:update', (profile) => {
      const room = socket.data.code ? this.rooms.get(socket.data.code) : undefined;
      const p = sanitizeProfile(profile, { premium: !!room?.game.premium });
      if (!p) return socket.emit('toast', 'Invalid name or avatar');
      act((g, pid) => g.updateProfile(pid, p));
    });

    socket.on('settings:update', (patch, ack) => act((g, pid) => g.updateSettings(pid, patch), ack));

    socket.on('player:kick', (targetId) => {
      const room = socket.data.code ? this.rooms.get(socket.data.code) : undefined;
      act((g, pid, now) => {
        if (typeof targetId !== 'string') throw new GameError('No such player');
        g.kick(pid, targetId, now);
        const sid = room?.sockets.get(targetId);
        room?.sockets.delete(targetId);
        if (sid) {
          const s = this.io.sockets.sockets.get(sid) as GameSocket | undefined;
          if (s) {
            s.emit('kicked');
            s.leave(g.code);
            s.data = {};
          }
        }
      });
    });

    socket.on('room:addBot', (ack) => {
      const room = socket.data.code ? this.rooms.get(socket.data.code) : undefined;
      const pid = socket.data.playerId;
      if (!room || !pid || !room.game.get(pid)?.isHost) return reply(ack, { ok: false, error: 'Only the host can add bots' });
      if (room.game.sessionEnded) return reply(ack, { ok: false, error: 'This session has ended' });
      if (room.game.phase !== 'lobby') return reply(ack, { ok: false, error: 'Bots can only join in the lobby' });
      if (!this.opts.selfUrl) return reply(ack, { ok: false, error: 'Bots are not available on this server' });
      if (room.game.botCount >= this.opts.maxBots) return reply(ack, { ok: false, error: `Up to ${this.opts.maxBots} bots per room` });
      if (room.game.players.length >= room.game.settings.maxPlayers) return reply(ack, { ok: false, error: 'Room is full' });
      spawnBot({ url: this.opts.selfUrl, code: room.game.code, index: room.game.botCount, botKey: this.botKey, leaveWhenAloneMs: 30_000 });
      reply(ack, { ok: true });
    });

    socket.on('player:makeHost', (targetId, ack) =>
      act((g, pid) => {
        if (typeof targetId !== 'string') throw new GameError('No such player');
        g.transferHost(pid, targetId);
      }, ack)
    );

    socket.on('room:end', (ack) => {
      const room = socket.data.code ? this.rooms.get(socket.data.code) : undefined;
      const pid = socket.data.playerId;
      if (!room || !pid || !room.game.get(pid)?.isHost) return reply(ack, { ok: false, error: 'Only the host can end the game' });
      if (room.game.sessionEnded) return reply(ack, { ok: false, error: 'This session has ended' });
      reply(ack, { ok: true });
      // nothing played yet → close the room (room:ended); otherwise final results for everyone
      if (!room.game.endSession(Date.now())) return this.endRoom(room.game.code);
      this.sync(room);
    });

    socket.on('game:start', (ack) => act((g, pid, now) => g.start(pid, now), ack));
    socket.on('briefing:ready', (ack) => act((g, pid, now) => g.briefingReady(pid, now), ack));
    socket.on('role:ready', (ack) => act((g, pid, now) => g.ready(pid, now), ack));
    socket.on('clue:submit', (text, ack) => act((g, pid, now) => g.submitClue(pid, text, now), ack));
    socket.on('clue:done', (ack) => act((g, pid, now) => g.clueDone(pid, now), ack));
    socket.on('phase:skip', (ack) => act((g, pid, now) => g.skipPhase(pid, now), ack));
    socket.on('vote:cast', (target, ack) => act((g, pid, now) => g.castVote(pid, target, now), ack));
    socket.on('guess:submit', (word, ack) => act((g, pid, now) => g.submitGuess(pid, word, now), ack));
    socket.on('round:next', (ack) => act((g, pid, now) => g.nextRound(pid, now), ack));
    socket.on('game:restart', (ack) => act((g, pid) => g.restart(pid), ack));

    socket.on('room:unlock', async (code, ack) => {
      const room = socket.data.code ? this.rooms.get(socket.data.code) : undefined;
      const pid = socket.data.playerId;
      if (!room || !pid || !room.game.get(pid)?.isHost)
        return reply(ack, { ok: false, error: 'Only the host can do that' });
      if (room.game.sessionEnded) return reply(ack, { ok: false, error: 'This session has ended' });
      const ok = await checkUnlockCode(code, this.opts.premiumCodes);
      if (!ok) return reply(ack, { ok: false, error: 'Invalid unlock code' });
      room.game.setPremium(true);
      reply(ack, { ok: true });
      this.io.to(room.game.code).emit('toast', 'Premium unlocked!');
      this.sync(room);
    });

    socket.on('account:link', async (token, ack) => {
      const accounts = this.opts.accounts;
      if (!accounts) return reply(ack, { ok: false, error: 'Accounts are not enabled' });
      const room = socket.data.code ? this.rooms.get(socket.data.code) : undefined;
      const pid = socket.data.playerId;
      if (!room || !pid) return reply(ack, { ok: false, error: 'Join a room first' });
      const user = await accounts.verifyToken(token);
      if (!user) return reply(ack, { ok: false, error: 'Please sign in again' });
      if (!this.rooms.has(room.game.code) || !room.game.get(pid)) return reply(ack, { ok: false, error: 'Room not found' });
      room.users.set(pid, user.id);
      const premium = await accounts.hasPremium(user.id);
      if (premium && room.game.get(pid)?.isHost && !room.game.premium && !room.game.sessionEnded) {
        room.game.setPremium(true);
        this.io.to(room.game.code).emit('toast', 'Party Pass unlocked for this room!');
        this.sync(room);
      }
      reply<{ premium: boolean }>(ack, { ok: true, premium });
    });

    socket.on('presence', (state) => {
      if (state !== 'visible' && state !== 'hidden') return;
      const room = socket.data.code ? this.rooms.get(socket.data.code) : undefined;
      const pid = socket.data.playerId;
      if (!room || !pid || room.sockets.get(pid) !== socket.id) return;
      act((g, id, now) => g.setVisible(id, state === 'visible', now));
    });

    socket.on('reaction', (emoji) => {
      const { code, playerId } = socket.data;
      if (!code || !playerId || !isReaction(emoji)) return;
      if (this.rooms.get(code)?.game.sessionEnded) return;
      const now = Date.now();
      if (!this.reactions.allow(`${code}:${playerId}`, now)) return;
      this.io.to(code).emit('reaction', { playerId, emoji, at: now });
    });

    socket.on('disconnect', () => this.detach(socket, false));
  }

  // ───────────────────────── binding ─────────────────────────

  private bind(socket: GameSocket, room: Room, playerId: PlayerID): void {
    const prev = room.sockets.get(playerId);
    if (prev && prev !== socket.id) {
      const old = this.io.sockets.sockets.get(prev) as GameSocket | undefined;
      if (old) {
        old.emit('toast', 'You joined from another tab');
        old.leave(room.game.code);
        old.data = {};
      }
    }
    room.sockets.set(playerId, socket.id);
    socket.data = { code: room.game.code, playerId };
    socket.join(room.game.code);
    room.game.setSocket(playerId, true, Date.now());
  }

  /**
   * Detach a socket from its room. `leave` = true removes the player
   * (room:leave / switching rooms); false marks them away (offline after the grace period).
   */
  private detach(socket: GameSocket, leave: boolean): void {
    const { code, playerId } = socket.data;
    socket.data = {};
    if (!code || !playerId) return;
    socket.leave(code);
    const room = this.rooms.get(code);
    if (!room || room.sockets.get(playerId) !== socket.id) return;
    room.sockets.delete(playerId);
    this.reactions.forget(`${code}:${playerId}`);
    const now = Date.now();
    if (leave && room.game.sessionEnded) {
      // final standings stay intact: the seat stays, just offline
      room.game.setSocket(playerId, false, now);
      room.game.goOffline(playerId, now);
    } else if (leave) room.game.removePlayer(playerId, now);
    else room.game.setSocket(playerId, false, now);
    if (room.game.players.length === 0) return this.deleteRoom(code);
    this.sync(room);
  }

  // ───────────────────────── sync / timers ─────────────────────────

  /** an ended session closes once no human is connected, or after endedRoomMs */
  private endedSessionDone(room: Room, now: number): boolean {
    const g = room.game;
    if (!g.sessionEnded) return false;
    const humans = g.players.some((p) => !p.isBot && p.connected);
    return !humans || (g.sessionEndedAt !== null && now - g.sessionEndedAt > this.opts.endedRoomMs);
  }

  /** once per finished game, write each signed-in player's result (fire and forget) */
  private recordHistory(room: Room, state: ReturnType<Game['publicState']>): void {
    if (state.round.phase !== 'game-over') {
      room.recorded = false;
      return;
    }
    const accounts = this.opts.accounts;
    if (room.recorded || !accounts || state.round.number < 1) return;
    room.recorded = true;
    const ranked = [...state.players].sort((a, b) => b.score - a.score);
    const winners = new Set(state.winners ?? []);
    for (const [pid, userId] of room.users) {
      const me = state.players.find((p) => p.id === pid);
      if (!me) continue;
      // standard competition ranking: ties share a rank
      const rank = ranked.findIndex((p) => p.score === me.score) + 1;
      void accounts.recordGame(userId, {
        roomCode: state.code,
        players: state.players.length,
        rounds: state.round.number,
        score: me.score,
        rank,
        won: winners.has(pid)
      });
    }
  }

  sync(room: Room): void {
    const g = room.game;
    const now = Date.now();
    if (!this.rooms.has(g.code)) return;
    if (this.endedSessionDone(room, now)) return this.endRoom(g.code);
    const state = g.publicState(now);
    this.recordHistory(room, state);
    for (const [pid, sid] of room.sockets) {
      if (!g.get(pid)) continue;
      this.io.to(sid).emit('state', state, g.privateView(pid));
    }
    for (const t of g.drainToasts()) this.io.to(g.code).emit('toast', t);

    room.emptySince = g.players.some((p) => p.connected) ? null : (room.emptySince ?? now);

    if (room.timer) clearTimeout(room.timer);
    room.timer = null;
    const wake = g.nextWakeAt();
    if (wake !== null) {
      const delay = Math.max(0, wake - now) + 10;
      room.timer = setTimeout(() => {
        room.timer = null;
        if (!this.rooms.has(g.code)) return;
        g.tick(Date.now());
        this.sync(room);
      }, delay);
    }
  }

  private sweep(now: number): void {
    for (const [code, room] of this.rooms) {
      const { changed } = room.game.maintenance(now, this.opts.hostGraceMs, this.opts.lobbyRemoveMs);
      if (room.game.players.length === 0) {
        this.deleteRoom(code);
        continue;
      }
      if (this.endedSessionDone(room, now)) {
        this.endRoom(code);
        continue;
      }
      if (room.emptySince !== null && now - room.emptySince > this.opts.emptyRoomMs) {
        this.deleteRoom(code);
        continue;
      }
      if (changed) this.sync(room);
    }
  }

  /** close a room for everyone: each socket is told and unbound, then the room is deleted */
  endRoom(code: string): void {
    const room = this.rooms.get(code);
    if (!room) return;
    for (const sid of room.sockets.values()) {
      const s = this.io.sockets.sockets.get(sid) as GameSocket | undefined;
      if (!s) continue;
      s.emit('room:ended');
      s.leave(code);
      s.data = {};
    }
    room.sockets.clear();
    this.deleteRoom(code);
  }

  private deleteRoom(code: string): void {
    const room = this.rooms.get(code);
    if (!room) return;
    if (room.timer) clearTimeout(room.timer);
    this.rooms.delete(code);
  }

  private uniqueCode(): string {
    for (let i = 0; i < 1000; i++) {
      const c = randomCode();
      if (!this.rooms.has(c)) return c;
    }
    throw new Error('Out of room codes');
  }
}
