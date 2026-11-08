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
  app.use(cors());
  app.get('/healthz', (_req, res) => {
    res.json({ ok: true, rooms: manager.rooms.size, uptime: Math.round(process.uptime()) });
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
    cors: { origin: '*' },
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
