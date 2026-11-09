# Deploying Once a Liar on Render (free plan)

The repo ships a Render **Blueprint** (`render.yaml` at the root) that creates two services:

| Service | Render type | What it does | Free-plan behaviour |
| --- | --- | --- | --- |
| `oncealiar` | Static site | Serves the built React client (`client/dist`) from Render's CDN, with an SPA rewrite so `/ABCD` invite links and `?tv=ABCD` work. | Free, **never sleeps**. |
| `oncealiar-server` | Web service (Node) | The Express + Socket.IO game server (`npm run build:server`, `npm start`, health check `/healthz`). | Free, **sleeps after ~15 min with no traffic**; the next visit waits ~30–60 s while it boots. |

Because the page itself is on the always-on static site, people get the app instantly even when the
server is asleep. The app then shows a "STOP THE PRESSES! The newsroom is waking up" screen with a
progress bar, fun tips, How to play and profile editing, and carries on by itself (invite links go
straight into the lobby) as soon as the server answers.

## 1. Deploy (first time)

1. Push the branch you want to deploy (usually `main`) to GitHub.
2. Go to <https://dashboard.render.com> and sign in (GitHub login is easiest).
3. Click **New +** (top right) → **Blueprint**.
4. **Connect** your GitHub account if asked, then pick the **Once a liar** repository.
5. Render reads `render.yaml` and lists the two services: `oncealiar-server` (web service, Free) and
   `oncealiar` (static site). Give the Blueprint a name (e.g. `oncealiar`) and pick the branch.
6. It asks for values marked `sync: false`: `PREMIUM_CODES` is optional — leave it empty, or enter
   comma-separated codes that unlock premium rooms.
7. Click **Apply**. Render builds both services (first build takes a few minutes).
8. When both show **Live**, open the static site URL (Dashboard → `oncealiar` → the
   `https://oncealiar….onrender.com` link at the top). That's the link to share.

Every push to the branch redeploys both services automatically (`autoDeployTrigger: commit`).

## 2. Check the URLs (one-time)

Render names services after their `name` when that subdomain is free; otherwise it adds a suffix
(e.g. `oncealiar-x1y2.onrender.com`). Everything is wired so either case works without edits:

- **Client → server**: the static site's build gets `VITE_SERVER_HOST` from
  `fromService: { name: oncealiar-server, property: host }`. Render provides the server's
  *internal* hostname (like `oncealiar-server-x1y2`); the client turns a dot-less host into
  `https://<host>.onrender.com`, which is the server's public URL.
- **Server → client (CORS)**: `CLIENT_ORIGIN` defaults to
  `https://oncealiar.onrender.com,https://oncealiar-*.onrender.com`, so both the plain and suffixed
  static URLs are allowed. (Render can't inject a *static site's* URL into another service, which is
  why this is a pattern rather than a `fromService` reference.)

Quick check after the first deploy:

- Open `https://<server-url>/healthz` → `{"ok":true,...}`.
- Open the static site and host a game. If the wake-up screen never finishes, open the browser
  console: a CORS error means `CLIENT_ORIGIN` doesn't match your static URL (fix below); a DNS error
  means the server URL is off → set `VITE_SERVER_URL` (below).

## 3. Environment variables

**`oncealiar-server` (web service)**

| Key | Default | Purpose |
| --- | --- | --- |
| `NODE_VERSION` | `22` | Node runtime Render installs. |
| `CLIENT_ORIGIN` | `https://oncealiar.onrender.com,https://oncealiar-*.onrender.com` | Origins allowed to call the server (CORS for `/healthz` and Socket.IO). Comma-separated, `*` matches one subdomain label. Unset = allow any origin. |
| `PREMIUM_CODES` | empty | Optional comma-separated premium unlock codes. |
| `SIMULATE_COLD_START_MS` | unset | Dev only: pretend to be asleep for this long after boot. Don't set in production. |
| `PORT` | set by Render | The server listens on it automatically. |

**`oncealiar` (static site, build-time; changing them needs a redeploy)**

| Key | Default | Purpose |
| --- | --- | --- |
| `NODE_VERSION` | `22` | Node used for the build. |
| `VITE_SERVER_HOST` | from `oncealiar-server` (`host`) | Where the socket and the wake-up probe connect. |
| `VITE_SERVER_URL` | unset | Optional full URL override, e.g. `https://api.example.com`. Wins over `VITE_SERVER_HOST`. |

To change one: Dashboard → service → **Environment** → edit → **Save, rebuild and deploy** (static
site) or **Save changes** (web service restarts).

**If your static site URL doesn't match the pattern** (e.g. you renamed the service): Dashboard →
`oncealiar-server` → Environment → set `CLIENT_ORIGIN` to your exact static URL (no trailing
slash) → Save. Note: values set in the dashboard are overwritten by `render.yaml` on the next
Blueprint sync, so for a permanent change edit `render.yaml` and push.

## 4. Free-plan limits (what to expect)

- **Sleep**: the web service spins down after ~15 minutes without traffic. An active game keeps it
  awake (sockets count as traffic). The first visitor after a nap waits ~30–60 s; the app explains
  this and continues on its own. After ~90 s it switches to a calm "taking longer than usual"
  message with a Retry button and keeps trying.
- **750 free instance hours per workspace per month** for web services. One always-busy service
  uses ~720 h, so a single free server fits; a second free web service in the same workspace would
  share the pool. Static sites don't use instance hours.
- **Rooms live in memory**: a sleep, restart or deploy ends every game in progress (players see the
  Home screen and can host again). Avoid deploying during a party.
- Free bandwidth and build-minute allowances apply per workspace; a party game uses very little.
- Upgrading `oncealiar-server` to a paid instance (Dashboard → service → Settings → Instance type)
  removes sleep entirely; nothing else changes.

## 5. Custom domain (later)

1. Dashboard → `oncealiar` (static site) → **Settings** → **Custom Domains** → **Add**, e.g.
   `play.example.com`, and create the DNS record Render shows (CNAME to the `onrender.com` host).
   HTTPS is issued automatically. Invite/QR/TV links use whatever domain the page is opened on.
2. Add the domain to the server's allowed origins: in `render.yaml` change `CLIENT_ORIGIN` to
   `https://play.example.com,https://oncealiar.onrender.com,https://oncealiar-*.onrender.com`
   and push.
3. Optional: give the server its own domain (Dashboard → `oncealiar-server` → Settings → Custom
   Domains, e.g. `api.example.com`), then add `VITE_SERVER_URL=https://api.example.com` to the
   static site's envVars in `render.yaml` and push (the static site rebuilds).

## 6. Testing the wake-up screen locally

- **Real path, server-side** (recommended): build and run the single-service server with a fake
  cold start — `/healthz` is held and socket handshakes are refused until it "wakes":

  ```bash
  npm run build
  SIMULATE_COLD_START_MS=20000 npm start     # open http://localhost:3001 (or /ABCD for the invite path)
  ```

  or in dev: `SIMULATE_COLD_START_MS=20000 npm run dev:server` + `npm run dev:client`.
- **Client-only, dev server** (`npm run dev`, http://localhost:5173):
  - `?wake=slow` (optionally `&wakeMs=8000`) — the probe can't succeed for 15 s.
  - `?wake=never&wakeSlowMs=10000` — never wakes; see the "taking longer than usual" state after 10 s.
  - `?mock=wake` — no server needed at all (mock transport + simulated wake-up).

## Other ways to run

- `npm run dev` — Vite on :5173 proxies `/socket.io` and `/healthz` to the server on :3001 (same origin).
- `npm run build && npm start` — one Node process serves both the client and the game server on
  :3001 (also what the `Dockerfile` does). No `VITE_SERVER_*` needed.
