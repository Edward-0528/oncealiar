import { MAX_ROUNDS_TARGET, type GameSettings } from '@oncealiar/shared';

/**
 * The ONE place the client decides "does the game end after these results?" and how game
 * length is labelled. The server's `RoundResult.endsGame` wins when present; the derivation is
 * the fallback for older servers.
 */

type SettingsLike = Pick<GameSettings, 'roundsPerGame'> & Partial<Pick<GameSettings, 'targetScore'>>;

export interface GameEndInput {
  settings: SettingsLike;
  roundNumber: number;
  scores: number[];
  /** a server-provided answer, if the contract has one; wins over the derivation */
  serverSays?: boolean | null;
}

/** First-to-N target, or 0 for a fixed number of rounds. Missing field (old server) → 0. */
export function targetOf(settings: SettingsLike): number {
  const t = settings.targetScore;
  return typeof t === 'number' && t > 0 ? t : 0;
}

/** True when the results now on screen are the last of the game ("Final results" instead of "Next round"). */
export function endsAfterThisRound({ settings, roundNumber, scores, serverSays }: GameEndInput): boolean {
  if (typeof serverSays === 'boolean') return serverSays;
  const target = targetOf(settings);
  if (target > 0) {
    if (roundNumber >= MAX_ROUNDS_TARGET) return true;
    const sorted = [...scores].sort((a, b) => b - a);
    const top = sorted[0] ?? 0;
    const tiedAtTop = sorted.length > 1 && sorted[1] === top;
    return top >= target && !tiedAtTop;
  }
  return roundNumber >= settings.roundsPerGame;
}

/** Top-bar round chip: "Rd 3 · to 15" with a target, "Rd 3/5" for fixed rounds. */
export function roundChipLabel(settings: SettingsLike, roundNumber: number): string {
  const target = targetOf(settings);
  return target > 0 ? `Rd ${roundNumber} · to ${target}` : `Rd ${roundNumber}/${settings.roundsPerGame}`;
}

/** Lobby / settings fact: "First to 15 points" or "5 rounds". */
export function gameLengthLabel(settings: SettingsLike): string {
  const target = targetOf(settings);
  return target > 0 ? `First to ${target} points` : `${settings.roundsPerGame} round${settings.roundsPerGame === 1 ? '' : 's'}`;
}

/** Convenience for the live game state (Results button, mock server). */
export function gameEndsAfterResults(game: { settings: SettingsLike; round: { number: number; result?: { endsGame?: boolean } | null }; players: { score: number }[] }): boolean {
  // RoundResult.endsGame is server-computed and authoritative; derive only for older servers
  return endsAfterThisRound({ settings: game.settings, roundNumber: game.round.number, scores: game.players.map((p) => p.score), serverSays: game.round.result?.endsGame });
}
