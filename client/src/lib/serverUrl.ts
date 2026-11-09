/**
 * Where the game server lives.
 *
 * - Same origin (default): `npm run dev` (Vite proxies /socket.io + /healthz) and the
 *   single-service `npm start` deploy, where Express also serves the client.
 * - Split deploy (Render static site + Render web service): the client is built with
 *   `VITE_SERVER_URL` (a full URL, wins) or `VITE_SERVER_HOST` (a bare host). Render's
 *   Blueprint `fromService … property: host` hands us the service's *internal* hostname
 *   (e.g. `oncealiar-server` or `oncealiar-server-x1y2`), whose public twin is
 *   `<that>.onrender.com` — so a dot-less host gets `.onrender.com` appended.
 *
 * Invite / QR / TV links never use this: they're built from `window.location.origin` (the client).
 */
export function resolveServerOrigin(url: string | undefined, host: string | undefined): string {
  const full = url?.trim();
  if (full) return full.replace(/\/+$/, '');
  let h = host?.trim().replace(/\/+$/, '');
  if (!h) return '';
  if (/^https?:\/\//i.test(h)) return h;
  const local = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(h);
  if (!local && !h.split(':')[0].includes('.')) h = `${h}.onrender.com`;
  return `${local ? 'http' : 'https'}://${h}`;
}

/** '' = same origin as the page */
export const SERVER_ORIGIN = resolveServerOrigin(import.meta.env.VITE_SERVER_URL, import.meta.env.VITE_SERVER_HOST);

export const healthUrl = (origin = SERVER_ORIGIN) => `${origin}/healthz`;
