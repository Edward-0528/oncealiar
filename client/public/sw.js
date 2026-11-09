/* Once a Liar — minimal app-shell service worker.
 * - Navigations (index.html, /ABCD deep links): network-first, cached shell as offline fallback,
 *   so a deploy is picked up immediately but a flaky reload is still instant.
 * - Hashed build assets (/assets/*), icons, fonts: cache-first (immutable).
 * - Never touches Socket.IO traffic, the /healthz wake-up probe, or anything cross-origin
 *   except Google Fonts — in a split deploy the game server is cross-origin and must always
 *   hit the network (a cached "healthy" answer would hide a sleeping server).
 */
const VERSION = 'oal-v2';
const SHELL = 'oal-shell-' + VERSION;
const ASSETS = 'oal-assets-' + VERSION;
const PRECACHE = ['/', '/manifest.webmanifest', '/icon.svg', '/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL && k !== ASSETS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!sameOrigin && !isFont) return; // game server (split deploy), analytics, anything else: network only
  if (url.pathname.startsWith('/socket.io') || url.pathname === '/healthz') return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(SHELL).then((c) => c.put('/', copy));
          }
          return res;
        })
        .catch(() => caches.match('/').then((r) => r || Response.error()))
    );
    return;
  }

  const cacheable = (sameOrigin && (url.pathname.startsWith('/assets/') || /\.(png|svg|webmanifest|woff2?)$/.test(url.pathname))) || isFont;
  if (!cacheable) return;

  event.respondWith(
    caches.open(ASSETS).then((cache) =>
      cache.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
            return res;
          })
      )
    )
  );
});

// tapping a "your turn" notification brings the game tab back
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const tab = list.find((c) => 'focus' in c);
      if (tab) return tab.focus();
      return self.clients.openWindow('/');
    })
  );
});
