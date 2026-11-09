/**
 * Once a Liar — rule constants and player-facing rule copy.
 *
 * Every rule must be explainable in one sentence; the sentence lives next to
 * the number so the How to Play screen, coach tips and the engine never drift.
 * (User-facing names: Spy = 'liar', Agent = 'truth-teller', codeword = secret word.)
 */
import type { AwardId, GameSettings, ScoreRuleId } from './types/game.js';

/** An away player whose clue turn starts gets at most this long before being skipped. */
export const AWAY_TURN_MS = 20_000;
/** Sudden-death re-vote between tied players. */
export const RUNOFF_MS = 10_000;
/** Timer multiplier for the warm-up/practice round (first round played in a room; its points don't count). */
export const WARMUP_FACTOR = 1.5;
/** Two Spies are recommended from this many players (allowed from 7). */
export const TWO_SPIES_FROM = 8;
export const TWO_SPIES_MIN = 7;

/** Points per scoring rule. */
export const SCORE: Record<ScoreRuleId, number> = {
  'spy-escapes': 3,
  'spy-cracks-codeword': 2,
  'spy-early-lock': 1,
  'agent-spotted-spy': 1,
  'agent-team-win': 1
};

export interface ScoreRuleCopy {
  id: ScoreRuleId;
  points: number;
  /** very short label for score breakdown chips */
  label: string;
  /** the rule in one sentence */
  rule: string;
  role: 'spy' | 'agent';
}

export const SCORE_RULES: ScoreRuleCopy[] = [
  { id: 'spy-escapes', points: SCORE['spy-escapes'], role: 'spy', label: 'Escaped', rule: 'Spy: not the most-voted player? +3.' },
  { id: 'spy-cracks-codeword', points: SCORE['spy-cracks-codeword'], role: 'spy', label: 'Cracked it', rule: 'Spy: caught, but guess the codeword? +2 and the round.' },
  { id: 'spy-early-lock', points: SCORE['spy-early-lock'], role: 'spy', label: 'Early lock', rule: 'Spy: lock in a correct guess before the vote ends? +1 bonus — but it is your final answer.' },
  { id: 'agent-spotted-spy', points: SCORE['agent-spotted-spy'], role: 'agent', label: 'Spotted the Spy', rule: 'Agent: your vote was on the Spy? +1, even if the group got it wrong.' },
  { id: 'agent-team-win', points: SCORE['agent-team-win'], role: 'agent', label: 'Team win', rule: 'Agents: catch the Spy and they miss the codeword? +1 each.' }
];

export const scoreLabel = (id: ScoreRuleId) => SCORE_RULES.find((r) => r.id === id)?.label ?? id;

export interface AwardCopy {
  title: string;
  emoji: string;
  /** `{n}` is replaced with Award.value */
  blurb: string;
}

export const AWARDS: Record<AwardId, AwardCopy> = {
  'sharpest-eye': { title: 'Sharpest Eye', emoji: '🔎', blurb: 'Voted for the Spy {n}×' },
  'smoothest-spy': { title: 'Smoothest Spy', emoji: '🕶️', blurb: 'Won {n}× as the Spy' },
  codebreaker: { title: 'Codebreaker', emoji: '🔓', blurb: 'Cracked the codeword {n}×' },
  'usual-suspect': { title: 'Usual Suspect', emoji: '🙃', blurb: 'Innocent, yet got {n} votes' }
};

export const awardBlurb = (id: AwardId, value: number) => AWARDS[id].blurb.replace('{n}', String(value));

/** The whole game in one sentence per rule (How to Play, docs, coach tips). */
export const RULES_ONE_LINERS = {
  goal: 'Agents know the codeword; the Spy only sees the 16-word grid and has to blend in.',
  clues: 'Everyone gives one-word clues in turn: specific enough to prove you know, vague enough not to give it away.',
  vote: 'Discuss, then vote: the most-voted player is accused.',
  tie: 'Tied vote? A 10-second sudden-death re-vote between the tied players; still tied, the Spy slips away.',
  lastGuess: 'A caught Spy can still win by guessing the codeword from the grid.',
  earlyLock: 'The Spy may lock in a guess early for +1 — it becomes their final answer if caught.',
  practice: 'The first round in a room is a practice round: longer timers, and its points are shown but don\'t count.',
  away: 'Stepped away to answer a text? You keep your seat for 2 minutes; your turn waits up to 20 seconds.'
} as const;

// ───────────────────────── presets & group-size scaling ─────────────────────────

export type GamePreset = 'quick' | 'full';

export const GAME_PRESETS: Record<GamePreset, { label: string; blurb: string; rounds: number; clueSeconds: number; discussionSeconds: number; votingSeconds: number }> = {
  quick: { label: 'Quick game', blurb: '3 rounds · ~10 min', rounds: 3, clueSeconds: 20, discussionSeconds: 60, votingSeconds: 30 },
  full: { label: 'Full game', blurb: '5 rounds · ~20 min', rounds: 5, clueSeconds: 30, discussionSeconds: 90, votingSeconds: 45 }
};

/** Recommended Spy count for a group size. */
export function recommendedSpyCount(players: number): 1 | 2 {
  return players >= TWO_SPIES_FROM ? 2 : 1;
}

/**
 * Settings patch for a preset, scaled to the group: discussion grows 10s per
 * player above 6 (more suspects to talk through) and shrinks for 3–4 players;
 * 2 Spies from 8 players.
 */
export function presetSettings(preset: GamePreset, players: number): Partial<GameSettings> {
  const p = GAME_PRESETS[preset];
  const n = Math.max(3, players);
  const extra = n > 6 ? (n - 6) * 10 : n <= 4 ? -15 : 0;
  return {
    roundsPerGame: p.rounds,
    clueSeconds: p.clueSeconds,
    discussionSeconds: Math.max(45, p.discussionSeconds + extra),
    votingSeconds: p.votingSeconds,
    liarCount: recommendedSpyCount(n)
  };
}
