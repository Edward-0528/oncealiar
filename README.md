# Once A Liar

A real-time social-deduction party game for 3–12 players. Everyone gets the secret word — except the Spy. Give a clue, discuss, vote, and try to catch the liar before they guess the word.

**▶ Play it:** [oncealiar.onrender.com](https://oncealiar.onrender.com) — no app or account needed; friends join from their phones with a room code or QR code.

![Once A Liar](client/public/og-image.png)

## Highlights

- **Real-time multiplayer** — an Express + Socket.IO server runs every room; the client is a React + Vite PWA
- **Shared types** — a TypeScript monorepo (`client`, `server`, `shared`) so game events and rules are typed end to end; every rule constant lives in `shared/src/rules.ts`
- **Join by room code or QR**, plus a **TV display mode** (`?tv=`) for putting the game on a big screen
- **Built for real phones** — reconnect handling so players who switch apps don't fall out of the round, and a friendly "waking up" screen while the free-tier server cold-starts
- **Tested** — 28 Vitest + Testing Library test files covering the game engine, sockets, accounts, deploy config and UI
- **Bot players** for solo testing (`npm run bots -- ABCD 5` joins 5 bots to room ABCD)
- Optional Supabase accounts on the server; deployable to Render with a Blueprint (`render.yaml`) or Docker

## Tech Stack

`TypeScript` `React 18` `Vite` `Node.js` `Express` `Socket.IO` `Vitest` `Testing Library` `Supabase` `Render`

## Project Structure

- `client` – React front-end (PWA)
- `server` – Express + Socket.IO game server and game engine (`server/src/engine`)
- `shared` – types and rules shared between client and server
- `docs` – gameplay design notes and deploy guide

## Quick Start

```bash
npm install
npm run dev        # client + server together → http://localhost:5173
```

Single-process production build (Express serves the client and the game server on :3001):

```bash
npm run build && npm start
```

### Scripts

- `npm run dev` – run client and server in development
- `npm run build` – build all packages
- `npm start` – production server (serves `client/dist` when present)
- `npm test` / `npm run typecheck`

## Deploy (Render, free)

`render.yaml` is a Render Blueprint: a free static site for the client plus a free web service for the Socket.IO server.

1. Render dashboard → **New + → Blueprint** → pick this repo → **Apply**.
2. Share the static site URL.

Full guide (env vars, CORS, free-plan limits, simulating a cold start locally): [docs/deploy-render.md](docs/deploy-render.md).

## How a Round Works

1. Players join the lobby and pick a name and avatar
2. The host starts a round; the server secretly picks the Spy and deals the word to everyone else
3. Players take turns giving clues, then discuss
4. Everyone votes on who the Spy is
5. If the Spy is caught, they get one guess at the word — guess right and the Spy still wins
6. Scores update and the next round begins

Design notes and balancing decisions: [docs/gameplay.md](docs/gameplay.md).

---

Built by [Edward Granados](https://edwardgranados.app).
