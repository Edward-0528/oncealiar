import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { AddressInfo } from 'node:net';
import { io as connect, type Socket } from 'socket.io-client';
import { SCORE } from '@oncealiar/shared';
import type {
  ClientToServerEvents,
  JoinResult,
  PrivateView,
  PublicGameState,
  ServerToClientEvents
} from '@oncealiar/shared';
import { createApp } from './app.js';
import { FIXTURE_PACKS } from './test/fixtures.js';

type C = Socket<ServerToClientEvents, ClientToServerEvents> & {
  state?: PublicGameState;
  view?: PrivateView;
  reactions: number;
  leaks: string[];
};

let srv: ReturnType<typeof createApp>;
let url: string;

beforeAll(async () => {
  srv = createApp({ packs: FIXTURE_PACKS, premiumCodes: ['GOLD'] });
  await new Promise<void>((r) => srv.httpServer.listen(0, r));
  url = `http://localhost:${(srv.httpServer.address() as AddressInfo).port}`;
  srv.manager.setSelfUrl(url);
});

afterAll(async () => {
  await srv.close();
});

function client(): Promise<C> {
  const s = connect(url, { transports: ['websocket'], forceNew: true }) as C;
  s.reactions = 0;
  s.leaks = [];
  s.on('state', (state, view) => {
    s.state = state;
    s.view = view;
    const phase = state.round.phase;
    if (phase !== 'results' && phase !== 'game-over') {
      const json = JSON.stringify(state);
      if (/"(liarIds|secretWord|token)"/.test(json) || state.round.result) s.leaks.push(phase);
    }
  });
  s.on('reaction', () => s.reactions++);
  return new Promise((r) => s.on('connect', () => r(s)));
}

const until = async (cond: () => boolean, ms = 2000) => {
  const start = Date.now();
  while (!cond()) {
    if (Date.now() - start > ms) throw new Error('timeout waiting for condition');
    await new Promise((r) => setTimeout(r, 5));
  }
};

const emitAck = <T,>(fn: (ack: (res: any) => void) => void) =>
  new Promise<T>((resolve) => fn((res) => resolve(res)));

describe('socket integration', () => {
  it('plays a full round with 3 clients', async () => {
    const health = await fetch(`${url}/healthz`).then((r) => r.json());
    expect(health.ok).toBe(true);

    const [a, b, c] = await Promise.all([client(), client(), client()]);
    const created = await emitAck<{ ok: true } & JoinResult>((ack) =>
      a.emit('room:create', { name: '  Alice ', avatar: 'chancla', color: 'coral' }, ack)
    );
    expect(created.ok).toBe(true);
    expect(created.code).toMatch(/^[A-HJ-NP-Z]{4}$/);

    const bad = await emitAck<any>((ack) => b.emit('room:join', created.code, { name: '', avatar: 'chancla', color: 'coral' }, ack));
    expect(bad.ok).toBe(false);
    const badAvatar = await emitAck<any>((ack) => b.emit('room:join', created.code, { name: 'B', avatar: 'dragon', color: 'coral' }, ack));
    expect(badAvatar.ok).toBe(false);

    const jb = await emitAck<any>((ack) => b.emit('room:join', created.code.toLowerCase(), { name: 'Bob', avatar: 'pigeon', color: 'sky' }, ack));
    const jc = await emitAck<any>((ack) => c.emit('room:join', created.code, { name: 'Cleo', avatar: 'duck', color: 'mint' }, ack));
    expect(jb.ok && jc.ok).toBe(true);
    await until(() => a.state?.players.length === 3);
    expect(a.state!.players[0]).toMatchObject({ name: 'Alice', isHost: true });
    expect(a.view!.token).toBe(created.token);

    // non-host can't start
    expect((await emitAck<any>((ack) => b.emit('game:start', ack))).ok).toBe(false);
    expect((await emitAck<any>((ack) => a.emit('game:start', ack))).ok).toBe(true);
    // first game in the room: group briefing until everyone confirms (no host skip)
    await until(() => [a, b, c].every((x) => x.state?.round.phase === 'briefing'));
    expect(a.state!.round.phaseEndsAt).toBeNull();
    a.emit('phase:skip');
    a.emit('briefing:ready');
    b.emit('briefing:ready');
    await until(() => a.state!.players.filter((p) => p.ready).length === 2);
    expect(a.state!.round.phase).toBe('briefing');
    c.emit('briefing:ready');
    await until(() => [a, b, c].every((x) => x.state?.round.phase === 'role-reveal'));
    expect(a.state!.round.practice).toBe(true);
    const all = [a, b, c];
    const liar = all.find((x) => x.view!.role === 'liar')!;
    const truthers = all.filter((x) => x !== liar);
    expect(liar.view!.secretWord).toBeNull();
    const secret = truthers[0].view!.secretWord!;
    expect(truthers[1].view!.secretWord).toBe(secret);

    for (const x of all) x.emit('role:ready');
    await until(() => a.state!.round.phase === 'clues');

    // spoken clues: each current player ends their turn
    for (let i = 0; i < 3; i++) {
      await until(() => a.state!.round.currentTurn === i && a.state!.round.phase === 'clues');
      const curId = a.state!.round.turnOrder[i];
      all.find((x) => x.view!.playerId === curId)!.emit('clue:done');
      await until(() => a.state!.round.clues.length === i + 1);
    }
    await until(() => a.state!.round.phase === 'discussion');

    a.emit('phase:skip');
    await until(() => a.state!.round.phase === 'voting');

    const liarId = liar.view!.playerId;
    for (const t of truthers) t.emit('vote:cast', liarId);
    await until(() => a.state!.players.filter((p) => p.hasVoted).length === 2);
    liar.emit('vote:cast', truthers[0].view!.playerId);
    await until(() => a.state!.round.phase === 'liar-guess');

    const wrong = a.state!.round.topic!.words.find((w) => w !== secret)!;
    liar.emit('guess:submit', wrong);
    await until(() => a.state!.round.phase === 'results');

    const r = a.state!.round.result!;
    expect(r.liarIds).toEqual([liarId]);
    expect(r.secretWord).toBe(secret);
    expect(r.liarCaught).toBe(true);
    expect(r.winner).toBe('truth-tellers');
    // practice round: points are shown but not added
    expect(a.state!.round.practice).toBe(true);
    for (const t of truthers) expect(r.scoreDeltas[t.view!.playerId]).toBe(SCORE['agent-team-win'] + SCORE['agent-spotted-spy']);
    expect(a.state!.players.every((p) => p.score === 0)).toBe(true);

    for (const x of all) expect(x.leaks).toEqual([]);

    a.emit('round:next');
    await until(() => a.state!.round.number === 2 && a.state!.round.phase === 'role-reveal');

    // reactions are validated + rate limited (5 per 3s)
    for (let i = 0; i < 8; i++) b.emit('reaction', '🔥');
    b.emit('reaction', 'not-an-emoji');
    await new Promise((res) => setTimeout(res, 100));
    expect(a.reactions).toBe(5);

    // rejoin with token after a disconnect
    const cId = c.view!.playerId;
    c.disconnect();
    await until(() => a.state!.players.find((p) => p.id === cId)!.presence === 'away');
    expect(a.state!.players.find((p) => p.id === cId)!.connected).toBe(true); // away keeps the seat
    const c2 = await client();
    const rj = await emitAck<any>((ack) => c2.emit('room:rejoin', created.code, jc.token, ack));
    expect(rj).toMatchObject({ ok: true, playerId: cId });
    await until(() => a.state!.players.find((p) => p.id === cId)!.presence === 'online');
    expect(c2.view!.role).not.toBeNull();
    expect((await emitAck<any>((ack) => c2.emit('room:rejoin', created.code, 'bogus', ack))).ok).toBe(false);

    for (const x of [a, b, c2]) x.disconnect();
  });

  it('presence: hidden → away → visible; dropped socket goes offline after the grace period; rejoin restores it', async () => {
    const fast = createApp({ packs: FIXTURE_PACKS, awayGraceMs: 300, sweepMs: 50 });
    await new Promise<void>((r) => fast.httpServer.listen(0, r));
    const fastUrl = `http://localhost:${(fast.httpServer.address() as AddressInfo).port}`;
    const mk = (): Promise<C> => {
      const s = connect(fastUrl, { transports: ['websocket'], forceNew: true }) as C;
      s.on('state', (state, view) => {
        s.state = state;
        s.view = view;
      });
      return new Promise((r) => s.on('connect', () => r(s)));
    };
    try {
      const [h, b, c, d] = await Promise.all([mk(), mk(), mk(), mk()]);
      const created = await emitAck<any>((ack) => h.emit('room:create', { name: 'H', avatar: 'chancla', color: 'coral' }, ack));
      const joins = await Promise.all(
        [b, c, d].map((x, i) => emitAck<any>((ack) => x.emit('room:join', created.code, { name: `P${i}`, avatar: 'pigeon', color: 'sky' }, ack)))
      );
      await until(() => h.state?.players.length === 4);
      const pres = (id: string) => h.state!.players.find((p) => p.id === id)!;

      // texting someone: tab hidden → away (still connected), back → online
      b.emit('presence', 'hidden');
      await until(() => pres(joins[0].playerId).presence === 'away');
      expect(pres(joins[0].playerId).connected).toBe(true);
      b.emit('presence', 'visible');
      await until(() => pres(joins[0].playerId).presence === 'online');
      b.emit('presence', 'bogus' as any); // ignored

      // start (briefing off); role-reveal doesn't wait for an away player
      expect((await emitAck<any>((ack) => h.emit('settings:update', { briefing: false }, ack))).ok).toBe(true);
      expect((await emitAck<any>((ack) => h.emit('game:start', ack))).ok).toBe(true);
      await until(() => h.state!.round.phase === 'role-reveal');
      d.emit('presence', 'hidden');
      await until(() => pres(joins[2].playerId).presence === 'away');
      for (const x of [h, b, c]) x.emit('role:ready');
      await until(() => h.state!.round.phase === 'clues');
      d.emit('presence', 'visible');
      await until(() => pres(joins[2].playerId).presence === 'online');
      expect(h.state!.round.phase).toBe('clues');

      // a non-spy drops: away, then offline after 300ms (room timer wakes for it)
      const all = [h, b, c, d];
      const drop = [c, d].find((x) => x.view!.role === 'truth-teller')!;
      const dropId = drop.view!.playerId;
      const token = drop.view!.token;
      drop.disconnect();
      await until(() => pres(dropId).presence === 'away');
      await until(() => pres(dropId).presence === 'offline', 3000);
      expect(pres(dropId).connected).toBe(false);

      // rejoin restores presence and role
      const back = await mk();
      const rj = await emitAck<any>((ack) => back.emit('room:rejoin', created.code, token, ack));
      expect(rj.ok).toBe(true);
      await until(() => pres(dropId).presence === 'online');
      expect(back.view!.role).toBe('truth-teller');
      for (const x of [...all, back]) x.disconnect();
    } finally {
      await fast.close();
    }
  });

  it('premium unlock via code', async () => {
    const a = await client();
    const res = await emitAck<any>((ack) => a.emit('room:create', { name: 'H', avatar: 'chancla', color: 'coral' }, ack));
    expect(res.ok).toBe(true);
    expect((await emitAck<any>((ack) => a.emit('settings:update', { packIds: ['gold'] }, ack))).ok).toBe(false);
    expect((await emitAck<any>((ack) => a.emit('room:unlock', 'nope', ack))).ok).toBe(false);
    expect((await emitAck<any>((ack) => a.emit('room:unlock', 'gold', ack))).ok).toBe(true);
    expect((await emitAck<any>((ack) => a.emit('settings:update', { packIds: ['gold'], maxPlayers: 16 }, ack))).ok).toBe(true);
    await until(() => a.state?.premium === true && a.state.settings.maxPlayers === 16);
    a.emit('room:leave');
    await until(() => !srv.manager.rooms.has(res.code));
    a.disconnect();
  });
});

describe('in-lobby bots', () => {
  it('lets only the host add bots in the lobby; bots are flagged, never host, and can be kicked', async () => {
    const host = await client();
    const made = await emitAck<any>((ack) => host.emit('room:create', { name: 'Hostie', avatar: 'duck', color: 'coral' }, ack));
    expect(made.ok).toBe(true);
    const guest = await client();
    await emitAck<any>((ack) => guest.emit('room:join', made.code, { name: 'Guesty', avatar: 'cat', color: 'sky' }, ack));

    const denied = await emitAck<any>((ack) => guest.emit('room:addBot', ack));
    expect(denied.ok).toBe(false);

    expect((await emitAck<any>((ack) => host.emit('room:addBot', ack))).ok).toBe(true);
    await until(() => (host.state?.players.length ?? 0) === 3, 4000);
    const bot = host.state!.players.find((p) => p.isBot)!;
    expect(bot).toBeTruthy();
    expect(bot.isHost).toBe(false);
    expect(host.state!.players.filter((p) => !p.isBot).every((p) => !p.isBot)).toBe(true);

    host.emit('player:kick', bot.id);
    await until(() => (host.state?.players.length ?? 0) === 2, 4000);
    host.close();
    guest.close();
  });
});

describe('host controls', () => {
  it('hands the host role to another human and ends the session for everyone', async () => {
    const a = await client();
    const made = await emitAck<any>((ack) => a.emit('room:create', { name: 'Ana', avatar: 'duck', color: 'coral' }, ack));
    const b = await client();
    await emitAck<any>((ack) => b.emit('room:join', made.code, { name: 'Ben', avatar: 'cat', color: 'sky' }, ack));
    await until(() => (a.state?.players.length ?? 0) === 2);
    const benId = a.state!.players.find((p) => p.name === 'Ben')!.id;

    // only the host can hand it off
    expect((await emitAck<any>((ack) => b.emit('player:makeHost', benId, ack))).ok).toBe(false);
    expect((await emitAck<any>((ack) => a.emit('player:makeHost', benId, ack))).ok).toBe(true);
    await until(() => !!b.state?.players.find((p) => p.id === benId)?.isHost);
    expect(b.state!.players.filter((p) => p.isHost)).toHaveLength(1);

    // Ana is no longer host: she can't end it; Ben can
    expect((await emitAck<any>((ack) => a.emit('room:end', ack))).ok).toBe(false);
    let endedA = 0;
    let endedB = 0;
    a.on('room:ended' as any, () => endedA++);
    b.on('room:ended' as any, () => endedB++);
    expect((await emitAck<any>((ack) => b.emit('room:end', ack))).ok).toBe(true);
    await until(() => endedA === 1 && endedB === 1);
    const peek = await emitAck<any>((ack) => a.emit('room:peek', made.code, ack));
    expect(peek.ok).toBe(false);
    a.close();
    b.close();
  });
});

describe('ending the session', () => {
  /** host + 2 guests, game started (briefing off), at role-reveal */
  async function startedRoom() {
    const [a, b, c] = await Promise.all([client(), client(), client()]);
    const made = await emitAck<any>((ack) => a.emit('room:create', { name: 'Ana', avatar: 'duck', color: 'coral' }, ack));
    for (const [x, n] of [[b, 'Ben'], [c, 'Cy']] as const)
      await emitAck<any>((ack) => x.emit('room:join', made.code, { name: n, avatar: 'cat', color: 'sky' }, ack));
    await until(() => (a.state?.players.length ?? 0) === 3);
    expect((await emitAck<any>((ack) => a.emit('settings:update', { briefing: false }, ack))).ok).toBe(true);
    expect((await emitAck<any>((ack) => a.emit('game:start', ack))).ok).toBe(true);
    await until(() => [a, b, c].every((x) => x.state?.round.phase === 'role-reveal'));
    return { a, b, c, code: made.code as string };
  }

  it('room:end mid-game → final results for everyone; read-only; deleted after the last human leaves', async () => {
    const { a, b, c, code } = await startedRoom();
    let ended = 0;
    for (const x of [a, b, c]) x.on('room:ended' as any, () => ended++);
    expect((await emitAck<any>((ack) => a.emit('room:end', ack))).ok).toBe(true);
    await until(() => [a, b, c].every((x) => x.state?.round.phase === 'game-over' && x.state.sessionEnded === true));
    expect(Array.isArray(b.state!.awards)).toBe(true);
    expect(b.state!.winners!.length).toBe(3); // unfinished round scored nothing: everyone tied at 0
    expect(ended).toBe(0);

    for (const ev of ['game:start', 'room:end', 'room:addBot'] as const) {
      const res = await emitAck<any>((ack) => (a.emit as any)(ev, ack));
      expect(res).toEqual({ ok: false, error: 'This session has ended' });
    }
    expect(await emitAck<any>((ack) => a.emit('settings:update', { roundsPerGame: 3 }, ack))).toEqual({ ok: false, error: 'This session has ended' });
    const late = await client();
    expect((await emitAck<any>((ack) => late.emit('room:join', code, { name: 'Late', avatar: 'cat', color: 'sky' }, ack))).ok).toBe(false);

    b.emit('room:leave');
    c.emit('room:leave');
    await until(() => a.state!.players.filter((p) => p.connected).length === 1);
    expect(a.state!.players).toHaveLength(3); // standings stay intact
    expect(srv.manager.rooms.has(code)).toBe(true);
    a.emit('room:leave');
    await until(() => !srv.manager.rooms.has(code));
    for (const x of [a, b, c, late]) x.close();
  });

  it('host room:leave mid-game ends the session; a host disconnect does not', async () => {
    const r1 = await startedRoom();
    r1.a.disconnect(); // phone locked / network blip
    await until(() => r1.b.state!.players.find((p) => p.name === 'Ana')!.presence === 'away');
    await new Promise((r) => setTimeout(r, 50));
    expect(r1.b.state!.sessionEnded).toBeUndefined();
    expect(r1.b.state!.round.phase).toBe('role-reveal');
    for (const x of [r1.b, r1.c]) x.close();

    const r2 = await startedRoom();
    r2.a.emit('room:leave');
    await until(() => [r2.b, r2.c].every((x) => x.state?.round.phase === 'game-over' && x.state.sessionEnded === true));
    for (const x of [r2.a, r2.b, r2.c]) x.close();
  });
});

describe('accounts (account:link)', () => {
  it('links a signed-in host: Party Pass unlocks the room and finished games are recorded', async () => {
    const recorded: Array<{ userId: string; rec: { rank: number; won: boolean; rounds: number } }> = [];
    const fake = {
      verifyToken: async (t: unknown) => (t === 'host-token' ? { id: 'user-host', email: 'h@x.co' } : t === 'guest-token' ? { id: 'user-guest', email: 'g@x.co' } : null),
      hasPremium: async (id: string) => id === 'user-host',
      recordGame: async (userId: string, rec: { rank: number; won: boolean; rounds: number }) => void recorded.push({ userId, rec })
    };
    const s2 = createApp({ packs: FIXTURE_PACKS, accounts: fake as never });
    await new Promise<void>((r) => s2.httpServer.listen(0, r));
    const u = `http://localhost:${(s2.httpServer.address() as AddressInfo).port}`;
    const mk = () => {
      const s = connect(u, { transports: ['websocket'], forceNew: true }) as C;
      s.on('state', (st, v) => {
        s.state = st;
        s.view = v;
      });
      return new Promise<C>((r) => s.on('connect', () => r(s)));
    };
    const link = (s: C, t: string) => new Promise<{ ok: boolean; premium?: boolean; error?: string }>((r) => s.emit('account:link', t, r as never));
    try {
      const host = await mk();
      const guest = await mk();
      // not in a room yet
      expect((await link(host, 'host-token')).ok).toBe(false);
      const created = await new Promise<JoinResult & { ok: boolean }>((r) => host.emit('room:create', profile('Hosty'), r as never));
      expect(created.ok).toBe(true);
      await new Promise((r) => guest.emit('room:join', created.code, profile('Guesty'), r as never));
      expect((await link(host, 'bad')).ok).toBe(false);
      expect((await link(guest, 'guest-token')).premium).toBe(false);
      expect(host.state?.premium).toBeFalsy();
      expect(await link(host, 'host-token')).toMatchObject({ ok: true, premium: true });
      await until(() => host.state?.premium === true);
      // the guest's account never unlocks a room it doesn't host
      expect(srvRoom(s2, created.code).game.premium).toBe(true);

      // play to a finished game: both signed-in players get a history row
      const third = await mk();
      await new Promise((r) => third.emit('room:join', created.code, profile('Third'), r as never));
      await until(() => host.state?.players.length === 3);
      await new Promise((r) => host.emit('game:start', r as never));
      await until(() => host.state?.round.phase === 'briefing');
      for (const c of [host, guest, third]) c.emit('briefing:ready');
      await until(() => host.state?.round.phase === 'role-reveal');
      host.emit('room:end');
      await until(() => host.state?.round.phase === 'game-over');
      await until(() => recorded.length === 2);
      expect(recorded.map((r) => r.userId).sort()).toEqual(['user-guest', 'user-host']);
      expect(recorded[0].rec.rounds).toBe(1);
    } finally {
      await s2.close();
    }
  });
});

const profile = (name: string) => ({ name, avatar: 'chancla', color: 'coral' });

function srvRoom(s: ReturnType<typeof createApp>, code: string) {
  const r = s.manager.rooms.get(code);
  if (!r) throw new Error('no room');
  return r;
}
