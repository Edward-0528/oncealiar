/**
 * Pure game engine for one room. No sockets, no timers: every mutating method
 * takes `now` (epoch ms), and the caller is responsible for calling `tick(now)`
 * at/after `phaseEndsAt`. Methods throw GameError on invalid actions.
 *
 * Two-liar rules (liarCount 2, only with >= 7 players in the round):
 *  - the liar team is "caught" if the plurality-accused player is EITHER liar;
 *  - every liar may submit one guess during liar-guess; the first correct guess
 *    ends the phase and the liar team wins (each liar scores liarGuessesWord);
 *  - the phase also ends once every connected liar has guessed, or on timeout.
 *
 * Presence (see Player.presence): a hidden tab or dropped socket makes a player
 * `away` — still connected, still in the round. After `awayGraceMs` they become
 * `offline` (connected=false), which is what all "disconnected" rules key off.
 * The caller should wake the game at `nextWakeAt()` and call `tick(now)`.
 *
 * Mechanics (rules.ts): early lock-in guesses, sudden-death re-vote on ties,
 * warm-up round, score breakdown, game-over awards.
 *
 * Briefing (settings.briefing): the first `start` in a room enters an untimed
 * `briefing` phase (group tutorial). It advances to role-reveal once every
 * non-offline player (online AND away) has sent briefing:ready; offline or
 * departed players never block it. If fewer than minPlayers non-offline players
 * remain, the room goes back to the lobby (like an aborted round) and the next
 * start replays the briefing. No host skip.
 *
 * Practice round (settings.warmupRound): round 1 of the first game gets 1.5×
 * timers and its score breakdown is computed and shown, but the points are not
 * added to scores and the round is not counted in award stats. It still counts
 * toward roundsPerGame (and toward the MAX_ROUNDS_TARGET cap).
 *
 * Game length: settings.targetScore > 0 → first to N. After each round's scoring,
 * if the top score is >= targetScore and exactly one player holds it, the game
 * ends; a tie at the top plays another round (sudden death). MAX_ROUNDS_TARGET
 * rounds is a hard cap (ties share the win). targetScore 0 → exactly
 * roundsPerGame rounds. RoundResult.endsGame tells clients which applies.
 *
 * Spy selection is a fair rotation: per-player spy counts for the current game
 * (reset at each new game; joiners start at the current minimum). Spies are
 * drawn uniformly from the lowest-count dealt players, never repeating last
 * round's Spy while enough other players are dealt in.
 *
 * Session end (endSession): the host ending the session (or leaving mid-game)
 * jumps everyone to game-over with final standings from the current scores; an
 * unfinished round's points never count (they're only added in finishRound).
 * After that `sessionEnded` is set and every gameplay/host action throws.
 *
 * Lobby patience: in the lobby an away player goes offline only after
 * lobbyAwayGraceMs (default LOBBY_AWAY_GRACE_MS, 10 min) instead of awayGraceMs.
 */
import {
  AWAY_GRACE_MS,
  AWAY_TURN_MS,
  DEFAULT_SETTINGS,
  LOBBY_AWAY_GRACE_MS,
  LOBBY_REMOVE_MS,
  MAX_ROUNDS_TARGET,
  TARGET_SCORES,
  RUNOFF_MS,
  SCORE,
  TWO_SPIES_MIN,
  WARMUP_FACTOR,
  type Award,
  type Clue,
  type GameSettings,
  type PackSummary,
  type Phase,
  type Player,
  type PlayerID,
  type Presence,
  type PlayerProfile,
  type PrivateView,
  type PublicGameState,
  type Role,
  type RoundResult,
  type ScoreLine,
  type ScoreRuleId,
  type Topic,
  type WordPack
} from '@oncealiar/shared';

export class GameError extends Error {}

/** safety net only: the phase ends as soon as everyone has read their file */
export const ROLE_REVEAL_MS = 30_000;
export const FREE_MAX_PLAYERS = 12;
export const PREMIUM_MAX_PLAYERS = 20;
export const MAX_CLUE_LENGTH = 24;

const ACTIVE_PHASES: Phase[] = ['role-reveal', 'clues', 'discussion', 'voting', 'liar-guess'];

export interface InternalPlayer extends PlayerProfile {
  id: PlayerID;
  /** added by the host from the lobby; plays randomly */
  isBot?: boolean;
  token: string;
  score: number;
  /** false once offline (away players are still connected) */
  connected: boolean;
  presence: Presence;
  /** transport-level: a socket is bound */
  socketUp: boolean;
  /** client-reported page visibility */
  visible: boolean;
  /** when the player became away (null while online/offline) */
  awaySince: number | null;
  /** when the player went offline */
  disconnectedAt: number | null;
  isHost: boolean;
  ready: boolean;
  /** dealt into the current round (false for players who joined mid-round) */
  inRound: boolean;
}

export interface GameOptions {
  code: string;
  packs: WordPack[];
  premium?: boolean;
  rng?: () => number;
  idGen?: () => string;
  settings?: Partial<GameSettings>;
  /** away → offline after this long (default AWAY_GRACE_MS) */
  awayGraceMs?: number;
  /** away → offline while in the lobby (default LOBBY_AWAY_GRACE_MS) */
  lobbyAwayGraceMs?: number;
  /** max clue turn for a player who is away when the turn starts (default AWAY_TURN_MS) */
  awayTurnMs?: number;
}

interface GameStats {
  spotted: number;
  spyWins: number;
  spyVotes: number;
  codewords: number;
  suspectVotes: number;
}

let fallbackId = 0;

export class Game {
  readonly code: string;
  players: InternalPlayer[] = [];
  settings: GameSettings;
  premium: boolean;
  phase: Phase = 'lobby';
  roundNumber = 0;
  phaseEndsAt: number | null = null;
  topic: Topic | null = null;
  secretWord: string | null = null;
  liarIds: PlayerID[] = [];
  turnOrder: PlayerID[] = [];
  currentTurn = 0;
  clues: Clue[] = [];
  votes = new Map<PlayerID, PlayerID>();
  guesses = new Map<PlayerID, string>();
  accusedId: PlayerID | null = null;
  result: RoundResult | null = null;
  winners: PlayerID[] | undefined;
  usedTopicIds = new Set<string>();
  /** early lock-in guesses (spy → grid word) this round */
  locks = new Map<PlayerID, string>();
  /** non-null during the sudden-death re-vote */
  runoff: PlayerID[] | null = null;
  /** first-round votes, kept once a re-vote starts */
  firstVotes: Map<PlayerID, PlayerID> | null = null;
  /** games started in this room (warm-up applies to the first) */
  gamesStarted = 0;
  awards: Award[] | undefined;
  /** host ended the session: read-only game-over (see endSession) */
  sessionEnded = false;
  /** when the session was ended (epoch ms) */
  sessionEndedAt: number | null = null;
  private stats = new Map<PlayerID, GameStats>();
  /** fair Spy rotation: times each player has been Spy this game */
  spyCounts = new Map<PlayerID, number>();
  /** Spies of the previous dealt round (not repeated back-to-back) */
  lastSpyIds: PlayerID[] = [];
  /** lastSpyIds before the current deal (restored if the round is aborted) */
  private prevLastSpyIds: PlayerID[] = [];
  /** clue turn bookkeeping for away players */
  private turnStartedAt = 0;
  private turnShortened = false;
  /** messages for the transport layer to broadcast as toasts */
  private toasts: string[] = [];

  private readonly packs: WordPack[];
  private readonly rng: () => number;
  private readonly idGen: () => string;
  readonly awayGraceMs: number;
  readonly lobbyAwayGraceMs: number;
  readonly awayTurnMs: number;

  constructor(opts: GameOptions) {
    this.awayGraceMs = opts.awayGraceMs ?? AWAY_GRACE_MS;
    this.lobbyAwayGraceMs = opts.lobbyAwayGraceMs ?? LOBBY_AWAY_GRACE_MS;
    this.awayTurnMs = opts.awayTurnMs ?? AWAY_TURN_MS;
    this.code = opts.code;
    this.packs = opts.packs;
    this.premium = !!opts.premium;
    this.rng = opts.rng ?? Math.random;
    this.idGen = opts.idGen ?? (() => `p${++fallbackId}`);
    this.settings = { ...DEFAULT_SETTINGS, packIds: [...DEFAULT_SETTINGS.packIds] };
    if (opts.settings) Object.assign(this.settings, opts.settings);
    this.settings.packIds = this.sanitizePackIds(this.settings.packIds, this.settings.familyFriendly);
    if (this.settings.packIds.length === 0) this.settings.packIds = this.defaultPackIds();
    this.settings.maxPlayers = Math.min(this.settings.maxPlayers, this.maxPlayersCap());
  }

  // ───────────────────────── players ─────────────────────────

  get(id: PlayerID): InternalPlayer | undefined {
    return this.players.find((p) => p.id === id);
  }

  byToken(token: string): InternalPlayer | undefined {
    return this.players.find((p) => p.token === token);
  }

  get host(): InternalPlayer | undefined {
    return this.players.find((p) => p.isHost);
  }

  addPlayer(profile: PlayerProfile, token: string, now: number): InternalPlayer {
    this.assertLive();
    if (this.players.length >= this.settings.maxPlayers) throw new GameError('Room is full');
    const p: InternalPlayer = {
      ...profile,
      name: this.uniqueName(profile.name),
      id: this.idGen(),
      token,
      score: 0,
      connected: true,
      presence: 'online',
      socketUp: true,
      visible: true,
      awaySince: null,
      disconnectedAt: null,
      isHost: this.players.length === 0,
      ready: false,
      inRound: false
    };
    this.players.push(p);
    // joiners start at the current minimum spy count, so they aren't forced to be Spy next
    if (this.spyCounts.size > 0) {
      const counts = this.players.filter((x) => this.spyCounts.has(x.id)).map((x) => this.spyCounts.get(x.id)!);
      this.spyCounts.set(p.id, counts.length ? Math.min(...counts) : 0);
    }
    void now;
    return p;
  }

  /** Server-authoritative codename de-dupe: "Sam" → "Sam 2", "Sam 3"… (max 16 chars). */
  uniqueName(name: string, exceptId?: PlayerID): string {
    const taken = new Set(this.players.filter((p) => p.id !== exceptId).map((p) => p.name.toLowerCase()));
    if (!taken.has(name.toLowerCase())) return name;
    for (let n = 2; n < 100; n++) {
      const suffix = ` ${n}`;
      const base = Array.from(name).slice(0, 16 - suffix.length).join('').trimEnd();
      const candidate = `${base}${suffix}`;
      if (!taken.has(candidate.toLowerCase())) return candidate;
    }
    return name;
  }

  /** flag a player as a bot (set by the room manager for server-spawned bots) */
  markBot(id: PlayerID): void {
    const p = this.get(id);
    if (p) p.isBot = true;
  }

  get botCount(): number {
    return this.players.filter((p) => p.isBot).length;
  }

  updateProfile(id: PlayerID, profile: PlayerProfile): void {
    this.assertLive();
    const p = this.mustGet(id);
    p.name = this.uniqueName(profile.name, id);
    p.avatar = profile.avatar;
    p.color = profile.color;
  }

  // ───────────────────────── presence ─────────────────────────

  /** Transport: a socket was bound (true) or dropped (false). A new socket counts as visible. */
  setSocket(id: PlayerID, up: boolean, now: number): void {
    const p = this.get(id);
    if (!p) return;
    p.socketUp = up;
    if (up) p.visible = true;
    this.refreshPresence(p, now);
  }

  /** Client-reported page visibility (presence event). */
  setVisible(id: PlayerID, visible: boolean, now: number): void {
    const p = this.get(id);
    if (!p) return;
    p.visible = visible;
    this.refreshPresence(p, now);
  }

  /** @deprecated alias of setSocket (kept for older callers). */
  setConnected(id: PlayerID, connected: boolean, now: number): void {
    this.setSocket(id, connected, now);
  }

  /** Force a player offline right away (tests / admin). */
  goOffline(id: PlayerID, now: number): void {
    const p = this.get(id);
    if (p && p.presence !== 'offline') this.markOffline(p, now);
  }

  private refreshPresence(p: InternalPlayer, now: number): void {
    const here = p.socketUp && p.visible;
    if (here) {
      if (p.presence === 'online') return;
      p.presence = 'online';
      p.connected = true;
      p.awaySince = null;
      p.disconnectedAt = null;
      this.onReturn(p, now);
      return;
    }
    // not here: online → away; offline but a socket came back (tab hidden) → away again
    if (p.presence === 'online' || (p.presence === 'offline' && p.socketUp)) {
      p.presence = 'away';
      p.connected = true;
      p.awaySince = now;
      p.disconnectedAt = null;
      this.checkAutoAdvance(now);
    }
  }

  private onReturn(p: InternalPlayer, now: number): void {
    // back during your own shortened clue turn → get the full turn back
    if (this.phase === 'clues' && this.turnOrder[this.currentTurn] === p.id && this.turnShortened) {
      this.turnShortened = false;
      const full = this.turnStartedAt + this.ms(this.settings.clueSeconds);
      if (this.phaseEndsAt !== null && full > this.phaseEndsAt) this.phaseEndsAt = full;
    }
  }

  private markOffline(p: InternalPlayer, now: number): void {
    p.presence = 'offline';
    p.connected = false;
    p.awaySince = null;
    p.disconnectedAt = now;
    if (p.isHost) {
      const next =
        this.players.find((x) => !x.isBot && x.presence === 'online' && x.id !== p.id) ??
        this.players.find((x) => !x.isBot && x.connected && x.id !== p.id);
      if (next) {
        this.setHost(next.id);
        this.toasts.push(`${next.name} is now the host`);
      }
    }
    if (ACTIVE_PHASES.includes(this.phase) && p.inRound) {
      if (this.liarIds.includes(p.id) && this.phase !== 'liar-guess' && !this.liarIds.some((l) => this.get(l)?.connected)) {
        this.abortRound(now, `${p.name} (the Spy) left — dealing a new round`);
        return;
      }
      const inRound = this.players.filter((x) => x.inRound && x.connected).length;
      if (inRound < 3) {
        this.abortRound(now, 'Not enough players left — round cancelled');
        return;
      }
    }
    this.checkAutoAdvance(now);
  }

  /** away → offline grace for the current phase (longer in the lobby: screens time out at parties) */
  private get graceMs(): number {
    return this.phase === 'lobby' ? Math.max(this.awayGraceMs, this.lobbyAwayGraceMs) : this.awayGraceMs;
  }

  /** away players past the grace period go offline. Returns true if anyone changed. */
  private expireAway(now: number): boolean {
    let changed = false;
    for (const p of [...this.players]) {
      if (p.presence === 'away' && p.awaySince !== null && now - p.awaySince >= this.graceMs && this.get(p.id)) {
        const expiredAt = p.awaySince + this.graceMs;
        this.markOffline(p, now);
        if (!p.connected) p.disconnectedAt = expiredAt; // (not re-dealt/removed meanwhile)
        changed = true;
      }
    }
    return changed;
  }

  /** Earliest time the caller must call tick(): phase deadline or an away grace expiry. */
  nextWakeAt(): number | null {
    let t = this.phaseEndsAt;
    for (const p of this.players) {
      if (p.presence === 'away' && p.awaySince !== null) {
        const at = p.awaySince + this.graceMs;
        if (t === null || at < t) t = at;
      }
    }
    return t;
  }

  removePlayer(id: PlayerID, now: number): void {
    const p = this.get(id);
    if (!p) return;
    this.players = this.players.filter((x) => x.id !== id);
    this.votes.delete(id);
    for (const [voter, target] of this.votes) if (target === id) this.votes.delete(voter);
    this.guesses.delete(id);
    this.locks.delete(id);
    if (this.runoff) this.runoff = this.runoff.filter((x) => x !== id);
    if (p.isHost) this.ensureHost();

    if (ACTIVE_PHASES.includes(this.phase) && p.inRound) {
      const liarsLeft = this.liarIds.some((l) => this.get(l));
      const inRound = this.players.filter((x) => x.inRound).length;
      if (!liarsLeft || inRound < 3) {
        this.abortRound(now, liarsLeft ? 'Not enough players left — round cancelled' : 'The Spy left — dealing a new round');
        return;
      }
      if (this.phase === 'clues') {
        const idx = this.turnOrder.indexOf(id);
        const wasCurrent = idx === this.currentTurn;
        if (idx !== -1) {
          this.turnOrder.splice(idx, 1);
          if (idx < this.currentTurn) this.currentTurn--;
        }
        if (wasCurrent) {
          this.currentTurn--;
          this.advanceTurn(now);
          return;
        }
      } else {
        this.turnOrder = this.turnOrder.filter((x) => x !== id);
      }
    }
    this.checkAutoAdvance(now);
  }

  kick(byId: PlayerID, targetId: PlayerID, now: number): void {
    this.assertLive();
    this.requireHost(byId);
    if (byId === targetId) throw new GameError("You can't kick yourself");
    if (!this.get(targetId)) throw new GameError('No such player');
    this.removePlayer(targetId, now);
  }

  /** host hands the role to another connected human */
  transferHost(byId: PlayerID, targetId: PlayerID): void {
    this.assertLive();
    this.requireHost(byId);
    const t = this.get(targetId);
    if (!t) throw new GameError('No such player');
    if (t.isBot) throw new GameError("A bot can't be the host");
    if (!t.connected) throw new GameError(`${t.name} isn't connected`);
    if (t.id === byId) return;
    this.setHost(t.id);
    this.toasts.push(`${t.name} is now the host`);
  }

  setHost(id: PlayerID): void {
    const p = this.mustGet(id);
    for (const x of this.players) x.isHost = false;
    p.isHost = true;
  }

  /** Make sure someone is host, preferring connected players in join order. */
  private ensureHost(): void {
    if (this.players.length === 0 || this.host) return;
    // bots never host: with only bots left, nobody is host (the room empties out)
    const next = this.players.find((p) => !p.isBot && p.connected) ?? this.players.find((p) => !p.isBot);
    if (next) next.isHost = true;
  }

  /**
   * Periodic housekeeping. Returns ids of players removed.
   *  - away players past the grace period go offline
   *  - host offline > hostGraceMs and someone else is connected → migrate
   *    (host migration never happens while the host is merely away)
   *  - in lobby, players offline > lobbyRemoveMs are removed
   */
  maintenance(now: number, hostGraceMs = 0, lobbyRemoveMs = LOBBY_REMOVE_MS): { changed: boolean; removed: PlayerID[] } {
    let changed = this.expireAway(now);
    const removed: PlayerID[] = [];
    if (this.phase === 'lobby') {
      for (const p of [...this.players]) {
        if (!p.connected && p.disconnectedAt !== null && now - p.disconnectedAt > lobbyRemoveMs) {
          this.removePlayer(p.id, now);
          removed.push(p.id);
          changed = true;
        }
      }
    }
    const h = this.host;
    if (h && !h.connected && h.disconnectedAt !== null && now - h.disconnectedAt > hostGraceMs) {
      const next =
        this.players.find((p) => !p.isBot && p.presence === 'online' && p.id !== h.id) ??
        this.players.find((p) => !p.isBot && p.connected && p.id !== h.id);
      if (next) {
        this.setHost(next.id);
        this.toasts.push(`${next.name} is now the host`);
        changed = true;
      }
    }
    return { changed, removed };
  }

  // ───────────────────────── settings / premium ─────────────────────────

  maxPlayersCap(): number {
    return this.premium ? PREMIUM_MAX_PLAYERS : FREE_MAX_PLAYERS;
  }

  setPremium(premium: boolean): void {
    this.premium = premium;
    this.settings.maxPlayers = Math.min(this.settings.maxPlayers, this.maxPlayersCap());
    this.settings.packIds = this.sanitizePackIds(this.settings.packIds, this.settings.familyFriendly);
    if (this.settings.packIds.length === 0) this.settings.packIds = this.defaultPackIds();
  }

  updateSettings(byId: PlayerID, patch: Partial<GameSettings>): void {
    this.assertLive();
    this.requireHost(byId);
    if (this.phase !== 'lobby') throw new GameError('Settings can only change in the lobby');
    if (!patch || typeof patch !== 'object') throw new GameError('Invalid settings');
    const s = { ...this.settings };
    const int = (v: unknown, min: number, max: number, name: string): number => {
      if (typeof v !== 'number' || !Number.isFinite(v)) throw new GameError(`Invalid ${name}`);
      return Math.max(min, Math.min(max, Math.round(v)));
    };
    const bool = (v: unknown, name: string): boolean => {
      if (typeof v !== 'boolean') throw new GameError(`Invalid ${name}`);
      return v;
    };
    if (patch.minPlayers !== undefined) s.minPlayers = int(patch.minPlayers, 3, this.maxPlayersCap(), 'minPlayers');
    if (patch.maxPlayers !== undefined) {
      if (typeof patch.maxPlayers === 'number' && patch.maxPlayers > this.maxPlayersCap() && !this.premium)
        throw new GameError(`Free rooms are limited to ${FREE_MAX_PLAYERS} players`);
      s.maxPlayers = int(patch.maxPlayers, 3, this.maxPlayersCap(), 'maxPlayers');
    }
    if (patch.liarCount !== undefined) {
      if (patch.liarCount !== 1 && patch.liarCount !== 2) throw new GameError('Invalid liarCount');
      s.liarCount = patch.liarCount;
    }
    if (patch.clueMode !== undefined) {
      if (patch.clueMode !== 'spoken' && patch.clueMode !== 'typed') throw new GameError('Invalid clueMode');
      s.clueMode = patch.clueMode;
    }
    if (patch.clueSeconds !== undefined) s.clueSeconds = int(patch.clueSeconds, 10, 120, 'clueSeconds');
    if (patch.discussionSeconds !== undefined) s.discussionSeconds = int(patch.discussionSeconds, 15, 600, 'discussionSeconds');
    if (patch.votingSeconds !== undefined) s.votingSeconds = int(patch.votingSeconds, 10, 180, 'votingSeconds');
    if (patch.guessSeconds !== undefined) s.guessSeconds = int(patch.guessSeconds, 10, 120, 'guessSeconds');
    if (patch.roundsPerGame !== undefined) s.roundsPerGame = int(patch.roundsPerGame, 1, 20, 'roundsPerGame');
    if (patch.targetScore !== undefined) {
      if (patch.targetScore !== 0 && !(TARGET_SCORES as readonly unknown[]).includes(patch.targetScore))
        throw new GameError('Invalid targetScore');
      s.targetScore = patch.targetScore;
    }
    if (patch.liarSeesTopic !== undefined) s.liarSeesTopic = bool(patch.liarSeesTopic, 'liarSeesTopic');
    if (patch.familyFriendly !== undefined) s.familyFriendly = bool(patch.familyFriendly, 'familyFriendly');
    if (patch.warmupRound !== undefined) s.warmupRound = bool(patch.warmupRound, 'warmupRound');
    if (patch.briefing !== undefined) s.briefing = bool(patch.briefing, 'briefing');
    if (s.minPlayers > s.maxPlayers) s.minPlayers = s.maxPlayers;
    if (s.maxPlayers < this.players.length) throw new GameError('There are already more players than that');

    if (patch.packIds !== undefined) {
      if (!Array.isArray(patch.packIds) || patch.packIds.some((x) => typeof x !== 'string'))
        throw new GameError('Invalid packIds');
      for (const id of patch.packIds) {
        const pack = this.packs.find((p) => p.id === id);
        if (!pack) throw new GameError(`Unknown pack: ${id}`);
        if (pack.premium && !this.premium) throw new GameError(`"${pack.name}" is a premium pack`);
        if (pack.mature && s.familyFriendly) throw new GameError(`"${pack.name}" isn't family friendly`);
      }
      s.packIds = [...new Set(patch.packIds)];
    } else {
      // e.g. familyFriendly turned on → drop mature packs silently
      s.packIds = this.sanitizePackIds(s.packIds, s.familyFriendly);
    }
    if (s.packIds.length === 0) throw new GameError('Pick at least one word pack');
    this.settings = s;
  }

  private sanitizePackIds(ids: string[], familyFriendly: boolean): string[] {
    return ids.filter((id) => {
      const pack = this.packs.find((p) => p.id === id);
      return !!pack && (!pack.premium || this.premium) && (!pack.mature || !familyFriendly);
    });
  }

  private defaultPackIds(): string[] {
    const free = this.packs.find((p) => !p.premium && !p.mature);
    return free ? [free.id] : [];
  }

  // ───────────────────────── round flow ─────────────────────────

  start(byId: PlayerID, now: number): void {
    this.assertLive();
    this.requireHost(byId);
    if (this.phase !== 'lobby') throw new GameError('Game already started');
    const connected = this.players.filter((p) => p.connected).length;
    if (connected < this.settings.minPlayers) throw new GameError(`Need at least ${this.settings.minPlayers} players`);
    for (const p of this.players) p.score = 0;
    this.roundNumber = 0;
    this.winners = undefined;
    this.awards = undefined;
    this.stats.clear();
    this.resetSpyRotation();
    if (this.settings.briefing && this.gamesStarted === 0) {
      // first game in this room: group tutorial first (untimed, everyone confirms)
      this.toLobby();
      this.setPhase('briefing', null);
      return;
    }
    this.beginGame(now);
  }

  /** deal round 1 of a new game (from lobby or briefing) */
  private beginGame(now: number): void {
    this.gamesStarted++;
    try {
      this.startRound(now);
    } catch (e) {
      this.gamesStarted--;
      throw e;
    }
  }

  /** briefing: "I get it". Idempotent; ignored outside the briefing. */
  briefingReady(id: PlayerID, now: number): void {
    this.assertLive();
    const p = this.mustGet(id);
    if (this.phase !== 'briefing') return;
    p.ready = true;
    this.checkAutoAdvance(now);
  }

  /** briefing → role-reveal once every non-offline player is ready; → lobby if too few remain */
  private checkBriefing(now: number): void {
    const present = this.players.filter((p) => p.presence !== 'offline');
    if (present.length < Math.max(3, this.settings.minPlayers)) {
      this.toasts.push('Not enough players — back to the lobby');
      this.toLobby();
      return;
    }
    if (!present.every((p) => p.ready)) return;
    try {
      this.beginGame(now);
    } catch (e) {
      this.toasts.push(e instanceof GameError ? e.message : 'Could not start the game');
      this.toLobby();
    }
  }

  /** true during the warm-up round: round 1 of the first game in this room */
  get warmup(): boolean {
    // a one-round game never becomes all-practice (everyone would tie at 0)
    return this.settings.warmupRound && (this.settings.targetScore > 0 || this.settings.roundsPerGame > 1) && this.gamesStarted === 1 && this.roundNumber === 1 && this.phase !== 'lobby';
  }

  /** seconds → ms, stretched during the warm-up round */
  private ms(seconds: number): number {
    return Math.round(seconds * 1000 * (this.warmup ? WARMUP_FACTOR : 1));
  }

  private startRound(now: number): void {
    const dealt = this.players.filter((p) => p.connected);
    if (dealt.length < 3) throw new GameError('Need at least 3 connected players');
    const topic = this.pickTopic();
    if (!topic) throw new GameError('No topics available in the selected packs');
    this.topic = topic;
    this.secretWord = topic.words[Math.floor(this.rng() * topic.words.length)];
    for (const p of this.players) {
      p.inRound = dealt.includes(p);
      p.ready = false;
    }
    const liarCount = this.settings.liarCount === 2 && dealt.length >= TWO_SPIES_MIN ? 2 : 1;
    this.liarIds = this.pickSpies(dealt.map((p) => p.id), liarCount);
    this.turnOrder = this.shuffle(dealt.map((p) => p.id));
    this.currentTurn = 0;
    this.clues = [];
    this.resetVoting();
    this.roundNumber++;
    this.setPhase('role-reveal', now + ROLE_REVEAL_MS);
  }

  private resetSpyRotation(): void {
    this.spyCounts.clear();
    this.lastSpyIds = [];
    this.prevLastSpyIds = [];
  }

  /**
   * Fair rotation: draw uniformly (this.rng) among dealt players with the lowest
   * spy count this game, excluding last round's Spies when that still leaves
   * enough candidates (always true with >= 3 dealt and 1 Spy).
   */
  private pickSpies(dealt: PlayerID[], liarCount: number): PlayerID[] {
    const known = dealt.filter((id) => this.spyCounts.has(id)).map((id) => this.spyCounts.get(id)!);
    const min = known.length ? Math.min(...known) : 0;
    for (const id of dealt) if (!this.spyCounts.has(id)) this.spyCounts.set(id, min);
    const picked: PlayerID[] = [];
    const fresh = dealt.filter((id) => !this.lastSpyIds.includes(id));
    const pool = dealt.length >= 3 && fresh.length >= liarCount ? fresh : dealt;
    for (let k = 0; k < liarCount; k++) {
      const left = pool.filter((id) => !picked.includes(id));
      const low = Math.min(...left.map((id) => this.spyCounts.get(id)!));
      const lowest = left.filter((id) => this.spyCounts.get(id) === low);
      picked.push(lowest[Math.floor(this.rng() * lowest.length)]);
    }
    for (const id of picked) this.spyCounts.set(id, this.spyCounts.get(id)! + 1);
    this.prevLastSpyIds = this.lastSpyIds;
    this.lastSpyIds = [...picked];
    return picked;
  }

  /** undo the current deal's spy bookkeeping (round aborted before it was played) */
  private undoSpyPick(): void {
    for (const id of this.liarIds) {
      const c = this.spyCounts.get(id);
      if (c !== undefined) this.spyCounts.set(id, Math.max(0, c - 1));
    }
    this.lastSpyIds = this.prevLastSpyIds;
  }

  private pickTopic(): Topic | null {
    const ids = this.sanitizePackIds(this.settings.packIds, this.settings.familyFriendly);
    const all = this.packs
      .filter((p) => ids.includes(p.id))
      .flatMap((p) => p.topics)
      .filter((t) => Array.isArray(t.words) && t.words.length >= 2);
    if (all.length === 0) return null;
    let fresh = all.filter((t) => !this.usedTopicIds.has(t.id));
    if (fresh.length === 0) {
      for (const t of all) this.usedTopicIds.delete(t.id);
      fresh = all;
    }
    const t = fresh[Math.floor(this.rng() * fresh.length)];
    this.usedTopicIds.add(t.id);
    return t;
  }

  private abortRound(now: number, reason: string): void {
    this.toasts.push(reason);
    this.undoSpyPick();
    const connected = this.players.filter((p) => p.connected).length;
    if (connected >= Math.max(3, this.settings.minPlayers)) {
      this.roundNumber--;
      try {
        this.startRound(now);
        return;
      } catch {
        this.roundNumber++;
      }
    }
    this.toLobby();
  }

  private toLobby(): void {
    this.setPhase('lobby', null);
    this.topic = null;
    this.secretWord = null;
    this.liarIds = [];
    this.turnOrder = [];
    this.currentTurn = 0;
    this.clues = [];
    this.resetVoting();
    for (const p of this.players) {
      p.inRound = false;
      p.ready = false;
    }
  }

  private resetVoting(): void {
    this.votes.clear();
    this.guesses.clear();
    this.locks.clear();
    this.runoff = null;
    this.firstVotes = null;
    this.accusedId = null;
    this.result = null;
  }

  ready(id: PlayerID, now: number): void {
    this.assertLive();
    const p = this.mustGet(id);
    if (this.phase !== 'role-reveal') return;
    if (!p.inRound) throw new GameError("You joined mid-round. You'll play from the next round.");
    p.ready = true;
    this.checkAutoAdvance(now);
  }

  submitClue(id: PlayerID, text: unknown, now: number): void {
    this.assertLive();
    if (this.phase !== 'clues') throw new GameError('Not the clue phase');
    if (this.settings.clueMode !== 'typed') throw new GameError('Clues are spoken this game');
    if (this.turnOrder[this.currentTurn] !== id) throw new GameError("It's not your turn");
    if (typeof text !== 'string') throw new GameError('Invalid clue');
    const clue = text.trim();
    if (clue.length === 0) throw new GameError('Clue is empty');
    if (/\s/.test(clue)) throw new GameError('One word only');
    if (clue.length > MAX_CLUE_LENGTH) throw new GameError(`Max ${MAX_CLUE_LENGTH} characters`);
    this.clues.push({ playerId: id, text: clue, at: now });
    this.advanceTurn(now);
  }

  clueDone(id: PlayerID, now: number): void {
    this.assertLive();
    if (this.phase !== 'clues') throw new GameError('Not the clue phase');
    if (this.settings.clueMode !== 'spoken') throw new GameError('Type your clue instead');
    const current = this.turnOrder[this.currentTurn];
    const p = this.mustGet(id);
    if (current !== id && !p.isHost) throw new GameError("It's not your turn");
    this.clues.push({ playerId: current, at: now });
    this.advanceTurn(now);
  }

  castVote(id: PlayerID, targetId: unknown, now: number): void {
    this.assertLive();
    if (this.phase !== 'voting') throw new GameError('Not voting right now');
    const p = this.mustGet(id);
    if (!p.inRound) throw new GameError("You're not in this round");
    if (typeof targetId !== 'string') throw new GameError('Invalid vote');
    const target = this.get(targetId);
    if (!target || !target.inRound) throw new GameError('Invalid vote');
    if (targetId === id) throw new GameError("You can't vote for yourself");
    if (this.runoff && !this.runoff.includes(targetId)) throw new GameError('Sudden death: vote for one of the tied players');
    this.votes.set(id, targetId);
    this.checkAutoAdvance(now);
  }

  /**
   * Spy guesses. During clues/discussion/voting this is the early lock-in
   * (once per round); during liar-guess it is the final guess.
   */
  submitGuess(id: PlayerID, word: unknown, now: number): void {
    this.assertLive();
    const early = this.phase === 'clues' || this.phase === 'discussion' || this.phase === 'voting';
    if (this.phase !== 'liar-guess' && !early) throw new GameError('Not guessing right now');
    if (!this.liarIds.includes(id)) throw new GameError('Only the Spy can guess');
    if (typeof word !== 'string' || !this.topic) throw new GameError('Invalid guess');
    const norm = word.trim().toLowerCase();
    const match = this.topic.words.find((w) => w.toLowerCase() === norm);
    if (!match) throw new GameError('Pick a word from the grid');
    if (early) {
      if (this.locks.has(id)) throw new GameError('You already locked in a guess');
      this.locks.set(id, match);
      return;
    }
    if (this.guesses.has(id)) throw new GameError('You already guessed');
    this.guesses.set(id, match);
    if (this.isCorrect(match)) {
      this.finishRound(now);
      return;
    }
    this.checkAutoAdvance(now);
  }

  skipPhase(byId: PlayerID, now: number): void {
    this.assertLive();
    this.requireHost(byId);
    switch (this.phase) {
      case 'briefing':
        return; // no host skip: nobody gets left behind
      case 'clues':
        this.enterDiscussion(now);
        break;
      case 'role-reveal':
      case 'discussion':
      case 'voting':
      case 'liar-guess':
        this.timeout(now);
        break;
      default:
        throw new GameError('Nothing to skip');
    }
  }

  nextRound(byId: PlayerID, now: number): void {
    this.assertLive();
    this.requireHost(byId);
    if (this.phase !== 'results') throw new GameError('Round not finished');
    if (this.gameEnds()) {
      const max = Math.max(...this.players.map((p) => p.score));
      this.winners = this.players.filter((p) => p.score === max).map((p) => p.id);
      this.awards = this.computeAwards();
      this.setPhase('game-over', null);
      return;
    }
    this.startRound(now);
  }

  /**
   * Host ends the session. Returns false when nothing has been played yet in this
   * game (lobby with no rounds, or the pre-game briefing): the caller should close
   * the room as before. Otherwise moves to game-over with winners/awards from the
   * current scores (an unfinished round scores nothing) and marks the session ended.
   */
  endSession(now: number): boolean {
    void now;
    if (this.sessionEnded) return true;
    if ((this.phase === 'lobby' && this.roundNumber === 0) || this.phase === 'briefing') return false;
    if (this.phase !== 'game-over') {
      if (this.phase !== 'results') {
        // abort the round in progress: no result, nobody's points change
        this.resetVoting();
      }
      this.liarIds = [];
      this.turnOrder = [];
      this.clues = [];
      this.topic = null;
      this.secretWord = null;
      for (const p of this.players) p.ready = false;
      const max = this.players.length ? Math.max(...this.players.map((p) => p.score)) : 0;
      this.winners = this.players.filter((p) => p.score === max).map((p) => p.id);
      this.awards = this.computeAwards();
      this.setPhase('game-over', null);
    }
    this.sessionEnded = true;
    this.sessionEndedAt = now;
    return true;
  }

  private assertLive(): void {
    if (this.sessionEnded) throw new GameError('This session has ended');
  }

  /**
   * Does the round just finished end the game? targetScore 0: after roundsPerGame
   * rounds. Otherwise: a single leader at >= targetScore (a tie at the top plays on),
   * or MAX_ROUNDS_TARGET rounds played.
   */
  gameEnds(): boolean {
    const target = this.settings.targetScore;
    if (!target) return this.roundNumber >= this.settings.roundsPerGame;
    if (this.roundNumber >= MAX_ROUNDS_TARGET) return true;
    if (this.players.length === 0) return false;
    const max = Math.max(...this.players.map((p) => p.score));
    return max >= target && this.players.filter((p) => p.score === max).length === 1;
  }

  restart(byId: PlayerID): void {
    this.assertLive();
    this.requireHost(byId);
    if (this.phase !== 'game-over') throw new GameError('Game is not over');
    for (const p of this.players) p.score = 0;
    this.roundNumber = 0;
    this.winners = undefined;
    this.awards = undefined;
    this.stats.clear();
    this.resetSpyRotation();
    this.toLobby();
  }

  /** Advance if the current phase deadline has passed. Returns true if state changed. */
  tick(now: number): boolean {
    const changed = this.expireAway(now);
    if (this.phaseEndsAt === null || now < this.phaseEndsAt) return changed;
    this.timeout(now);
    return true;
  }

  private timeout(now: number): void {
    switch (this.phase) {
      case 'role-reveal':
        this.enterClues(now);
        break;
      case 'clues': {
        const cur = this.get(this.turnOrder[this.currentTurn]);
        if (cur && cur.presence === 'away') this.toasts.push(`${cur.name} stepped away — skipped`);
        this.advanceTurn(now);
        break;
      }
      case 'discussion':
        this.votes.clear();
        this.runoff = null;
        this.firstVotes = null;
        this.setPhase('voting', now + this.ms(this.settings.votingSeconds));
        break;
      case 'voting':
        this.resolveVotes(now);
        break;
      case 'liar-guess':
        this.finishRound(now);
        break;
      default:
        this.phaseEndsAt = null;
    }
  }

  private enterClues(now: number): void {
    this.phase = 'clues';
    this.currentTurn = -1;
    this.advanceTurn(now);
  }

  /** Move to the next connected player in turn order, or to discussion. */
  private advanceTurn(now: number): void {
    let i = this.currentTurn + 1;
    while (i < this.turnOrder.length && !this.get(this.turnOrder[i])?.connected) i++;
    if (i >= this.turnOrder.length) {
      this.currentTurn = Math.max(0, this.turnOrder.length - 1);
      this.enterDiscussion(now);
      return;
    }
    this.currentTurn = i;
    const full = this.ms(this.settings.clueSeconds);
    const away = this.get(this.turnOrder[i])?.presence === 'away';
    this.turnStartedAt = now;
    this.turnShortened = away && this.awayTurnMs < full;
    this.setPhase('clues', now + (this.turnShortened ? this.awayTurnMs : full));
  }

  private enterDiscussion(now: number): void {
    this.setPhase('discussion', now + this.ms(this.settings.discussionSeconds));
  }

  private resolveVotes(now: number): void {
    const tally = new Map<PlayerID, number>();
    for (const t of this.votes.values()) tally.set(t, (tally.get(t) ?? 0) + 1);
    const bestN = Math.max(0, ...tally.values());
    const top = bestN > 0 ? [...tally].filter(([, n]) => n === bestN).map(([id]) => id) : [];
    if (top.length > 1 && !this.runoff) {
      // sudden death: one 10s re-vote between the tied players
      this.runoff = top;
      this.firstVotes = new Map(this.votes);
      this.votes.clear();
      this.setPhase('voting', now + RUNOFF_MS);
      return;
    }
    this.accusedId = top.length === 1 ? top[0] : null;
    if (this.accusedId && this.liarIds.includes(this.accusedId)) {
      // caught: early lock-ins count as final answers
      for (const l of this.liarIds) {
        const lock = this.locks.get(l);
        if (lock !== undefined) this.guesses.set(l, lock);
      }
      const connected = this.liarIds.filter((l) => this.get(l)?.connected);
      if ([...this.guesses.values()].some((g) => this.isCorrect(g)) || connected.every((l) => this.guesses.has(l))) {
        this.finishRound(now);
        return;
      }
      this.setPhase('liar-guess', now + this.ms(this.settings.guessSeconds));
    } else {
      this.finishRound(now);
    }
  }

  private isCorrect(word: string): boolean {
    return !!this.secretWord && word.toLowerCase() === this.secretWord.toLowerCase();
  }

  private finishRound(now: number): void {
    void now;
    const liarCaught = !!this.accusedId && this.liarIds.includes(this.accusedId);
    const guesses = [...this.guesses.entries()];
    const correctEntry = guesses.find(([, g]) => this.isCorrect(g));
    const correct = correctEntry?.[1];
    const deciding = correctEntry ?? guesses[guesses.length - 1];
    const liarGuess = liarCaught ? deciding?.[1] : undefined;
    const liarGuessCorrect = liarCaught ? !!correct : undefined;
    const guessLocked = liarCaught && !!deciding && this.locks.get(deciding[0]) === deciding[1];
    const liarWins = !liarCaught || !!correct;

    const firstVotes = this.firstVotes ?? this.votes;
    const finalVote = (id: PlayerID) => (this.runoff ? this.votes.get(id) ?? firstVotes.get(id) : firstVotes.get(id));

    const lines: Record<PlayerID, ScoreLine[]> = {};
    const deltas: Record<PlayerID, number> = {};
    for (const p of this.players) {
      if (!p.inRound) continue;
      const mine: ScoreLine[] = [];
      const add = (rule: ScoreRuleId) => mine.push({ rule, points: SCORE[rule] });
      if (this.liarIds.includes(p.id)) {
        if (!liarCaught) add('spy-escapes');
        else if (correct) add('spy-cracks-codeword');
        const lock = this.locks.get(p.id);
        if (lock !== undefined && this.isCorrect(lock)) add('spy-early-lock');
      } else {
        const v = finalVote(p.id);
        if (v && this.liarIds.includes(v)) add('agent-spotted-spy');
        if (!liarWins) add('agent-team-win');
      }
      lines[p.id] = mine;
      deltas[p.id] = mine.reduce((a, l) => a + l.points, 0);
    }
    // practice round: the breakdown is shown, but points and award stats don't count
    const practice = this.warmup;
    if (!practice) {
      for (const [id, d] of Object.entries(deltas)) {
        const p = this.get(id);
        if (p) p.score += d;
      }
    }

    // game stats for awards
    const received = new Map<PlayerID, number>();
    for (const t of firstVotes.values()) received.set(t, (received.get(t) ?? 0) + 1);
    for (const p of this.players) {
      if (practice || !p.inRound) continue;
      const st = this.statsFor(p.id);
      const isLiar = this.liarIds.includes(p.id);
      if (isLiar) {
        st.spyVotes += received.get(p.id) ?? 0;
        if (liarWins) st.spyWins++;
        const lock = this.locks.get(p.id);
        const final = this.guesses.get(p.id);
        if ((lock !== undefined && this.isCorrect(lock)) || (final !== undefined && liarCaught && this.isCorrect(final))) st.codewords++;
      } else {
        st.suspectVotes += received.get(p.id) ?? 0;
        if (lines[p.id].some((l) => l.rule === 'agent-spotted-spy')) st.spotted++;
      }
    }

    const toRecord = (m: Map<PlayerID, PlayerID>) => {
      const r: Record<PlayerID, PlayerID> = {};
      for (const [v, t] of m) r[v] = t;
      return r;
    };
    const lockedGuesses: Record<PlayerID, string> = {};
    for (const [id, w] of this.locks) lockedGuesses[id] = w;
    this.result = {
      liarIds: [...this.liarIds],
      secretWord: this.secretWord ?? '',
      accusedId: this.accusedId,
      liarCaught,
      ...(liarGuess !== undefined ? { liarGuess } : {}),
      ...(liarGuessCorrect !== undefined ? { liarGuessCorrect } : {}),
      winner: liarWins ? 'liar' : 'truth-tellers',
      votes: toRecord(firstVotes),
      scoreDeltas: deltas,
      ...(this.runoff ? { runoff: [...this.runoff], runoffVotes: toRecord(this.votes) } : {}),
      ...(liarCaught ? { guessLocked } : {}),
      ...(this.locks.size ? { lockedGuesses } : {}),
      scoreBreakdown: lines,
      endsGame: false
    };
    this.result.endsGame = this.gameEnds();
    this.setPhase('results', null);
  }

  private statsFor(id: PlayerID): GameStats {
    let st = this.stats.get(id);
    if (!st) {
      st = { spotted: 0, spyWins: 0, spyVotes: 0, codewords: 0, suspectVotes: 0 };
      this.stats.set(id, st);
    }
    return st;
  }

  /** Game-over awards from the whole game's stats (players still in the room only). */
  private computeAwards(): Award[] {
    const present = this.players.filter((p) => this.stats.has(p.id));
    const best = (
      id: Award['id'],
      value: (s: GameStats) => number,
      min: number,
      tieBreak?: (s: GameStats) => number
    ): Award | null => {
      let top: { ids: PlayerID[]; v: number; t: number } | null = null;
      for (const p of present) {
        const s = this.stats.get(p.id)!;
        const v = value(s);
        const t = tieBreak ? tieBreak(s) : 0;
        if (v < min) continue;
        if (!top || v > top.v || (v === top.v && t > top.t)) top = { ids: [p.id], v, t };
        else if (v === top.v && t === top.t) top.ids.push(p.id);
      }
      return top ? { id, playerIds: top.ids, value: top.v } : null;
    };
    return [
      best('sharpest-eye', (s) => s.spotted, 1),
      best('smoothest-spy', (s) => s.spyWins, 1, (s) => -s.spyVotes),
      best('codebreaker', (s) => s.codewords, 1),
      best('usual-suspect', (s) => s.suspectVotes, 2)
    ].filter((a): a is Award => !!a);
  }

  /** Early-advance checks after any state change. */
  private checkAutoAdvance(now: number): void {
    // away players are still in the round, but nobody waits for them to ready up or vote
    const active = this.players.filter((p) => p.inRound && p.connected);
    const here = active.filter((p) => p.presence === 'online');
    switch (this.phase) {
      case 'briefing':
        this.checkBriefing(now);
        break;
      case 'role-reveal':
        if (here.length > 0 && here.every((p) => p.ready)) this.enterClues(now);
        break;
      case 'clues': {
        const cur = this.get(this.turnOrder[this.currentTurn]);
        if (!cur || !cur.connected) this.advanceTurn(now);
        break;
      }
      case 'voting':
        if (
          (active.length > 0 && active.every((p) => this.votes.has(p.id))) ||
          (here.length > 0 && here.every((p) => this.votes.has(p.id)) && this.votes.size > 0)
        )
          this.resolveVotes(now);
        break;
      case 'liar-guess': {
        const liars = this.liarIds.map((id) => this.get(id)).filter((p): p is InternalPlayer => !!p);
        const connected = liars.filter((p) => p.connected);
        if (connected.length === 0 || (this.guesses.size > 0 && connected.every((p) => this.guesses.has(p.id))))
          this.finishRound(now);
        break;
      }
    }
  }

  private setPhase(phase: Phase, endsAt: number | null): void {
    this.phase = phase;
    this.phaseEndsAt = endsAt;
  }

  // ───────────────────────── views ─────────────────────────

  roleOf(id: PlayerID): Role | null {
    const p = this.get(id);
    if (!p || !p.inRound || this.phase === 'lobby' || this.phase === 'game-over') return null;
    return this.liarIds.includes(id) ? 'liar' : 'truth-teller';
  }

  private topicView(): PublicGameState['round']['topic'] {
    if (!this.topic) return null;
    const { id, name, emoji, words } = this.topic;
    return { id, name, emoji, words: [...words] };
  }

  publicState(now: number): PublicGameState {
    const revealTopic =
      this.settings.liarSeesTopic || ['liar-guess', 'results', 'game-over'].includes(this.phase);
    const showResult = this.phase === 'results' || this.phase === 'game-over';
    const players: Player[] = this.players.map((p) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      color: p.color,
      score: p.score,
      connected: p.connected,
      presence: p.presence,
      isHost: p.isHost,
      ...(p.isBot ? { isBot: true } : {}),
      ready: p.ready,
      hasVoted: this.phase === 'voting' ? this.votes.has(p.id) : false
    }));
    const packs: PackSummary[] = this.packs.map((p) => ({
      id: p.id,
      name: p.name,
      tagline: p.tagline,
      emoji: p.emoji,
      premium: p.premium,
      ...(p.mature ? { mature: true } : {}),
      topicCount: p.topics.length
    }));
    const state: PublicGameState = {
      code: this.code,
      players,
      settings: { ...this.settings, packIds: [...this.settings.packIds] },
      round: {
        number: this.roundNumber,
        phase: this.phase,
        phaseEndsAt: this.phaseEndsAt,
        serverNow: now,
        topic: revealTopic && this.phase !== 'lobby' ? this.topicView() : null,
        turnOrder: [...this.turnOrder],
        currentTurn: this.currentTurn,
        clues: this.clues.map((c) => ({ ...c })),
        // endsGame is computed live so it always matches what nextRound will do
        result: showResult && this.result ? { ...this.result, endsGame: this.phase === 'game-over' || this.gameEnds() } : null,
        runoff: this.phase === 'voting' && this.runoff ? [...this.runoff] : null,
        warmup: this.warmup,
        practice: this.warmup
      },
      packs,
      premium: this.premium
    };
    if (this.winners) state.winners = [...this.winners];
    if (this.sessionEnded) state.sessionEnded = true;
    if (this.awards && this.phase === 'game-over') state.awards = this.awards.map((a) => ({ ...a, playerIds: [...a.playerIds] }));
    return state;
  }

  privateView(id: PlayerID): PrivateView {
    const p = this.mustGet(id);
    const role = this.roleOf(id);
    const inGame = this.phase !== 'lobby';
    let topic: PrivateView['topic'] = null;
    if (inGame && this.topic) {
      if (this.settings.liarSeesTopic || role === 'truth-teller' || ['liar-guess', 'results', 'game-over'].includes(this.phase))
        topic = this.topicView();
    }
    return {
      playerId: id,
      role,
      secretWord: role === 'truth-teller' ? this.secretWord : null,
      myVote: this.votes.get(id) ?? null,
      token: p.token,
      topic,
      lockedGuess: role === 'liar' ? this.locks.get(id) ?? null : null
    };
  }

  drainToasts(): string[] {
    const t = this.toasts;
    this.toasts = [];
    return t;
  }

  // ───────────────────────── helpers ─────────────────────────

  private mustGet(id: PlayerID): InternalPlayer {
    const p = this.get(id);
    if (!p) throw new GameError('Not in this room');
    return p;
  }

  private requireHost(id: PlayerID): void {
    if (!this.mustGet(id).isHost) throw new GameError('Only the host can do that');
  }

  private shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}
