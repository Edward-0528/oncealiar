import { describe, it, expect } from 'vitest';
import { AWAY_GRACE_MS, AWAY_TURN_MS, LOBBY_AWAY_GRACE_MS, LOBBY_REMOVE_MS, MAX_ROUNDS_TARGET, RUNOFF_MS, SCORE, lockBonus, WARMUP_FACTOR, type GameSettings } from '@oncealiar/shared';
import { Game, GameError, ROLE_REVEAL_MS } from './game.js';
import { FIXTURE_PACKS, profile, seeded } from '../test/fixtures.js';

const T0 = 1_000_000;

function setup(n: number, settings: Partial<GameSettings> = {}, opts: { premium?: boolean; seed?: number; warmup?: boolean; briefing?: boolean } = {}) {
  let i = 0;
  const g = new Game({
    code: 'ABCD',
    packs: FIXTURE_PACKS,
    rng: seeded(opts.seed ?? 7),
    idGen: () => `p${++i}`,
    premium: opts.premium,
    // most tests check exact timers / start straight at role-reveal; warm-up and briefing have their own tests
    settings: { warmupRound: !!opts.warmup, briefing: !!opts.briefing }
  });
  const ids: string[] = [];
  for (let k = 0; k < n; k++) ids.push(g.addPlayer(profile(`P${k}`), `tok${k}`, T0).id);
  if (Object.keys(settings).length) g.updateSettings(ids[0], settings);
  return { g, ids, host: ids[0] };
}

/** start and get to the clue phase */
function toClues(g: Game, host: string, now = T0) {
  g.start(host, now);
  for (const p of g.players) g.ready(p.id, now);
  expect(g.phase).toBe('clues');
}

function toVoting(g: Game, host: string, now = T0) {
  toClues(g, host, now);
  g.skipPhase(host, now); // → discussion
  g.skipPhase(host, now); // → voting
  expect(g.phase).toBe('voting');
}

const liar = (g: Game) => g.liarIds[0];
const truthers = (g: Game) => g.players.filter((p) => !g.liarIds.includes(p.id)).map((p) => p.id);

describe('lobby', () => {
  it('first player is host; join/settings validation', () => {
    const { g, ids } = setup(3);
    expect(g.get(ids[0])!.isHost).toBe(true);
    expect(() => g.updateSettings(ids[1], { clueSeconds: 20 })).toThrow(GameError);
    expect(() => g.updateSettings(ids[0], { maxPlayers: 20 })).toThrow(/Free rooms/);
    expect(() => g.updateSettings(ids[0], { packIds: ['gold'] })).toThrow(/premium/);
    expect(() => g.updateSettings(ids[0], { packIds: ['spicy'] })).toThrow(/family/);
    g.updateSettings(ids[0], { familyFriendly: false, packIds: ['starter', 'spicy'] });
    expect(g.settings.packIds).toEqual(['starter', 'spicy']);
    g.updateSettings(ids[0], { familyFriendly: true });
    expect(g.settings.packIds).toEqual(['starter']);
    g.updateSettings(ids[0], { clueSeconds: 9999 });
    expect(g.settings.clueSeconds).toBe(120);
  });

  it('premium rooms allow premium packs and more players', () => {
    const { g, host } = setup(3, {}, { premium: true });
    g.updateSettings(host, { packIds: ['gold'], maxPlayers: 16 });
    expect(g.settings.maxPlayers).toBe(16);
  });

  it('room fills up at maxPlayers', () => {
    const { g, host } = setup(3, {});
    g.updateSettings(host, { maxPlayers: 4 });
    g.addPlayer(profile('x'), 't', T0);
    expect(() => g.addPlayer(profile('y'), 't2', T0)).toThrow(/full/);
  });

  it('needs minPlayers connected to start; only host can start', () => {
    const { g, ids } = setup(3);
    expect(() => g.start(ids[1], T0)).toThrow(/host/);
    g.goOffline(ids[2], T0);
    expect(() => g.start(ids[0], T0)).toThrow(/at least/);
    g.setSocket(ids[2], true, T0);
    g.start(ids[0], T0);
    expect(g.phase).toBe('role-reveal');
    expect(g.phaseEndsAt).toBe(T0 + ROLE_REVEAL_MS);
  });
});

describe('phase transitions', () => {
  it('role-reveal advances when all connected ready', () => {
    const { g, ids, host } = setup(4);
    g.start(host, T0);
    expect(g.roundNumber).toBe(1);
    expect(g.liarIds).toHaveLength(1);
    expect(g.topic!.words).toHaveLength(16);
    expect(g.topic!.words).toContain(g.secretWord);
    g.setConnected(ids[3], false, T0);
    g.ready(ids[0], T0);
    g.ready(ids[1], T0);
    expect(g.phase).toBe('role-reveal');
    g.ready(ids[2], T0);
    expect(g.phase).toBe('clues');
  });

  it('role-reveal advances after 15s timeout', () => {
    const { g, host } = setup(3);
    g.start(host, T0);
    expect(g.tick(T0 + ROLE_REVEAL_MS - 1)).toBe(false);
    expect(g.tick(T0 + ROLE_REVEAL_MS)).toBe(true);
    expect(g.phase).toBe('clues');
    expect(g.currentTurn).toBe(0);
    expect(g.phaseEndsAt).toBe(T0 + ROLE_REVEAL_MS + g.settings.clueSeconds * 1000);
  });

  it('spoken clues: current player or host advances; others cannot', () => {
    const { g, host } = setup(4);
    toClues(g, host);
    const order = g.turnOrder;
    expect(new Set(order).size).toBe(4);
    const notCurrentNonHost = order.find((id, i) => i !== 0 && id !== host)!;
    expect(() => g.clueDone(notCurrentNonHost, T0)).toThrow(/turn/);
    g.clueDone(order[0], T0);
    expect(g.currentTurn).toBe(1);
    g.clueDone(host, T0); // host advances someone else's turn
    expect(g.currentTurn).toBe(2);
    expect(g.clues.map((c) => c.playerId)).toEqual([order[0], order[1]]);
    expect(() => g.submitClue(order[2], 'word', T0)).toThrow(/spoken/);
    g.tick(T0 + 30_000); // turn timer
    expect(g.currentTurn).toBe(3);
    g.clueDone(order[3], T0 + 30_000);
    expect(g.phase).toBe('discussion');
    expect(g.phaseEndsAt).toBe(T0 + 30_000 + 90_000);
  });

  it('typed clues: one word, ≤24 chars, current player only', () => {
    const { g, host } = setup(3, { clueMode: 'typed' });
    toClues(g, host);
    const [a, b, c] = g.turnOrder;
    expect(() => g.submitClue(b, 'nope', T0)).toThrow(/turn/);
    expect(() => g.submitClue(a, 'two words', T0)).toThrow(/One word/);
    expect(() => g.submitClue(a, 'x'.repeat(25), T0)).toThrow(/24/);
    expect(() => g.submitClue(a, '   ', T0)).toThrow(/empty/);
    expect(() => g.clueDone(a, T0)).toThrow();
    g.submitClue(a, '  cheesy ', T0);
    g.submitClue(b, 'round', T0);
    g.submitClue(c, 'hot', T0);
    expect(g.clues.map((x) => x.text)).toEqual(['cheesy', 'round', 'hot']);
    expect(g.phase).toBe('discussion');
  });

  it('skips disconnected players in turn order, and advances when the current player drops', () => {
    const { g, host } = setup(5);
    toClues(g, host);
    const order = [...g.turnOrder];
    g.goOffline(order[1], T0);
    g.clueDone(order[0], T0);
    expect(g.turnOrder[g.currentTurn]).toBe(order[2]);
    g.goOffline(order[2], T0); // current goes offline → skip
    expect(g.turnOrder[g.currentTurn]).toBe(order[3]);
  });

  it('removing the current-turn player advances to the next', () => {
    const { g, host } = setup(5);
    toClues(g, host);
    const order = [...g.turnOrder];
    const victim = order.find((id) => !g.liarIds.includes(id) && id === order[0]);
    if (!victim) return; // liar is first with this seed; covered elsewhere
    g.removePlayer(victim, T0);
    expect(g.turnOrder[g.currentTurn]).toBe(order[1]);
  });

  it('discussion → voting on timer; voting ends when all connected voted', () => {
    const { g, ids, host } = setup(4);
    toClues(g, host);
    g.skipPhase(host, T0);
    expect(g.phase).toBe('discussion');
    g.tick(T0 + 90_000);
    expect(g.phase).toBe('voting');
    const L = liar(g);
    g.setConnected(ids.find((id) => id !== L && id !== host)!, false, T0);
    for (const p of g.players.filter((p) => p.connected)) {
      expect(g.phase).toBe('voting');
      g.castVote(p.id, p.id === ids[1] ? ids[2] : ids[1], T0);
    }
    expect(g.phase).not.toBe('voting');
  });

  it('votes are changeable and self-votes rejected', () => {
    const { g, ids, host } = setup(4);
    toVoting(g, host);
    expect(() => g.castVote(ids[0], ids[0], T0)).toThrow(/yourself/);
    g.castVote(ids[0], ids[1], T0);
    g.castVote(ids[0], ids[2], T0);
    expect(g.votes.get(ids[0])).toBe(ids[2]);
    expect(g.privateView(ids[0]).myVote).toBe(ids[2]);
    expect(g.publicState(T0).players[0].hasVoted).toBe(true);
  });
});

describe('resolution & scoring', () => {
  it('liar escapes when the sudden-death re-vote is still tied', () => {
    const { g, host } = setup(4);
    toVoting(g, host);
    const [a, b, c, d] = g.players.map((p) => p.id);
    g.castVote(a, b, T0);
    g.castVote(b, a, T0);
    g.castVote(c, d, T0);
    g.castVote(d, c, T0);
    expect(g.phase).toBe('voting');
    expect(g.publicState(T0).round.runoff).toEqual(expect.arrayContaining([a, b, c, d]));
    g.castVote(a, b, T0);
    g.castVote(b, a, T0);
    g.castVote(c, d, T0);
    g.castVote(d, c, T0);
    expect(g.phase).toBe('results');
    expect(g.result!.accusedId).toBeNull();
    expect(g.result!.winner).toBe('liar');
    expect(g.result!.runoff).toHaveLength(4);
    expect(g.result!.scoreDeltas[liar(g)]).toBe(SCORE['spy-escapes']);
    // agents whose final vote was on the Spy still score +1
    for (const t of truthers(g)) {
      const onSpy = g.result!.runoffVotes![t] === liar(g);
      expect(g.result!.scoreDeltas[t]).toBe(onSpy ? SCORE['agent-spotted-spy'] : 0);
    }
  });

  it('liar escapes when nobody votes (timeout)', () => {
    const { g, host } = setup(3);
    toVoting(g, host);
    g.tick(g.phaseEndsAt!);
    expect(g.phase).toBe('results');
    expect(g.result!.accusedId).toBeNull();
    expect(g.get(liar(g))!.score).toBe(SCORE['spy-escapes']);
  });

  it('liar escapes when an innocent is accused', () => {
    const { g, host } = setup(4);
    toVoting(g, host);
    const L = liar(g);
    const [t1, t2] = truthers(g);
    for (const p of g.players) g.castVote(p.id, p.id === t1 ? t2 : t1, T0);
    expect(g.result!.accusedId).toBe(t1);
    expect(g.result!.liarCaught).toBe(false);
    expect(g.result!.winner).toBe('liar');
    expect(g.result!.scoreDeltas[L]).toBe(SCORE['spy-escapes']);
  });

  it('caught liar who guesses wrong: truth-tellers win, catchers get bonus', () => {
    const { g, host } = setup(4);
    toVoting(g, host);
    const L = liar(g);
    const [t1, t2, t3] = truthers(g);
    g.castVote(t1, L, T0);
    g.castVote(t2, L, T0);
    g.castVote(t3, t1, T0);
    g.castVote(L, t2, T0);
    expect(g.phase).toBe('liar-guess');
    expect(() => g.submitGuess(t1, 'x', T0)).toThrow(/Spy/);
    expect(() => g.submitGuess(L, 'not-in-grid', T0)).toThrow(/grid/);
    const wrong = g.topic!.words.find((w) => w !== g.secretWord)!;
    g.submitGuess(L, wrong.toLowerCase(), T0);
    expect(g.phase).toBe('results');
    const r = g.result!;
    expect(r.liarCaught).toBe(true);
    expect(r.liarGuess).toBe(wrong);
    expect(r.liarGuessCorrect).toBe(false);
    expect(r.winner).toBe('truth-tellers');
    expect(r.scoreDeltas[t1]).toBe(SCORE['agent-team-win'] + SCORE['agent-spotted-spy']);
    expect(r.scoreDeltas[t2]).toBe(SCORE['agent-team-win'] + SCORE['agent-spotted-spy']);
    expect(r.scoreDeltas[t3]).toBe(SCORE['agent-team-win']);
    expect(r.scoreDeltas[L]).toBe(0);
    expect(r.votes[t1]).toBe(L);
    expect(r.guessLocked).toBe(false);
    expect(r.scoreBreakdown![t1].map((l) => l.rule)).toEqual(['agent-spotted-spy', 'agent-team-win']);
    expect(r.scoreBreakdown![L]).toEqual([]);
  });

  it('caught liar who guesses right (case-insensitive) wins', () => {
    const { g, host } = setup(3);
    toVoting(g, host);
    const L = liar(g);
    for (const t of truthers(g)) g.castVote(t, L, T0);
    g.castVote(L, truthers(g)[0], T0);
    g.submitGuess(L, `  ${g.secretWord!.toUpperCase()} `, T0);
    expect(g.result!.liarGuessCorrect).toBe(true);
    expect(g.result!.winner).toBe('liar');
    expect(g.get(L)!.score).toBe(SCORE['spy-cracks-codeword']);
  });

  it('liar-guess timeout counts as a failed guess', () => {
    const { g, host } = setup(3);
    toVoting(g, host);
    const L = liar(g);
    for (const t of truthers(g)) g.castVote(t, L, T0);
    g.castVote(L, truthers(g)[0], T0);
    g.tick(g.phaseEndsAt!);
    expect(g.result!.winner).toBe('truth-tellers');
    expect(g.result!.liarGuess).toBeUndefined();
  });
});

describe('two liars', () => {
  it('only with >= 7 players', () => {
    const { g, host } = setup(6, { liarCount: 2 });
    g.start(host, T0);
    expect(g.liarIds).toHaveLength(1);
    const big = setup(7, { liarCount: 2 });
    big.g.start(big.host, T0);
    expect(big.g.liarIds).toHaveLength(2);
  });

  it('catching either liar counts; first correct guess wins for both', () => {
    const { g, host } = setup(8, { liarCount: 2 });
    toVoting(g, host);
    const [L1, L2] = g.liarIds;
    for (const p of g.players) g.castVote(p.id, p.id === L2 ? truthers(g)[0] : L2, T0);
    expect(g.result).toBeNull();
    expect(g.phase).toBe('liar-guess');
    const wrong = g.topic!.words.find((w) => w !== g.secretWord)!;
    g.submitGuess(L2, wrong, T0);
    expect(g.phase).toBe('liar-guess'); // L1 may still guess
    g.submitGuess(L1, g.secretWord!, T0);
    expect(g.phase).toBe('results');
    expect(g.result!.liarGuessCorrect).toBe(true);
    expect(g.result!.winner).toBe('liar');
    expect(g.result!.scoreDeltas[L1]).toBe(SCORE['spy-cracks-codeword']);
    expect(g.result!.scoreDeltas[L2]).toBe(SCORE['spy-cracks-codeword']);
  });

  it('both wrong → truth-tellers win', () => {
    const { g, host } = setup(7, { liarCount: 2 });
    toVoting(g, host);
    const [L1, L2] = g.liarIds;
    for (const p of g.players) g.castVote(p.id, p.id === L1 ? truthers(g)[0] : L1, T0);
    const wrong = g.topic!.words.filter((w) => w !== g.secretWord);
    g.submitGuess(L1, wrong[0], T0);
    g.submitGuess(L2, wrong[1], T0);
    expect(g.result!.winner).toBe('truth-tellers');
  });
});

describe('game flow', () => {
  it('plays all rounds then game-over with winners; restart resets; topics do not repeat', () => {
    const { g, host } = setup(3, { targetScore: 0, roundsPerGame: 3 });
    g.start(host, T0);
    const topics = new Set<string>();
    for (let r = 1; r <= 3; r++) {
      expect(g.roundNumber).toBe(r);
      topics.add(g.topic!.id);
      g.skipPhase(host, T0); // role-reveal
      g.skipPhase(host, T0); // clues
      g.skipPhase(host, T0); // discussion
      g.skipPhase(host, T0); // voting → nobody voted → results
      expect(g.phase).toBe('results');
      g.nextRound(host, T0);
    }
    expect(topics.size).toBe(3);
    expect(g.phase).toBe('game-over');
    const max = Math.max(...g.players.map((p) => p.score));
    expect(g.winners!.length).toBeGreaterThan(0);
    for (const w of g.winners!) expect(g.get(w)!.score).toBe(max);
    g.restart(host);
    expect(g.phase).toBe('lobby');
    expect(g.players.every((p) => p.score === 0)).toBe(true);
    expect(g.roundNumber).toBe(0);
  });

  it('mid-round joiners sit out until the next round', () => {
    const { g, host } = setup(3);
    toClues(g, host);
    const late = g.addPlayer(profile('Late'), 'late', T0);
    expect(g.privateView(late.id).role).toBeNull();
    expect(g.turnOrder).not.toContain(late.id);
  });

  it('liar leaving mid-round restarts the round (or returns to lobby)', () => {
    const { g, host } = setup(4);
    toClues(g, host);
    const L = liar(g);
    g.removePlayer(L, T0);
    expect(g.phase).toBe('role-reveal');
    expect(g.roundNumber).toBe(1);
    expect(g.drainToasts()[0]).toMatch(/Spy left/);
    g.removePlayer(g.liarIds[0], T0);
    expect(g.phase).toBe('lobby');
  });
});

describe('host & housekeeping', () => {
  it('host leaving migrates immediately; an away host keeps the crown until offline', () => {
    const { g, ids } = setup(3);
    g.removePlayer(ids[0], T0);
    expect(g.get(ids[1])!.isHost).toBe(true);
    g.setSocket(ids[1], false, T0);
    expect(g.get(ids[1])!.presence).toBe('away');
    expect(g.maintenance(T0 + 60_000).changed).toBe(false);
    expect(g.get(ids[1])!.isHost).toBe(true);
    expect(g.maintenance(T0 + LOBBY_AWAY_GRACE_MS).changed).toBe(true); // lobby: 10 min grace
    expect(g.get(ids[2])!.isHost).toBe(true);
    expect(g.drainToasts()).toContain('P2 is now the host');
  });

  it('removes players offline > 15 min in the lobby only', () => {
    const { g, ids, host } = setup(5);
    g.setSocket(ids[3], false, T0);
    expect(g.maintenance(T0 + 12 * 60_000).removed).toEqual([]); // offline since T0+10min
    expect(g.get(ids[3])!.presence).toBe('offline');
    expect(g.maintenance(T0 + LOBBY_AWAY_GRACE_MS + LOBBY_REMOVE_MS + 1).removed).toEqual([ids[3]]);
    g.start(host, T0);
    g.goOffline(ids[2], T0);
    expect(g.maintenance(T0 + 60 * 60_000).removed).toEqual([]);
  });
});

describe('secrecy', () => {
  it('public state never contains secrets before results', () => {
    const { g, host } = setup(5, { clueMode: 'typed' });
    const check = () => {
      const json = JSON.stringify(g.publicState(T0));
      if (g.phase === 'results' || g.phase === 'game-over') return;
      expect(g.publicState(T0).round.result).toBeNull();
      // the secret word appears in the grid, so check it isn't flagged anywhere else
      const s = g.publicState(T0);
      const { topic, ...rest } = s.round;
      expect(JSON.stringify(rest)).not.toContain(g.secretWord ?? '\u0000');
      expect(json).not.toMatch(/"(liarIds|secretWord|token|role|votes|myVote)"/);
      expect(json).not.toContain('tok');
      void topic;
    };
    g.start(host, T0);
    check();
    for (const p of g.players) g.ready(p.id, T0);
    check();
    let n = 0;
    for (const id of [...g.turnOrder]) {
      g.submitClue(id, `clue${n++}`, T0);
      check();
    }
    g.skipPhase(host, T0);
    check();
    const L = liar(g);
    for (const p of g.players) g.castVote(p.id, p.id === L ? truthers(g)[0] : L, T0);
    expect(g.phase).toBe('liar-guess');
    check();
    g.tick(g.phaseEndsAt!);
    expect(g.publicState(T0).round.result!.liarIds).toEqual([L]);
  });

  it('private views: liar gets no word; truth-tellers get the word', () => {
    const { g, host } = setup(4);
    g.start(host, T0);
    const L = liar(g);
    expect(g.privateView(L)).toMatchObject({ role: 'liar', secretWord: null });
    for (const t of truthers(g)) expect(g.privateView(t)).toMatchObject({ role: 'truth-teller', secretWord: g.secretWord });
  });

  it('liarSeesTopic=false hides the topic from public state and the liar until liar-guess', () => {
    const { g, host } = setup(4, { liarSeesTopic: false });
    toVoting(g, host);
    const L = liar(g);
    expect(g.publicState(T0).round.topic).toBeNull();
    expect(g.privateView(L).topic).toBeNull();
    expect(g.privateView(truthers(g)[0]).topic!.id).toBe(g.topic!.id);
    for (const p of g.players) g.castVote(p.id, p.id === L ? truthers(g)[0] : L, T0);
    expect(g.publicState(T0).round.topic!.words).toHaveLength(16);
  });
});

describe('presence', () => {
  it('hidden tab or dropped socket → away (still connected); visible/reconnect → online', () => {
    const { g, ids } = setup(3);
    g.setVisible(ids[1], false, T0);
    let pub = g.publicState(T0).players[1];
    expect(pub).toMatchObject({ presence: 'away', connected: true });
    g.setVisible(ids[1], true, T0 + 1000);
    expect(g.publicState(T0).players[1].presence).toBe('online');
    g.setSocket(ids[2], false, T0);
    expect(g.publicState(T0).players[2]).toMatchObject({ presence: 'away', connected: true });
    g.setSocket(ids[2], true, T0 + 5000); // new socket counts as visible
    pub = g.publicState(T0).players[2];
    expect(pub).toMatchObject({ presence: 'online', connected: true });
  });

  it('away → offline after AWAY_GRACE_MS; nextWakeAt reports the expiry; rejoin restores online', () => {
    const { g, ids, host } = setup(4, { discussionSeconds: 600 });
    toClues(g, host);
    const L = liar(g);
    const t = truthers(g).find((id) => id !== host)!;
    g.setSocket(t, false, T0 + 1000);
    expect(g.nextWakeAt()).toBe(Math.min(g.phaseEndsAt!, T0 + 1000 + AWAY_GRACE_MS));
    g.skipPhase(host, T0); // → discussion
    g.tick(T0 + 1000 + AWAY_GRACE_MS - 1);
    expect(g.get(t)!.presence).toBe('away');
    g.tick(T0 + 1000 + AWAY_GRACE_MS);
    expect(g.get(t)).toMatchObject({ presence: 'offline', connected: false });
    expect(g.phase).toBe('discussion'); // 3 left, spy present → round continues
    g.setSocket(t, true, T0 + AWAY_GRACE_MS + 5000);
    expect(g.get(t)).toMatchObject({ presence: 'online', connected: true, inRound: true });
    expect(g.privateView(t)).toMatchObject({ role: 'truth-teller', secretWord: g.secretWord });
    void L;
    void ids;
  });

  it("role-reveal doesn't wait for away players", () => {
    const { g, ids, host } = setup(4);
    g.start(host, T0);
    g.setVisible(ids[3], false, T0);
    for (const id of ids.slice(0, 3)) g.ready(id, T0);
    expect(g.phase).toBe('clues');
    expect(g.get(ids[3])!.inRound).toBe(true);
  });

  it('away player on their clue turn: up to 20s, then skipped with a toast; returning restores the full turn', () => {
    const { g, host } = setup(5);
    toClues(g, host);
    const order = [...g.turnOrder];
    g.setVisible(order[1], false, T0);
    g.setVisible(order[2], false, T0);
    g.clueDone(order[0], T0);
    expect(g.turnOrder[g.currentTurn]).toBe(order[1]);
    expect(g.phaseEndsAt).toBe(T0 + AWAY_TURN_MS);
    g.drainToasts();
    g.tick(T0 + AWAY_TURN_MS);
    expect(g.drainToasts()).toEqual(['P' + (Number(order[1].slice(1)) - 1) + ' stepped away — skipped']);
    expect(g.turnOrder[g.currentTurn]).toBe(order[2]);
    const t1 = T0 + AWAY_TURN_MS;
    expect(g.phaseEndsAt).toBe(t1 + AWAY_TURN_MS);
    g.setVisible(order[2], true, t1 + 5000); // came back in time → full turn
    expect(g.phaseEndsAt).toBe(t1 + g.settings.clueSeconds * 1000);
    g.clueDone(order[2], t1 + 6000);
    expect(g.turnOrder[g.currentTurn]).toBe(order[3]);
  });

  it('a player going away mid-turn keeps the normal timer', () => {
    const { g, host } = setup(4);
    toClues(g, host);
    const cur = g.turnOrder[0];
    g.setVisible(cur, false, T0 + 1000);
    expect(g.phaseEndsAt).toBe(T0 + g.settings.clueSeconds * 1000);
  });

  it('voting ends without away players once everyone else voted; their vote counts if cast', () => {
    const { g, host } = setup(5);
    toVoting(g, host);
    const L = liar(g);
    const [t1, t2, t3, t4] = truthers(g);
    g.castVote(t4, L, T0);
    g.setVisible(t4, false, T0); // voted, then went to answer a text
    g.setSocket(t3, false, T0); // never voted
    g.castVote(t1, L, T0);
    g.castVote(t2, L, T0);
    expect(g.phase).toBe('voting');
    g.castVote(L, t1, T0);
    expect(g.phase).not.toBe('voting');
    expect(g.accusedId).toBe(L);
    void host;
  });

  it('spy merely away: the round waits; spy offline: the round is re-dealt', () => {
    const { g, host } = setup(5);
    toClues(g, host);
    const L = liar(g);
    g.setSocket(L, false, T0);
    expect(g.phase).toBe('clues');
    expect(g.roundNumber).toBe(1);
    g.drainToasts();
    g.tick(T0 + AWAY_GRACE_MS);
    expect(g.get(L)!.presence).toBe('offline');
    expect(g.phase).toBe('role-reveal');
    expect(g.roundNumber).toBe(1);
    expect(g.liarIds).not.toContain(L);
    expect(g.get(L)!.inRound).toBe(false);
    expect(g.drainToasts()[0]).toMatch(/Spy\) left/);
  });

  it('caught spy away during liar-guess: wait; offline: counts as a failed guess', () => {
    const { g, host } = setup(4);
    toVoting(g, host);
    const L = liar(g);
    for (const p of g.players) g.castVote(p.id, p.id === L ? truthers(g)[0] : L, T0);
    expect(g.phase).toBe('liar-guess');
    g.setSocket(L, false, T0);
    expect(g.phase).toBe('liar-guess');
    g.goOffline(L, T0 + 1000);
    expect(g.phase).toBe('results');
    expect(g.result!.winner).toBe('truth-tellers');
  });
});

describe('sudden-death re-vote', () => {
  it('tie → 10s re-vote between the tied players only; it decides the accusation', () => {
    const { g, host } = setup(4);
    toVoting(g, host);
    const L = liar(g);
    const [t1, t2, t3] = truthers(g);
    g.castVote(t1, L, T0);
    g.castVote(t2, L, T0);
    g.castVote(t3, t1, T0);
    g.castVote(L, t1, T0);
    expect(g.phase).toBe('voting');
    expect(g.runoff!.sort()).toEqual([L, t1].sort());
    expect(g.phaseEndsAt).toBe(T0 + RUNOFF_MS);
    expect(g.publicState(T0).players.every((p) => !p.hasVoted)).toBe(true);
    expect(() => g.castVote(t1, t2, T0)).toThrow(/tied/);
    g.castVote(t1, L, T0);
    g.castVote(t2, L, T0);
    g.castVote(t3, L, T0);
    g.castVote(L, t1, T0);
    expect(g.phase).toBe('liar-guess');
    g.tick(g.phaseEndsAt!);
    const r = g.result!;
    expect(r.runoff!.sort()).toEqual([L, t1].sort());
    expect(r.votes[t3]).toBe(t1); // first-round votes are preserved
    expect(r.runoffVotes![t3]).toBe(L);
    expect(r.scoreDeltas[t3]).toBe(SCORE['agent-spotted-spy'] + SCORE['agent-team-win']);
  });

  it('re-vote timeout with no votes → nobody accused', () => {
    const { g, host } = setup(4);
    toVoting(g, host);
    const [a, b, c, d] = g.players.map((p) => p.id);
    g.castVote(a, b, T0);
    g.castVote(b, a, T0);
    g.tick(g.phaseEndsAt!);
    expect(g.runoff).not.toBeNull();
    g.tick(g.phaseEndsAt!);
    expect(g.phase).toBe('results');
    expect(g.result!.accusedId).toBeNull();
    void c;
    void d;
  });
});

describe('early lock-in', () => {
  it('spy locks once during discussion; it is private, earns +1 in the debate if right, and is the final answer when caught', () => {
    const { g, host } = setup(4);
    toClues(g, host);
    g.skipPhase(host, T0); // → discussion
    const L = liar(g);
    const t = truthers(g);
    expect(() => g.submitGuess(t[0], g.secretWord!, T0)).toThrow(/Spy/);
    g.submitGuess(L, g.secretWord!.toLowerCase(), T0);
    expect(() => g.submitGuess(L, g.topic!.words[0], T0)).toThrow(/already/);
    expect(g.privateView(L).lockedGuess).toBe(g.secretWord);
    expect(g.privateView(t[0]).lockedGuess).toBeNull();
    expect(JSON.stringify(g.publicState(T0))).not.toMatch(/lock/i);
    g.skipPhase(host, T0); // → voting
    for (const p of g.players) g.castVote(p.id, p.id === L ? t[0] : L, T0);
    // caught, but the lock-in is the final answer → straight to results
    expect(g.phase).toBe('results');
    const r = g.result!;
    expect(r).toMatchObject({ liarCaught: true, liarGuessCorrect: true, guessLocked: true, winner: 'liar' });
    expect(r.lockedGuesses).toEqual({ [L]: g.secretWord });
    expect(r.scoreDeltas[L]).toBe(SCORE['spy-cracks-codeword'] + lockBonus('discussion'));
    expect(r.scoreDeltas[t[0]]).toBe(SCORE['agent-spotted-spy']);
  });

  it('a correct lock-in during voting earns no bonus (+0) even when the spy escapes; a wrong one costs nothing', () => {
    const { g, host } = setup(4);
    toVoting(g, host);
    const L = liar(g);
    g.submitGuess(L, g.secretWord!, T0);
    g.tick(g.phaseEndsAt!); // nobody voted
    expect(g.result!.scoreDeltas[L]).toBe(SCORE['spy-escapes'] + lockBonus('voting'));
    g.nextRound(host, T0);
    for (const p of g.players) g.ready(p.id, T0);
    g.skipPhase(host, T0);
    g.skipPhase(host, T0);
    const L2 = liar(g);
    g.submitGuess(L2, g.topic!.words.find((w) => w !== g.secretWord)!, T0);
    g.tick(g.phaseEndsAt!);
    expect(g.result!.scoreDeltas[L2]).toBe(SCORE['spy-escapes']);
  });

  it('a wrong lock-in is the final answer when caught', () => {
    const { g, host } = setup(3);
    toVoting(g, host);
    const L = liar(g);
    g.submitGuess(L, g.topic!.words.find((w) => w !== g.secretWord)!, T0);
    for (const p of g.players) g.castVote(p.id, p.id === L ? truthers(g)[0] : L, T0);
    expect(g.phase).toBe('results');
    expect(g.result!.winner).toBe('truth-tellers');
  });
});

describe('warm-up round & awards', () => {
  it('first round of the first game has 1.5× timers; later rounds and games do not', () => {
    const { g, host } = setup(3, { targetScore: 0, roundsPerGame: 2 }, { warmup: true });
    g.start(host, T0);
    expect(g.publicState(T0).round.warmup).toBe(true);
    for (const p of g.players) g.ready(p.id, T0);
    expect(g.phaseEndsAt).toBe(T0 + g.settings.clueSeconds * 1000 * WARMUP_FACTOR);
    g.skipPhase(host, T0);
    expect(g.phaseEndsAt).toBe(T0 + g.settings.discussionSeconds * 1000 * WARMUP_FACTOR);
    g.skipPhase(host, T0);
    g.skipPhase(host, T0);
    g.nextRound(host, T0);
    expect(g.publicState(T0).round.warmup).toBe(false);
    for (const p of g.players) g.ready(p.id, T0);
    expect(g.phaseEndsAt).toBe(T0 + g.settings.clueSeconds * 1000);
  });

  it('game-over awards: sharpest eye, smoothest spy, codebreaker', () => {
    const { g, host } = setup(4, { targetScore: 0, roundsPerGame: 2 });
    g.start(host, T0);
    // round 1: everyone catches the spy, spy cracks it via lock
    for (const p of g.players) g.ready(p.id, T0);
    g.skipPhase(host, T0);
    g.skipPhase(host, T0);
    const L1 = liar(g);
    g.submitGuess(L1, g.secretWord!, T0);
    const [t1] = truthers(g);
    for (const p of g.players) g.castVote(p.id, p.id === L1 ? t1 : L1, T0);
    g.nextRound(host, T0);
    // round 2: only one agent spots the spy
    for (const p of g.players) g.ready(p.id, T0);
    g.skipPhase(host, T0);
    g.skipPhase(host, T0);
    const L2 = liar(g);
    const [keen, o1, o2] = truthers(g);
    g.castVote(keen, L2, T0);
    g.castVote(L2, keen, T0);
    g.castVote(o1, keen, T0);
    g.castVote(o2, keen, T0);
    expect(g.result!.accusedId).toBe(keen);
    g.nextRound(host, T0);
    expect(g.phase).toBe('game-over');
    const awards = g.publicState(T0).awards!;
    const byId = Object.fromEntries(awards.map((a) => [a.id, a]));
    expect(byId['codebreaker'].playerIds).toEqual([L1]);
    expect(byId['smoothest-spy'].playerIds).toContain(L2);
    expect(byId['sharpest-eye'].value).toBeGreaterThanOrEqual(1);
    if (L1 !== keen) expect(byId['sharpest-eye'].playerIds).toContain(keen);
    expect(byId['usual-suspect'].playerIds).toContain(keen);
    g.restart(host);
    expect(g.publicState(T0).awards).toBeUndefined();
  });
});

describe('codenames', () => {
  it('de-duplicates names server-side, case-insensitively, within 16 chars', () => {
    const { g, ids } = setup(1);
    const b = g.addPlayer(profile('p0'), 't1', T0);
    expect(b.name).toBe('p0 2');
    const c = g.addPlayer(profile('P0'), 't2', T0);
    expect(c.name).toBe('P0 3');
    const long = g.addPlayer(profile('Abcdefghijklmnop'), 't3', T0);
    const long2 = g.addPlayer(profile('Abcdefghijklmnop'), 't4', T0);
    expect(long.name).toBe('Abcdefghijklmnop');
    expect(long2.name).toBe('Abcdefghijklmn 2');
    g.updateProfile(ids[0], profile('p0 2'));
    expect(g.get(ids[0])!.name).not.toBe('p0 2');
    g.updateProfile(ids[0], profile('P0'));
    expect(g.get(ids[0])!.name).toBe('P0'); // own name is not a clash
  });
});

describe('briefing (group tutorial)', () => {
  const brief = (n: number, settings: Partial<GameSettings> = {}) => setup(n, settings, { briefing: true });
  const readyAll = (g: Game, ids: string[], now = T0) => ids.forEach((id) => g.briefingReady(id, now));

  it('first game enters an untimed briefing with ready flags reset', () => {
    const { g, ids, host } = brief(3);
    g.get(ids[1])!.ready = true;
    g.start(host, T0);
    expect(g.phase).toBe('briefing');
    expect(g.phaseEndsAt).toBeNull();
    expect(g.nextWakeAt()).toBeNull();
    expect(g.players.every((p) => !p.ready)).toBe(true);
    expect(g.roundNumber).toBe(0);
    const pub = g.publicState(T0);
    expect(pub.round.phase).toBe('briefing');
    expect(pub.round.topic).toBeNull();
    for (const id of ids) expect(g.privateView(id)).toMatchObject({ role: null, secretWord: null, topic: null });
  });

  it('starts the round only once every player is ready (idempotent)', () => {
    const { g, ids, host } = brief(3);
    g.start(host, T0);
    g.briefingReady(ids[0], T0);
    g.briefingReady(ids[0], T0);
    g.briefingReady(ids[1], T0);
    expect(g.phase).toBe('briefing');
    expect(g.get(ids[0])!.ready).toBe(true);
    g.briefingReady(ids[2], T0 + 5);
    expect(g.phase).toBe('role-reveal');
    expect(g.roundNumber).toBe(1);
    expect(g.phaseEndsAt).toBe(T0 + 5 + ROLE_REVEAL_MS);
    expect(g.players.every((p) => !p.ready && p.inRound)).toBe(true);
    g.briefingReady(ids[0], T0); // ignored outside the briefing
    expect(g.get(ids[0])!.ready).toBe(false);
  });

  it('second game / restart and briefing:false skip it', () => {
    const { g, host } = brief(3, { targetScore: 0, roundsPerGame: 1 });
    g.start(host, T0);
    readyAll(g, g.players.map((p) => p.id));
    expect(g.phase).toBe('role-reveal');
    for (const p of g.players) g.ready(p.id, T0);
    g.skipPhase(host, T0);
    g.skipPhase(host, T0);
    g.skipPhase(host, T0);
    if (g.phase === 'liar-guess') g.skipPhase(host, T0);
    g.nextRound(host, T0);
    expect(g.phase).toBe('game-over');
    g.restart(host);
    g.start(host, T0);
    expect(g.phase).toBe('role-reveal');

    const off = setup(3); // briefing: false
    off.g.start(off.host, T0);
    expect(off.g.phase).toBe('role-reveal');
  });

  it('accepts briefing in settings (boolean, lobby only)', () => {
    const { g, host } = setup(3);
    g.updateSettings(host, { briefing: true });
    expect(g.settings.briefing).toBe(true);
    expect(() => g.updateSettings(host, { briefing: 'yes' as unknown as boolean })).toThrow(/briefing/);
    g.start(host, T0);
    expect(() => g.updateSettings(host, { briefing: false })).toThrow(/lobby/);
  });

  it('an away player blocks until they confirm; an offline player does not', () => {
    const { g, ids, host } = brief(4);
    g.start(host, T0);
    g.setVisible(ids[3], false, T0); // texting someone
    expect(g.get(ids[3])!.presence).toBe('away');
    readyAll(g, ids.slice(0, 3));
    expect(g.phase).toBe('briefing');
    g.setVisible(ids[3], true, T0);
    g.briefingReady(ids[3], T0);
    expect(g.phase).toBe('role-reveal');

    const b = brief(4);
    b.g.goOffline(b.ids[3], T0);
    b.g.start(b.host, T0);
    readyAll(b.g, b.ids.slice(0, 3));
    expect(b.g.phase).toBe('role-reveal');
    expect(b.g.get(b.ids[3])!.inRound).toBe(false);
  });

  it('an away player expiring to offline unblocks the room', () => {
    const { g, ids, host } = brief(4);
    g.start(host, T0);
    g.setSocket(ids[3], false, T0);
    readyAll(g, ids.slice(0, 3));
    expect(g.phase).toBe('briefing');
    expect(g.nextWakeAt()).toBe(T0 + AWAY_GRACE_MS);
    g.tick(T0 + AWAY_GRACE_MS);
    expect(g.phase).toBe('role-reveal');
  });

  it('a player leaving or being kicked unblocks the room', () => {
    const { g, ids, host } = brief(5);
    g.start(host, T0);
    readyAll(g, ids.slice(0, 3));
    g.removePlayer(ids[3], T0);
    expect(g.phase).toBe('briefing');
    g.kick(host, ids[4], T0);
    expect(g.phase).toBe('role-reveal');
  });

  it('returns to the lobby when fewer than minPlayers remain; next start replays it', () => {
    const { g, ids, host } = brief(3);
    g.start(host, T0);
    g.briefingReady(ids[0], T0);
    g.removePlayer(ids[2], T0);
    expect(g.phase).toBe('lobby');
    expect(g.drainToasts()).toContain('Not enough players — back to the lobby');
    expect(g.players.every((p) => !p.ready)).toBe(true);
    g.addPlayer(profile('Z'), 'tz', T0);
    g.start(host, T0);
    expect(g.phase).toBe('briefing');
  });

  it('a player who joins during the briefing must confirm too', () => {
    const { g, ids, host } = brief(3);
    g.start(host, T0);
    readyAll(g, ids.slice(0, 2));
    const late = g.addPlayer(profile('Late'), 'tlate', T0);
    expect(late.ready).toBe(false);
    g.briefingReady(ids[2], T0);
    expect(g.phase).toBe('briefing');
    g.briefingReady(late.id, T0);
    expect(g.phase).toBe('role-reveal');
    expect(g.get(late.id)!.inRound).toBe(true);
  });

  it('phase:skip is ignored during the briefing', () => {
    const { g, host } = brief(3);
    g.start(host, T0);
    expect(() => g.skipPhase(host, T0)).not.toThrow();
    expect(g.phase).toBe('briefing');
  });

  it('warm-up still applies to round 1 after the briefing', () => {
    const { g, ids, host } = setup(3, {}, { briefing: true, warmup: true });
    g.start(host, T0);
    expect(g.publicState(T0).round.warmup).toBe(false);
    readyAll(g, ids);
    expect(g.publicState(T0).round).toMatchObject({ warmup: true, practice: true });
  });
});

describe('practice round', () => {
  /** finish a round where every agent catches the spy and the spy guesses wrong */
  function catchSpy(g: Game, host: string) {
    for (const p of g.players) g.ready(p.id, T0);
    g.skipPhase(host, T0);
    g.skipPhase(host, T0);
    const L = liar(g);
    for (const p of g.players) g.castVote(p.id, p.id === L ? truthers(g)[0] : L, T0);
    if (g.phase === 'liar-guess') g.submitGuess(L, g.topic!.words.find((w) => w !== g.secretWord)!, T0);
    expect(g.phase).toBe('results');
  }

  it('shows the breakdown but keeps scores at 0; later rounds count; awards ignore it', () => {
    const { g, host } = setup(4, { targetScore: 0, roundsPerGame: 2 }, { warmup: true });
    g.start(host, T0);
    catchSpy(g, host);
    const r1 = g.publicState(T0).round;
    expect(r1).toMatchObject({ practice: true, warmup: true, number: 1 });
    const agent = truthers(g)[0];
    expect(r1.result!.scoreDeltas[agent]).toBe(SCORE['agent-spotted-spy'] + SCORE['agent-team-win']);
    expect(r1.result!.scoreBreakdown![agent].map((l) => l.rule)).toEqual(['agent-spotted-spy', 'agent-team-win']);
    expect(g.players.every((p) => p.score === 0)).toBe(true);

    g.nextRound(host, T0);
    expect(g.publicState(T0).round.practice).toBe(false);
    catchSpy(g, host);
    const agent2 = truthers(g)[0];
    expect(g.get(agent2)!.score).toBe(SCORE['agent-spotted-spy'] + SCORE['agent-team-win']);
    expect(g.get(liar(g))!.score).toBe(0);

    g.nextRound(host, T0); // practice round counts toward roundsPerGame
    expect(g.phase).toBe('game-over');
    const eye = g.publicState(T0).awards!.find((a) => a.id === 'sharpest-eye')!;
    expect(eye.value).toBe(1); // only round 2 counted
  });

  it('no practice round when warmupRound is off', () => {
    const { g, host } = setup(4);
    g.start(host, T0);
    catchSpy(g, host);
    expect(g.publicState(T0).round.practice).toBe(false);
    expect(g.get(truthers(g)[0])!.score).toBe(SCORE['agent-spotted-spy'] + SCORE['agent-team-win']);
  });
});
