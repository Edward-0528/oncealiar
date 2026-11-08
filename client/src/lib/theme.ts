import { KEYS, loadJSON, saveJSON } from './storage';

export const DEFAULT_THEME = 'tabloid-spy';

export const THEMES = [
  { id: 'tabloid-spy', name: 'Tabloid Spy', blurb: 'Halftone, dossiers, rubber stamps', premium: false, meta: '#FFE14D', swatch: ['#FFE14D', '#111111', '#E8322A'] },
  { id: 'midnight', name: 'Midnight Masquerade', blurb: 'Ink-dark night, coral & gold', premium: true, meta: '#0E0B1F', swatch: ['#0E0B1F', '#FF5A4E', '#FFC857'] },
  { id: 'cozy', name: 'Cozy Game Night', blurb: 'Warm pastels & candlelight', premium: true, meta: '#FBEFE1', swatch: ['#FBEFE1', '#E2665A', '#E9A93A'] }
] as const;
export type ThemeId = (typeof THEMES)[number]['id'];

/** Old ids from earlier builds. */
const LEGACY: Record<string, ThemeId> = { tabloid: 'tabloid-spy' };

export function loadTheme(): ThemeId {
  const raw = loadJSON<string>(KEYS.theme, DEFAULT_THEME);
  const t = LEGACY[raw] ?? raw;
  return (THEMES.some((x) => x.id === t) ? t : DEFAULT_THEME) as ThemeId;
}

export function applyTheme(id: ThemeId, persist = true) {
  document.documentElement.dataset.theme = id;
  const meta = document.querySelector('meta[name="theme-color"]');
  const theme = THEMES.find((t) => t.id === id);
  if (meta && theme) meta.setAttribute('content', theme.meta);
  if (persist) saveJSON(KEYS.theme, id);
}
