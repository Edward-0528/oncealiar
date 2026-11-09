import { io, type ManagerOptions, type Socket, type SocketOptions } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@oncealiar/shared';
import type { ConnStatus, RoomPeek, Transport, TransportEvent } from './transport';
import { ConnectionKeeper, type SocketLike } from './connection';
import { loadSession, type Session } from './storage';
import { roomFromLocation } from './roomCode';
import { SERVER_ORIGIN } from './serverUrl';

/** Socket.IO manager tuning for phones on flaky networks. */
export const SOCKET_OPTIONS: Partial<ManagerOptions & SocketOptions> = {
  autoConnect: true,
  // WebSocket first (fast, no sticky-session needs); fall back to long-polling if a network blocks it.
  transports: ['websocket', 'polling'],
  tryAllTransports: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 250,
  reconnectionDelayMax: 3000,
  randomizationFactor: 0.25,
  timeout: 8000
};

/**
 * Which stored session (if any) to resume automatically. Not when following an invite
 * to a different room, and never on the TV view.
 */
export function sessionToResume(loc: Pick<Location, 'pathname' | 'search'> = window.location): Session | null {
  const session = loadSession();
  if (!session) return null;
  const { code, tv } = roomFromLocation(loc);
  if (tv) return null;
  if (code && code !== session.code) return null;
  return session;
}

export function createSocketTransport(): Transport {
  // same origin unless the client was built for a split deploy (see serverUrl.ts)
  const socket: Socket<ServerToClientEvents, ClientToServerEvents> = SERVER_ORIGIN ? io(SERVER_ORIGIN, SOCKET_OPTIONS) : io(SOCKET_OPTIONS);
  const raw = socket as unknown as {
    emit: (ev: string, ...a: unknown[]) => void;
    on: (ev: string, fn: (...a: any[]) => void) => void;
  };
  const subs = new Set<(e: TransportEvent) => void>();
  const send = (e: TransportEvent) => subs.forEach((fn) => fn(e));
  let lastRedial = 0;

  const like: SocketLike = {
    get connected() {
      return socket.connected;
    },
    on: (ev, fn) => raw.on(ev, fn),
    emit: (ev, ...a) => raw.emit(ev, ...a),
    connect: () => {
      socket.connect();
    },
    dropTransport: () => {
      // closing the engine (not the socket) counts as a transport drop: auto-reconnect + server-side recovery
      const engine = socket.io.engine as { close?: () => void } | undefined;
      if (engine?.close) engine.close();
      else socket.connect();
    },
    reconnectNow: () => {
      const now = Date.now();
      if (now - lastRedial < 800) return;
      lastRedial = now;
      // tearing down the idle manager resets the backoff; connect() dials immediately
      socket.disconnect();
      socket.connect();
    }
  };

  const keeper = new ConnectionKeeper(like, {
    getSession: () => sessionToResume(),
    onStatus: (status: ConnStatus) => send({ type: 'conn', status }),
    onSessionInvalid: (code, error) => send({ type: 'session-invalid', code, error }),
    onRejoined: (code, afterMs) => send({ type: 'rejoined', code, afterMs })
  });

  socket.on('state', (state, you) => {
    send({ type: 'state', state, you });
    keeper.notifyState();
  });
  socket.on('reaction', (reaction) => send({ type: 'reaction', reaction }));
  socket.on('toast', (message) => send({ type: 'toast', message }));
  socket.on('kicked', () => send({ type: 'kicked' }));
  socket.on('room:ended', () => send({ type: 'room-ended' }));
  keeper.start();

  return {
    kind: 'live',
    emit(event, ...args) {
      // socket.io's generic emit typing can't follow the mapped tuple; the public signature is fully typed.
      raw.emit(event, ...args);
    },
    subscribe(fn) {
      subs.add(fn);
      return () => {
        subs.delete(fn);
      };
    },
    status: () => keeper.status,
    willRejoin: () => !!sessionToResume(),
    check: () => keeper.check(),
    peek: (code) =>
      new Promise<RoomPeek | null>((resolve) => {
        let done = false;
        const finish = (v: RoomPeek | null) => {
          if (done) return;
          done = true;
          clearTimeout(timer);
          resolve(v);
        };
        const timer = setTimeout(() => finish(null), 2500);
        raw.emit('room:peek', code, (res: { ok: boolean; room?: RoomPeek }) => finish(res?.ok && res.room ? res.room : null));
      })
  };
}
