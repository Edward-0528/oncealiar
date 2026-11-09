# Once A Liar

Real-time social deduction party game (3-18 players) built with React + Vite (client) and Node + Socket.IO (server).

## Monorepo Structure

- `client` – React front-end
- `server` – Express + Socket.IO game server
- `shared` – Shared TypeScript types between client & server

## Quick Start

Install dependencies (workspace root):

```bash
npm install
```

Run dev (client + server concurrently):

```bash
npm run dev
```

Visit: http://localhost:5173

Single-process production build (Express serves the client + game server on :3001):

```bash
npm run build && npm start
```

## Deploy (Render, free)

`render.yaml` is a Render Blueprint: a free **static site** for the client (CDN, never sleeps) plus a
free **web service** for the Socket.IO server (sleeps when idle; the app shows a friendly
"waking up" screen during the ~30–60 s cold start).

1. Push to GitHub.
2. Render dashboard → **New + → Blueprint** → pick this repo → **Apply**.
3. Share the static site URL (`https://oncealiar….onrender.com`).

Full guide (env vars, CORS, free-plan limits, custom domains, simulating a cold start locally):
[docs/deploy-render.md](docs/deploy-render.md).

## Game Core (MVP)
1. Lobby: players join, choose name + avatar (emoji for now)
2. Host starts a round
3. Server picks a spy + assigns secret word to others
4. Discussion timer (1.2 min * players) -> transition to voting
5. Voting: players cast accusation votes; when >= 60% pick same player or timer ends -> reveal
6. Spy reveals if they were accused; if spy guesses word exactly -> spy wins; else team wins
7. Scores updated, next round

## Planned Features
- QR code room join (room code short ID)
- Mobile-first UI improvements
- Avatar gallery + cosmetic store (freemium)
- Tiered rooms (free vs premium word packs / categories)
- Persistence (Redis or database) for stats
- Anti-cheat & reconnect handling

## Monetization Ideas
- Cosmetic avatar frames / themes
- Premium category & secret word packs
- Season pass with progressive cosmetics
- Ad-supported free tier (client-side rewarded ad for bonus XP)
- Private large lobbies > 8 players behind subscription

## Dev Notes
- Shared types consumed via TS project references
- Event names: `game:update`, `round`, `error`
- Round broadcasting hides secret word from spy

## Scripts
- `npm run dev` – run all dev services
- `npm run build` – builds all packages
- `npm run build:server` / `npm run build:client` – build one side (used by Render)
- `npm start` – production server (serves `client/dist` too when present)
- `npm test` / `npm run typecheck`

---

MIT Licensed (placeholder)
