import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { Server } from 'socket.io';
import { AWAY_GRACE_MS, type ClientToServerEvents, type ServerToClientEvents, type WordPack } from '@oncealiar/shared';
import { RoomManager, type RoomManagerOptions, type SocketData } from './rooms.js';
import { normalizeCode } from './validation.js';

export interface AppOptions extends Omit<RoomManagerOptions, 'packs'> {
  packs: WordPack[];
  /** absolute path to the built client; served with SPA fallback when set and present */
  clientDist?: string | null;
  /**
   * Origins allowed to call this server cross-origin (the static client site in a split deploy).
   * Entries may contain `*` wildcards (`https://oncealiar-*.onrender.com`). Empty/undefined = allow any.
   */
  clientOrigins?: string[];
  /**
   * Dev aid: pretend to be a sleeping free-tier instance for this long after boot —
   * `/healthz` is held until "awake" and Socket.IO handshakes are refused, like a cold start.
   */
  coldStartMs?: number;
}

/** Parse `CLIENT_ORIGIN` (comma-separated, `*` wildcards allowed). */
export function parseOrigins(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean);
}

/** Build an origin check: true when allowed. An empty list allows everything (dev / single-service). */
export function originMatcher(origins: string[] | undefined): (origin: string | undefined) => boolean {
  const list = origins ?? [];
  if (list.length === 0 || list.includes('*')) return () => true;
  const patterns = list.map((o) => new RegExp('^' + o.split('*').map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[a-z0-9-]*') + '$', 'i'));
  // no Origin header = same-origin navigation, curl, health checks: always fine
  return (origin) => !origin || patterns.some((re) => re.test(origin));
}

/**
 * Socket.IO tuning for phones:
 * - heartbeat every 10s, 10s to answer → a vanished phone is noticed in ≤20s
 *   (players who merely switch apps report `presence('hidden')` instantly anyway);
 * - connection-state recovery keeps a dropped socket's id, rooms and data (and replays
 *   missed packets) for longer than the presence grace period, so a phone that comes back
 *   from the lock screen resumes seamlessly; the client also always sends `room:rejoin`.
 */
export const SOCKET_SERVER_OPTIONS = {
  pingInterval: 10_000,
  pingTimeout: 10_000,
  connectionStateRecovery: {
    maxDisconnectionDuration: AWAY_GRACE_MS + 30_000,
    skipMiddlewares: true
  },
  // a slow cellular handshake shouldn't fail the upgrade
  upgradeTimeout: 15_000
} as const;

/** SPA routes: `/`, `/ABCD` (room deep link), anything with `?room=` / `?tv=` */
const ROOM_PATH = /^\/[A-Za-z]{4}\/?$/;

export function createApp(opts: AppOptions) {
  const app = express();
  app.disable('x-powered-by');
  const allowOrigin = originMatcher(opts.clientOrigins);
  const corsOrigin = (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => cb(null, allowOrigin(origin));
  app.use(cors({ origin: corsOrigin }));

  let awakeAt = Date.now() + Math.max(0, opts.coldStartMs ?? 0);
  const asleepFor = () => Math.max(0, awakeAt - Date.now());
  if (opts.coldStartMs) {
    // review aid (only with SIMULATE_COLD_START_MS): "nap" again without losing rooms, so the
    // invite-link path (new visitor → wake screen → lobby) can be tried against a live room.
    app.get('/__nap', (req, res) => {
      const asked = Number(req.query.ms);
      const ms = Math.min(Math.max(req.query.ms !== undefined && Number.isFinite(asked) ? asked : opts.coldStartMs!, 0), 10 * 60_000);
      awakeAt = Date.now() + ms;
      res.setHeader('Cache-Control', 'no-store');
      res.json({ ok: true, asleepForMs: ms });
    });
  }
  app.get('/healthz', (_req, res) => {
    const reply = () => {
      if (res.writableEnded || res.destroyed) return;
      // never cached by the browser, the service worker or a CDN: it's the wake-up probe
      res.setHeader('Cache-Control', 'no-store');
      res.json({ ok: true, rooms: manager.rooms.size, uptime: Math.round(process.uptime()) });
    };
    // simulated cold start: hold the request like Render's proxy does while the instance boots
    const wait = asleepFor();
    if (wait > 0) setTimeout(reply, wait).unref();
    else reply();
  });

  const clientDist = opts.clientDist;
  if (clientDist && fs.existsSync(path.join(clientDist, 'index.html'))) {
    const indexHtml = path.join(clientDist, 'index.html');
    const sendIndex = (_req: express.Request, res: express.Response) => {
      // always revalidate the shell so a deploy is picked up on the next load
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(indexHtml);
    };
    app.get('/', sendIndex);
    app.get(ROOM_PATH, sendIndex);
    app.use(
      express.static(clientDist, {
        index: false,
        setHeaders(res, filePath) {
          const rel = path.relative(clientDist, filePath).split(path.sep).join('/');
          if (rel.startsWith('assets/')) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          else if (rel === 'sw.js' || rel.endsWith('.webmanifest')) res.setHeader('Cache-Control', 'no-cache');
          else res.setHeader('Cache-Control', 'public, max-age=3600');
        }
      })
    );
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/socket.io')) return next();
      // missing static files (old hashed assets, typos with an extension) are real 404s
      if (path.extname(req.path)) return res.status(404).end();
      sendIndex(req, res);
    });
  } else {
    app.get('/', (_req, res) => {
      res.send('Once a Liar server running');
    });
  }

  const httpServer = http.createServer(app);
  const io = new Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>(httpServer, {
    cors: { origin: corsOrigin },
    // simulated cold start: refuse handshakes until "awake" (the client keeps retrying)
    allowRequest: (_req, cb) => cb(null, asleepFor() === 0),
    ...SOCKET_SERVER_OPTIONS
  });
  const manager = new RoomManager(io, opts);

  // Transport-level helpers that aren't game actions (see report: proposed contract additions).
  io.on('connection', (socket) => {
    const raw = socket as unknown as { on: (ev: string, fn: (...a: unknown[]) => void) => void };
    // liveness probe used by clients after resuming from background
    raw.on('net:ping', (ack) => {
      if (typeof ack === 'function') ack({ ok: true, t: Date.now() });
    });
    // read-only public lobby snapshot: codename de-dupe before joining + the TV view
    raw.on('room:peek', (rawCode, ack) => {
      if (typeof ack !== 'function') return;
      const code = normalizeCode(rawCode);
      const room = code ? manager.rooms.get(code) : undefined;
      if (!room) return ack({ ok: false, error: 'Room not found' });
      const now = Date.now();
      const s = room.game.publicState(now);
      ack({
        ok: true,
        room: {
          code: s.code,
          phase: s.round.phase,
          round: s.round.number,
          phaseEndsAt: s.round.phaseEndsAt,
          serverNow: now,
          maxPlayers: s.settings.maxPlayers,
          premium: !!s.premium,
          settings: { roundsPerGame: s.settings.roundsPerGame, clueMode: s.settings.clueMode },
          players: s.players.map((p) => ({
            id: p.id,
            name: p.name,
            avatar: p.avatar,
            color: p.color,
            isHost: p.isHost,
            score: p.score,
            connected: p.connected,
            presence: p.presence ?? (p.connected ? 'online' : 'offline')
          }))
        }
      });
    });
  });

  const close = () =>
    new Promise<void>((resolve) => {
      manager.close();
      io.close(() => resolve());
    });

  return { app, httpServer, io, manager, close };
}
