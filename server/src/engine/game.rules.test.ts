import { describe, it, expect } from 'vitest';
import { LOBBY_AWAY_GRACE_MS, LOBBY_REMOVE_MS, MAX_ROUNDS_TARGET, type GameSettings } from '@oncealiar/shared';
import { Game, GameError } from './game.js';
import { FIXTURE_PACKS, profile, seeded } from '../test/fixtures.js';

const T0 = 1_000_000;

function setup(n: number, settings: Partial<GameSettings> = {}, seed = 7) {
  let i = 0;
  const g = new Game({
    code: 'ABCD',
    packs: FIXTURE_PACKS,
    rng: seeded(seed),
    idGen: () => `p${++i}`,
    premium: true,
    settings: { warmupRound: false, briefing: false }
  });
  const ids: string[] = [];
  for (let k = 0; k < n; k++) ids.push(g.addPlayer(profile(`P${k}`), `tok${k}`, T0).id);
  if (Object.keys(settings).length) g.updateSettings(ids[0], settings);
  return { g, ids, host: ids[0] };
}

/** play the current round with no votes: the Spy escapes (+3), agents score 0 */
function playNoVote(g: Game, host: string) {
  for (let k = 0; k < 4; k++) g.skipPhase(host, T0);
  expect(g.phase).toBe('results');
}

const endsGame = (g: Game) => g.publicState(T0).round.result!.endsGame;

describe('first-to-N', () => {
  it('first to 15 ends exactly when one player reaches it at round end', () => {
    const { g, host } = setup(4, { targetScore: 15 });
    g.start(host, T0);
    let spy = g.liarIds[0];
    g.get(spy)!.score = 11; // → 14 after this round
    playNoVote(g, host);
    expect(g.get(spy)!.score).toBe(14);
    expect(endsGame(g)).toBe(false);
    g.nextRound(host, T0);
    expect(g.phase).toBe('role-reveal');

    spy = g.liarIds[0];
    for (const p of g.players) p.score = 0;
    g.get(spy)!.score = 12; // → 15
    playNoVote(g, host);
    expect(endsGame(g)).toBe(true);
    g.nextRound(host, T0);
    expect(g.phase).toBe('game-over');
    expect(g.winners).toEqual([spy]);
    expect(g.publicState(T0).round.result!.endsGame).toBe(true);
  });

  it('a tie at the top (>= target) plays another round (sudden death)', () => {
    const { g, host } = setup(4, { targetScore: 15 });
    g.start(host, T0);
    const spy = g.liarIds[0];
    const rival = g.players.find((p) => p.id !== spy)!;
    g.get(spy)!.score = 13; // → 16
    rival.score = 16;
    playNoVote(g, host);
    expect(endsGame(g)).toBe(false);
    g.nextRound(host, T0);
    expect(g.phase).toBe('role-reveal');
    expect(g.roundNumber).toBe(2);
    // the next Spy pulls ahead → game over
    const spy2 = g.liarIds[0];
    g.get(spy2)!.score = 16; // still tied at 16 going in
    playNoVote(g, host);
    expect(g.get(spy2)!.score).toBeGreaterThan(16);
    expect(endsGame(g)).toBe(true);
    g.nextRound(host, T0);
    expect(g.winners).toEqual([spy2]);
  });

  it(`caps the game at MAX_ROUNDS_TARGET (${MAX_ROUNDS_TARGET}) rounds; ties share the win`, () => {
    const { g, host } = setup(3, { targetScore: 20 });
    g.start(host, T0);
    for (let r = 1; r <= MAX_ROUNDS_TARGET; r++) {
      expect(g.roundNumber).toBe(r);
      playNoVote(g, host);
      for (const p of g.players) p.score = 0; // nobody ever reaches the target
      expect(endsGame(g)).toBe(r === MAX_ROUNDS_TARGET);
      g.nextRound(host, T0);
    }
    expect(g.phase).toBe('game-over');
    expect(g.winners!.length).toBe(3);
  });

  it('targetScore 0 plays exactly roundsPerGame rounds, whatever the scores', () => {
    const { g, host } = setup(3, { targetScore: 0, roundsPerGame: 2 });
    g.start(host, T0);
    g.get(g.liarIds[0])!.score = 100;
    playNoVote(g, host);
    expect(endsGame(g)).toBe(false);
    g.nextRound(host, T0);
    expect(g.phase).toBe('role-reveal');
    playNoVote(g, host);
    expect(endsGame(g)).toBe(true);
    g.nextRound(host, T0);
    expect(g.phase).toBe('game-over');
  });

  it('roundsPerGame is ignored with a target (a 1-round setting does not end the game)', () => {
    const { g, host } = setup(3, { targetScore: 10, roundsPerGame: 1 });
    g.start(host, T0);
    playNoVote(g, host);
    expect(endsGame(g)).toBe(false);
  });

  it('validates targetScore: 0 or one of TARGET_SCORES', () => {
    const { g, host } = setup(3);
    for (const v of [0, 10, 15, 20]) {
      g.updateSettings(host, { targetScore: v });
      expect(g.settings.targetScore).toBe(v);
    }
    for (const v of [12, -5, 25, '15', null, NaN] as unknown[]) {
      expect(() => g.updateSettings(host, { targetScore: v as number })).toThrow(GameError);
    }
    expect(g.settings.targetScore).toBe(20);
  });
});

describe('random Spy', () => {
  /** play rounds (no votes), recording each round's Spies */
  function spiesOver(g: Game, host: string, rounds: number): string[][] {
    const out: string[][] = [];
    g.start(host, T0);
    for (let r = 0; r < rounds; r++) {
      out.push([...g.liarIds]);
      playNoVote(g, host);
      if (r < rounds - 1) g.nextRound(host, T0);
    }
    return out;
  }

  it('never repeats a Spy back-to-back with >= 3 players', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const { g, host } = setup(3, { targetScore: 0, roundsPerGame: 20 }, seed);
      const spies = spiesOver(g, host, 20).map((s) => s[0]);
      for (let r = 1; r < spies.length; r++) expect(spies[r]).not.toBe(spies[r - 1]);
    }
  });

  it('2-Spy games never reuse last round\'s Spies', () => {
    for (const seed of [1, 9]) {
      const { g, host } = setup(10, { targetScore: 0, roundsPerGame: 20, liarCount: 2 }, seed);
      const rounds = spiesOver(g, host, 8);
      for (const s of rounds) expect(s.length).toBe(2);
      for (let r = 1; r < rounds.length; r++) expect(rounds[r].some((id) => rounds[r - 1].includes(id))).toBe(false);
    }
  });

  it('is not a rotation: a player can be Spy again before everyone has had a turn', () => {
    let repeatedEarly = false;
    for (let seed = 1; seed <= 40 && !repeatedEarly; seed++) {
      const { g, host, ids } = setup(6, { targetScore: 0, roundsPerGame: 20 }, seed);
      const spies = spiesOver(g, host, 5).map((s) => s[0]);
      if (new Set(spies).size < spies.length) repeatedEarly = true;
      expect(ids).toEqual(expect.arrayContaining([spies[0]]));
    }
    expect(repeatedEarly).toBe(true);
  });

  it('the final round of a cycle is not a certainty (every player stays possible)', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 60; seed++) {
      const { g, host } = setup(4, { targetScore: 0, roundsPerGame: 20 }, seed);
      seen.add(spiesOver(g, host, 4)[3][0]);
    }
    expect(seen.size).toBeGreaterThan(1);
  });
});

describe('defaults', () => {
  it('plays a fixed 5 rounds by default (no first-to-N)', () => {
    const { g } = setup(4);
    expect(g.settings.targetScore).toBe(0);
    expect(g.settings.roundsPerGame).toBe(5);
  });
});

describe('early lock bonus shrinks over the round', () => {
  /** the Spy locks the true word in `phase`, then nobody votes (Spy escapes) */
  function lockIn(phase: 'clues' | 'discussion' | 'voting') {
    const { g, host } = setup(4, { targetScore: 0, roundsPerGame: 5 });
    g.start(host, T0);
    g.ready(host, T0);
    for (const id of g.players.map((p) => p.id)) g.ready(id, T0);
    if (phase !== 'clues') g.skipPhase(host, T0); // clues → discussion
    if (phase === 'voting') g.skipPhase(host, T0); // discussion → voting
    expect(g.phase).toBe(phase);
    const spy = g.liarIds[0];
    g.submitGuess(spy, g.secretWord!, T0);
    while (g.phase !== 'results') g.skipPhase(host, T0);
    return g.result!.scoreBreakdown![spy].find((l) => l.rule === 'spy-early-lock')?.points ?? 0;
  }
  it('+2 in clues, +1 in the debate, nothing once voting starts', () => {
    expect(lockIn('clues')).toBe(2);
    expect(lockIn('discussion')).toBe(1);
    expect(lockIn('voting')).toBe(0);
  });
});

describe('ready to vote and +30s', () => {
  function toDiscussion(n = 4) {
    const { g, ids, host } = setup(n);
    g.start(host, T0);
    for (const id of ids) g.ready(id, T0);
    g.skipPhase(host, T0);
    expect(g.phase).toBe('discussion');
    return { g, ids, host };
  }
  it('voting starts once every human here taps ready', () => {
    const { g, ids } = toDiscussion();
    for (const id of ids.slice(0, 3)) g.discussionReady(id, T0 + 1000);
    expect(g.phase).toBe('discussion');
    g.discussionReady(ids[3], T0 + 1000);
    expect(g.phase).toBe('voting');
  });
  it('an away player does not hold the debate open', () => {
    const { g, ids } = toDiscussion();
    g.setSocket(ids[3], false, T0);
    for (const id of ids.slice(0, 3)) g.discussionReady(id, T0 + 1000);
    expect(g.phase).toBe('voting');
  });
  it('bots do not need to tap ready', () => {
    const { g, ids } = toDiscussion();
    g.markBot(ids[3]);
    for (const id of ids.slice(0, 3)) g.discussionReady(id, T0 + 1000);
    expect(g.phase).toBe('voting');
  });
  it('the host adds 30s, twice, and the ready taps reset', () => {
    const { g, ids, host } = toDiscussion();
    const end = g.phaseEndsAt!;
    g.discussionReady(ids[1], T0 + 1000);
    g.extendDiscussion(host, T0 + 2000);
    expect(g.phaseEndsAt).toBe(end + 30_000);
    expect(g.get(ids[1])!.ready).toBe(false);
    g.extendDiscussion(host, T0 + 3000);
    expect(g.phaseEndsAt).toBe(end + 60_000);
    expect(() => g.extendDiscussion(host, T0 + 4000)).toThrow(GameError);
    expect(g.publicState(T0).round.extensions).toBe(2);
  });
  it('only the host can extend; extending outside the debate is refused', () => {
    const { g, ids } = toDiscussion();
    expect(() => g.extendDiscussion(ids[1], T0)).toThrow(GameError);
    g.skipPhase(ids[0], T0);
    expect(() => g.extendDiscussion(ids[0], T0)).toThrow(GameError);
  });
});

describe('typed clues', () => {
  function toClues() {
    const { g, ids, host } = setup(4, { clueMode: 'typed' });
    g.start(host, T0);
    for (const id of ids) g.ready(id, T0);
    expect(g.phase).toBe('clues');
    return g;
  }
  it('an Agent cannot type the codeword, in any case', () => {
    const g = toClues();
    const agent = g.players.find((p) => !g.liarIds.includes(p.id))!;
    g.currentTurn = g.turnOrder.indexOf(agent.id);
    expect(() => g.submitClue(agent.id, g.secretWord!.toUpperCase().replace(/\s/g, ''), T0)).toThrow;
    if (!/\s/.test(g.secretWord!)) expect(() => g.submitClue(agent.id, g.secretWord!.toUpperCase(), T0)).toThrow(GameError);
  });
  it('the Spy is never refused for the codeword (that would reveal it)', () => {
    const g = toClues();
    const spy = g.liarIds[0];
    g.currentTurn = g.turnOrder.indexOf(spy);
    if (!/\s/.test(g.secretWord!)) expect(() => g.submitClue(spy, g.secretWord!, T0)).not.toThrow();
  });
  it('rejects a repeat of an earlier clue', () => {
    const g = toClues();
    g.submitClue(g.turnOrder[g.currentTurn], 'sunny', T0);
    expect(() => g.submitClue(g.turnOrder[g.currentTurn], 'SUNNY', T0)).toThrow(GameError);
  });
});

describe('lobby patience', () => {
  it('an away player in the lobby stays away for 10 minutes, then goes offline', () => {
    const { g, ids } = setup(4);
    g.setSocket(ids[2], false, T0);
    expect(g.get(ids[2])!.presence).toBe('away');
    expect(g.nextWakeAt()).toBe(T0 + LOBBY_AWAY_GRACE_MS);
    g.tick(T0 + 9 * 60_000);
    expect(g.get(ids[2])!.presence).toBe('away');
    expect(g.get(ids[2])!.connected).toBe(true);
    g.tick(T0 + 10 * 60_000);
    expect(g.get(ids[2])!.presence).toBe('offline');
  });

  it('offline lobby players are removed after 15 minutes, not 5', () => {
    const { g, ids } = setup(4);
    g.goOffline(ids[3], T0);
    expect(LOBBY_REMOVE_MS).toBe(15 * 60_000);
    expect(g.maintenance(T0 + 6 * 60_000).removed).toEqual([]);
    expect(g.maintenance(T0 + 14 * 60_000).removed).toEqual([]);
    expect(g.maintenance(T0 + 15 * 60_000 + 1).removed).toEqual([ids[3]]);
  });

  it('in-game grace is unchanged', () => {
    const { g, ids, host } = setup(4);
    g.start(host, T0);
    g.setSocket(ids[2], false, T0);
    g.tick(T0 + g.awayGraceMs);
    expect(g.get(ids[2])!.presence).toBe('offline');
  });
});

describe('endSession', () => {
  it('lobby with no rounds played → false (caller closes the room)', () => {
    const { g } = setup(3);
    expect(g.endSession(T0)).toBe(false);
    expect(g.sessionEnded).toBe(false);
  });

  it('mid-round → game-over from current scores; the unfinished round scores nothing; then read-only', () => {
    const { g, host, ids } = setup(4, { targetScore: 0, roundsPerGame: 5 });
    g.start(host, T0);
    playNoVote(g, host); // round 1 counts
    const spy1 = g.liarIds[0];
    g.nextRound(host, T0);
    for (let k = 0; k < 3; k++) g.skipPhase(host, T0); // round 2 at voting
    expect(g.phase).toBe('voting');
    expect(g.endSession(T0)).toBe(true);
    const st = g.publicState(T0);
    expect(st.round.phase).toBe('game-over');
    expect(st.sessionEnded).toBe(true);
    expect(st.round.result).toBeNull();
    expect(st.winners).toEqual([spy1]);
    expect(g.get(spy1)!.score).toBe(3);
    expect(Array.isArray(st.awards)).toBe(true);
    expect(() => g.restart(host)).toThrow('This session has ended');
    expect(() => g.start(host, T0)).toThrow('This session has ended');
    expect(() => g.updateSettings(host, { roundsPerGame: 3 })).toThrow('This session has ended');
    expect(() => g.kick(host, ids[1], T0)).toThrow('This session has ended');
    expect(() => g.addPlayer(profile('Late'), 'tokL', T0)).toThrow('This session has ended');
  });

  it('a practice round counts as nothing', () => {
    let i = 0;
    const g = new Game({ code: 'ABCD', packs: FIXTURE_PACKS, rng: seeded(3), idGen: () => `p${++i}`, settings: { warmupRound: true, briefing: false } });
    const host = g.addPlayer(profile('A'), 't0', T0).id;
    g.addPlayer(profile('B'), 't1', T0);
    g.addPlayer(profile('C'), 't2', T0);
    g.start(host, T0);
    playNoVote(g, host);
    expect(g.endSession(T0)).toBe(true);
    expect(g.players.every((p) => p.score === 0)).toBe(true);
    expect(g.winners!.length).toBe(3);
  });
});
