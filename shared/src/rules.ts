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
export const TWO_SPIES_FROM = 10;
export const TWO_SPIES_MIN = 7;

/** Debate pacing: the host can add this much time, at most MAX_EXTENSIONS times per round. */
export const EXTEND_MS = 30_000;
export const MAX_EXTENSIONS = 2;

/** Early lock-in bonus shrinks as the round goes on, so locking early is a real decision. */
export const LOCK_BONUS = { clues: 2, discussion: 1, voting: 0 } as const;
export type LockPhase = keyof typeof LOCK_BONUS;
export const lockBonus = (phase: string): number => (LOCK_BONUS as Record<string, number>)[phase] ?? 0;

/** First-to-N mode: allowed targets and a hard cap so a game can't run forever. */
export const TARGET_SCORES = [10, 15, 20] as const;
export const MAX_ROUNDS_TARGET = 20;

/** Lobby patience (screens time out at parties): an away player in the lobby keeps
 *  their seat this long before going offline (in-game it's AWAY_GRACE_MS)… */
export const LOBBY_AWAY_GRACE_MS = 10 * 60_000;
/** …and an offline player is removed from the lobby after this long. */
export const LOBBY_REMOVE_MS = 15 * 60_000;

/** Points per scoring rule. */
export const SCORE: Record<ScoreRuleId, number> = {
  'spy-escapes': 3,
  'spy-cracks-codeword': 2,
  'spy-early-lock': LOCK_BONUS.clues,
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
  { id: 'spy-early-lock', points: SCORE['spy-early-lock'], role: 'spy', label: 'Early lock', rule: 'Spy: lock in a correct guess early? +2 during clues, +1 during the debate, nothing once voting starts. It is your final answer if caught.' },
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
  earlyLock: 'The Spy may lock in a guess early: +2 during clues, +1 during the debate. It becomes their final answer if caught.',
  readyToVote: 'Everyone ready? Tap Ready to vote and the debate ends early. The host can add 30 seconds, twice.',
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
 * 2 Spies from 10 players.
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
