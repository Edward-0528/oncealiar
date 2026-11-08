import type { Phase, Role } from '@oncealiar/shared';

/**
 * Coach tip copy: one short, friendly line per phase.
 *
 * IMPORTANT: tips are visible on screen to anyone glancing at a neighbor's phone,
 * so in-round tips must be IDENTICAL for the Spy and the Agents (same text, same
 * length). Never add role-specific keys for in-round phases — it would reveal the Spy.
 * Keys: `${phase}:any`, plus `runoff:any`. (`coachKey` still accepts a role for API
 * compatibility but deliberately ignores it.)
 */
export const COACH_COPY: Record<string, string> = {
  'lobby:any': 'Everyone joins on their own phone with the room code. 3–12 players works best.',
  'role-reveal:any': 'Open your file in secret. Agents get the codeword; the Spy gets nothing and must blend in.',
  'clues:any': 'Agents: one word that proves you know it, but not too obvious. Spy: pick a safe word that fits lots of the grid.',
  'discussion:any': "Whose clue didn't quite fit? Grill them. The Spy can secretly lock in a codeword guess for +1.",
  'voting:any': 'Vote for who you think the Spy is: +1 for spotting them. The Spy escapes with +3 if not the most-voted.',
  'runoff:any': 'Tie! Sudden death: 10 seconds to choose between the tied players. Still tied? The Spy escapes.',
  'liar-guess:any': 'Caught! The Spy gets one guess at the codeword from the grid to steal the round.',
  'results:any': 'The score breakdown shows exactly why everyone scored. A new Spy is picked every round.'
};

export function coachKey(phase: Phase, _role: Role | null, runoff: boolean): string | null {
  if (phase === 'voting' && runoff) return 'runoff:any';
  const k = `${phase}:any`;
  return COACH_COPY[k] ? k : null;
}
