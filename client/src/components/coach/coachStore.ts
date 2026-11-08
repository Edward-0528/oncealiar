/**
 * Coach tip memory (localStorage, never throws). Tips are on for a player's
 * first two games, then switch themselves off; each tip can be dismissed.
 */
import { loadJSON, saveJSON } from '../../lib/storage';

const KEY = 'oal:coach';
/** tips auto-off once a player starts their 3rd game */
export const COACH_GAMES = 2;

export interface CoachState {
  /** user turned tips off (or back on) explicitly; null = automatic */
  enabled: boolean | null;
  dismissed: string[];
  /** ids of games this player has started (most recent last) */
  games: string[];
}

const fresh = (): CoachState => ({ enabled: null, dismissed: [], games: [] });

export function loadCoach(): CoachState {
  const s = loadJSON<Partial<CoachState> | null>(KEY, null);
  if (!s || typeof s !== 'object') return fresh();
  return {
    enabled: typeof s.enabled === 'boolean' ? s.enabled : null,
    dismissed: Array.isArray(s.dismissed) ? s.dismissed.filter((x) => typeof x === 'string') : [],
    games: Array.isArray(s.games) ? s.games.filter((x) => typeof x === 'string').slice(-10) : []
  };
}

export function saveCoach(s: CoachState): void {
  saveJSON(KEY, { ...s, games: s.games.slice(-10) });
}

export function coachActive(s: CoachState): boolean {
  if (s.enabled !== null) return s.enabled;
  return s.games.length <= COACH_GAMES;
}

/** Record a game start (idempotent per id). */
export function noteGame(s: CoachState, id: string): CoachState {
  if (s.games.includes(id)) return s;
  return { ...s, games: [...s.games, id] };
}

/** For a settings/profile toggle: turn coach tips on (also un-dismisses all) or off. */
export function setCoachTipsEnabled(on: boolean): void {
  const s = loadCoach();
  saveCoach({ ...s, enabled: on, dismissed: on ? [] : s.dismissed });
  window.dispatchEvent(new Event('oal:coach'));
}

export function coachTipsEnabled(): boolean {
  return coachActive(loadCoach());
}
