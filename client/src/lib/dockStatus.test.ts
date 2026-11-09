import { describe, it, expect } from 'vitest';
import { DEFAULT_SETTINGS, type Phase, type Player, type PrivateView, type PublicGameState } from '@oncealiar/shared';
import { deriveDockStatus, formatClock, listNames } from './dockStatus';

const player = (id: string, extra: Partial<Player> = {}): Player => ({
  id,
  name: id.toUpperCase(),
  avatar: 'fox',
  color: 'red',
  score: 0,
  connected: true,
  presence: 'online',
  isHost: false,
  ready: true,
  hasVoted: false,
  ...extra
});

function state(phase: Phase, players: Player[], round: Partial<PublicGameState['round']> = {}, settings = {}): PublicGameState {
  return {
    code: 'ABCD',
    players,
    settings: { ...DEFAULT_SETTINGS, ...settings },
    packs: [],
    round: { number: 1, phase, phaseEndsAt: null, serverNow: 0, topic: null, turnOrder: players.map((p) => p.id), currentTurn: 0, clues: [], result: null, ...round }
  };
}

const you = (playerId: string, extra: Partial<PrivateView> = {}): PrivateView => ({ playerId, role: 'truth-teller', secretWord: 'x', myVote: null, token: 't', ...extra });

describe('formatClock / listNames', () => {
  it('formats m:ss, rounding up', () => {
    expect(formatClock(12_000)).toBe('0:12');
    expect(formatClock(11_200)).toBe('0:12');
    expect(formatClock(75_000)).toBe('1:15');
    expect(formatClock(-5)).toBe('0:00');
    expect(formatClock(null)).toBeNull();
  });
  it('lists names compactly', () => {
    expect(listNames(['A'])).toBe('A');
    expect(listNames(['A', 'B'])).toBe('A & B');
    expect(listNames(['A', 'B', 'C', 'D'])).toBe('A, B +2');
  });
});

describe('deriveDockStatus', () => {
  const ps = [player('a'), player('b'), player('c')];

  it('returns null without state or for untimed/unknown phases', () => {
    expect(deriveDockStatus(null, null, null)).toBeNull();
    expect(deriveDockStatus(state('lobby', ps), you('a'), null)).toBeNull();
    expect(deriveDockStatus(state('clues', ps), you('zz'), null)).toBeNull();
  });

  it('clues: your turn vs waiting on the current player', () => {
    expect(deriveDockStatus(state('clues', ps), you('a'), 12_000)).toEqual({ kind: 'you', text: 'Say your clue out loud', time: '0:12' });
    expect(deriveDockStatus(state('clues', ps, {}, { clueMode: 'typed' }), you('a'), null)?.text).toBe('Type your one-word clue');
    expect(deriveDockStatus(state('clues', ps, { currentTurn: 1 }), you('a'), 9_000)).toEqual({ kind: 'waiting', text: 'B', time: '0:09' });
    expect(deriveDockStatus(state('clues', ps, { currentTurn: 9 }), you('a'), null)).toBeNull();
  });

  it('voting: act until you vote, then wait on the others (offline skipped)', () => {
    expect(deriveDockStatus(state('voting', ps), you('a'), null)?.kind).toBe('you');
    const voted = [player('a', { hasVoted: true }), player('b'), player('c'), player('d', { presence: 'offline' })];
    expect(deriveDockStatus(state('voting', voted), you('a', { myVote: 'b' }), 5_000)).toEqual({ kind: 'waiting', text: 'B & C', time: '0:05' });
    const all = ps.map((p) => ({ ...p, hasVoted: true }));
    expect(deriveDockStatus(state('voting', all), you('a', { myVote: 'b' }), null)).toBeNull();
    expect(deriveDockStatus(state('voting', ps, { runoff: ['b', 'c'] }), you('a'), null)?.text).toMatch(/Sudden death/);
  });

  it('is identical for Spy and Agent', () => {
    for (const phase of ['clues', 'discussion', 'voting'] as Phase[]) {
      const g = state(phase, ps);
      expect(deriveDockStatus(g, you('a', { role: 'liar', secretWord: null }), 3000)).toEqual(deriveDockStatus(g, you('a'), 3000));
    }
  });
});
