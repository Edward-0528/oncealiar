/** localStorage wrapper that never throws (private mode, blocked storage). */

/**
 * Optional storage namespace so two tabs in the same browser can be two different
 * players while testing: open `?player=2` in the second tab. Persisted per tab in
 * sessionStorage so it survives our own URL rewrites.
 */
function detectNamespace(): string {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('player');
    if (fromUrl && /^[a-z0-9]{1,8}$/i.test(fromUrl)) {
      sessionStorage.setItem('oal:ns', fromUrl);
      return fromUrl;
    }
    return sessionStorage.getItem('oal:ns') ?? '';
  } catch {
    return '';
  }
}

export const STORAGE_NS = typeof window !== 'undefined' ? detectNamespace() : '';
const P = STORAGE_NS ? `oal:${STORAGE_NS}:` : 'oal:';

export const KEYS = {
  profile: `${P}profile`,
  session: `${P}session`,
  muted: `${P}muted`,
  theme: `${P}theme`,
  recent: `${P}recent`,
  stats: `${P}stats`,
  flags: `${P}flags`
} as const;

export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function saveJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function removeKey(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

// ───────────────────────── session ─────────────────────────

export interface Session {
  code: string;
  token: string;
  /** epoch ms of the last state we received for this session */
  at?: number;
}
/** Sessions older than this are not offered for rejoin (rooms die when empty). */
export const SESSION_MAX_AGE_MS = 6 * 60 * 60_000;

export const loadSession = (): Session | null => {
  const s = loadJSON<Session | null>(KEYS.session, null);
  if (!s || typeof s.code !== 'string' || typeof s.token !== 'string') return null;
  if (s.at && Date.now() - s.at > SESSION_MAX_AGE_MS) return null;
  return s;
};
export const saveSession = (s: Session) => saveJSON(KEYS.session, { ...s, at: s.at ?? Date.now() });
export const clearSession = () => removeKey(KEYS.session);

// ───────────────────────── recent rooms ─────────────────────────

export interface RecentRoom {
  code: string;
  token: string;
  at: number;
  /** name you played under */
  name?: string;
}
const RECENT_MAX = 4;
const RECENT_MAX_AGE_MS = 12 * 60 * 60_000;

export function loadRecent(): RecentRoom[] {
  const list = loadJSON<RecentRoom[]>(KEYS.recent, []);
  if (!Array.isArray(list)) return [];
  const now = Date.now();
  return list.filter((r) => r && typeof r.code === 'string' && now - r.at < RECENT_MAX_AGE_MS).slice(0, RECENT_MAX);
}

export function rememberRoom(r: RecentRoom): void {
  const list = loadRecent().filter((x) => x.code !== r.code);
  saveJSON(KEYS.recent, [r, ...list].slice(0, RECENT_MAX));
}

export function forgetRoom(code: string): void {
  saveJSON(
    KEYS.recent,
    loadRecent().filter((x) => x.code !== code)
  );
}

// ───────────────────────── stats + one-time flags ─────────────────────────

export interface Stats {
  hosted: number;
  joined: number;
  visits: number;
}
export const loadStats = (): Stats => ({ hosted: 0, joined: 0, visits: 0, ...loadJSON<Partial<Stats>>(KEYS.stats, {}) });
export function bumpStat(k: keyof Stats): Stats {
  const s = loadStats();
  s[k] += 1;
  saveJSON(KEYS.stats, s);
  return s;
}

export type Flag = 'installHintDismissed' | 'notifyPromptDismissed' | 'lookHintSeen' | 'autoProfile';
export const getFlag = (f: Flag): boolean => !!loadJSON<Record<string, boolean>>(KEYS.flags, {})[f];
export function setFlag(f: Flag, v = true): void {
  const all = loadJSON<Record<string, boolean>>(KEYS.flags, {});
  all[f] = v;
  saveJSON(KEYS.flags, all);
}
