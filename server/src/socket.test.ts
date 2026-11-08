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
    await until(() => [a, b, c].every((x) => x.state?.round.phase === 'role-reveal'));
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
    expect(a.state!.players.find((p) => p.id === liarId)!.score).toBe(0);
    for (const t of truthers)
      expect(a.state!.players.find((p) => p.id === t.view!.playerId)!.score).toBe(SCORE['agent-team-win'] + SCORE['agent-spotted-spy']);

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

      // start; role-reveal doesn't wait for an away player
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
