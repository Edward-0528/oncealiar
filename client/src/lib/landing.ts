/**
 * Who sees the marketing landing page instead of the app?
 *
 * Strangers who open the bare domain. Never: invite links (/ABCD, ?room=, ?tv=), the app
 * itself (/start), installed home-screen apps, dev/mock screens, or anyone who already plays
 * here (a saved game, a name, or a hosted/joined game).
 */
export const APP_PATH = '/start';

/** query params that mean "this URL is for the app" */
const APP_PARAMS = ['room', 'tv', 'code', 'mock', 'wake', 'player', 'demo', 'source'];

export interface LandingContext {
  pathname: string;
  search: string;
  /** a remembered game session exists */
  hasSession: boolean;
  /** a saved profile name exists */
  hasName: boolean;
  /** this browser has hosted or joined a game before */
  hasPlayed: boolean;
  /** running as an installed app (display-mode: standalone / iOS standalone) */
  standalone: boolean;
}

export function shouldShowLanding(c: LandingContext): boolean {
  const params = new URLSearchParams(c.search);
  if (params.get('landing') === '1') return true; // preview link for the team
  if (c.pathname !== '/' && c.pathname !== '/index.html') return false;
  if (APP_PARAMS.some((k) => params.has(k))) return false;
  if (c.standalone || c.hasSession || c.hasName || c.hasPlayed) return false;
  return true;
}
