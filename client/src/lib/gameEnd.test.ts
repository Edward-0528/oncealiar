import { describe, expect, it } from 'vitest';
import { MAX_ROUNDS_TARGET } from '@oncealiar/shared';
import { endsAfterThisRound, gameEndsAfterResults, gameLengthLabel, roundChipLabel, targetOf } from './gameEnd';

const T15 = { roundsPerGame: 5, targetScore: 15 };
const FIXED = { roundsPerGame: 5, targetScore: 0 };

describe('gameEnd helper', () => {
  it('first-to-N: ends once a single leader reaches the target', () => {
    expect(endsAfterThisRound({ settings: T15, roundNumber: 6, scores: [14, 9, 3] })).toBe(false);
    expect(endsAfterThisRound({ settings: T15, roundNumber: 6, scores: [15, 9, 3] })).toBe(true);
    expect(endsAfterThisRound({ settings: T15, roundNumber: 6, scores: [9, 17, 3] })).toBe(true);
  });
  it('first-to-N: a tie at the top plays on', () => {
    expect(endsAfterThisRound({ settings: T15, roundNumber: 7, scores: [16, 16, 4] })).toBe(false);
  });
  it('first-to-N: the round cap ends it regardless', () => {
    expect(endsAfterThisRound({ settings: T15, roundNumber: MAX_ROUNDS_TARGET, scores: [8, 8] })).toBe(true);
  });
  it('fixed rounds ignore scores; missing targetScore (old server) means fixed', () => {
    expect(endsAfterThisRound({ settings: FIXED, roundNumber: 4, scores: [30] })).toBe(false);
    expect(endsAfterThisRound({ settings: FIXED, roundNumber: 5, scores: [0] })).toBe(true);
    expect(targetOf({ roundsPerGame: 5 })).toBe(0);
  });
  it('the server’s RoundResult.endsGame wins over the derivation', () => {
    const game = { settings: T15, round: { number: 3, result: { endsGame: true } }, players: [{ score: 2 }] };
    expect(gameEndsAfterResults(game)).toBe(true);
    expect(gameEndsAfterResults({ ...game, round: { number: 3, result: { endsGame: false } }, players: [{ score: 99 }] })).toBe(false);
    expect(gameEndsAfterResults({ ...game, round: { number: 3, result: null }, players: [{ score: 15 }] })).toBe(true);
  });
  it('labels', () => {
    expect(roundChipLabel(T15, 3)).toBe('Rd 3 · to 15');
    expect(roundChipLabel(FIXED, 3)).toBe('Rd 3/5');
    expect(gameLengthLabel(T15)).toBe('First to 15 points');
    expect(gameLengthLabel(FIXED)).toBe('5 rounds');
  });
});
