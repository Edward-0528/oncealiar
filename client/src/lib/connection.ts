/**
 * ConnectionKeeper — keeps a phone in the game through app switches, screen locks,
 * Wi-Fi ⇄ cellular hops and iOS Safari suspending the tab.
 *
 * Strategy
 * - socket.io reconnects forever with backoff capped at ~3s (configured in socketTransport).
 * - Every (re)connect resumes the stored session with `room:rejoin` BEFORE reporting
 *   `connected`, and waits for the first `state` after the ack, so the UI goes straight
 *   from "previous screen" to "current screen" — no Home flash, no lobby flash.
 * - Page lifecycle: hidden/pagehide/freeze → `presence('hidden')`;
 *   visible/pageshow/online/focus → `presence('visible')` + liveness check.
 * - Liveness check: a `net:ping` with a 2s ack timeout; no ack → drop the transport so the
 *   manager redials (the server's connection-state-recovery keeps our socket id + rooms).
 *   After a long time hidden we skip the ping and redial immediately.
 *
 * Kept free of socket.io + DOM specifics so it can be unit-tested with fakes.
 */
import type { ConnStatus } from './transport';
import type { Session } from './storage';

export interface SocketLike {
  readonly connected: boolean;
  on(event: string, fn: (...args: any[]) => void): unknown;
  emit(event: string, ...args: any[]): unknown;
  /** start connecting if idle (no-op when connected / already dialing) */
  connect(): void;
  /** close the underlying transport; the manager reconnects and the server can recover state */
  dropTransport(): void;
  /** abort any backoff wait and dial again right now */
  reconnectNow(): void;
}

export interface PageEnv {
  hidden(): boolean;
  online(): boolean;
  now(): number;
  listen(target: 'document' | 'window', event: string, fn: (e: Event) => void): () => void;
}

export interface ConnectionHooks {
  /** session to resume automatically on every (re)connect, or null */
  getSession(): Session | null;
  onStatus(status: ConnStatus): void;
  onSessionInvalid(code: string, error: string): void;
  /** a dropped connection came back and the session was resumed */
  onRejoined?(code: string, afterMs: number): void;
}

export const TIMINGS = {
  /** liveness ping ack timeout */
  pingAckMs: 2000,
  /** give up on a rejoin ack after this and redial */
  rejoinAckMs: 5000,
  /** after a rejoin ack, wait at most this long for the fresh `state` */
  stateWaitMs: 1500,
  /** hidden longer than this → assume the socket is dead and redial immediately on return */
  longHiddenMs: 30_000,
  /** don't hammer: min gap between liveness checks / forced redials */
  checkThrottleMs: 1000
};
export type Timings = typeof TIMINGS;

type Ack = (res: { ok: boolean; error?: string }) => void;

export function browserEnv(): PageEnv {
  return {
    hidden: () => typeof document !== 'undefined' && document.visibilityState === 'hidden',
    online: () => typeof navigator === 'undefined' || navigator.onLine !== false,
    now: () => Date.now(),
    listen(target, event, fn) {
      const t: EventTarget = target === 'document' ? document : window;
      t.addEventListener(event, fn);
      return () => t.removeEventListener(event, fn);
    }
  };
}

export class ConnectionKeeper {
  status: ConnStatus = 'connecting';
  private everReady = false;
  /** bumps on every connect/disconnect; stale async callbacks compare against it */
  private gen = 0;
  private awaitingState: { gen: number; code: string; timer: ReturnType<typeof setTimeout> } | null = null;
  private pingTimer: ReturnType<typeof setTimeout> | null = null;
  private lastCheckAt = -Infinity;
  private lastRedialAt = -Infinity;
  private hiddenSince: number | null = null;
  private droppedAt: number | null = null;
  private lastPresence: 'visible' | 'hidden' | null = null;
  private offs: (() => void)[] = [];
  private readonly t: Timings;

  constructor(
    private socket: SocketLike,
    private hooks: ConnectionHooks,
    private env: PageEnv = browserEnv(),
    timings: Partial<Timings> = {}
  ) {
    this.t = { ...TIMINGS, ...timings };
  }

  /** wire socket + page listeners; returns a cleanup function */
  start(): () => void {
    const s = this.socket;
    s.on('connect', () => this.onConnect());
    s.on('disconnect', (reason: string) => this.onDisconnect(reason));
    s.on('connect_error', () => this.setStatus(this.everReady ? 'reconnecting' : 'connecting'));

    const on = (target: 'document' | 'window', ev: string, fn: (e: Event) => void) => this.offs.push(this.env.listen(target, ev, fn));
    on('document', 'visibilitychange', () => (this.env.hidden() ? this.onHidden() : this.onVisible()));
    on('window', 'pagehide', () => this.onHidden());
    on('document', 'freeze', () => this.onHidden());
    on('window', 'pageshow', (e) => {
      // restored from the back/forward cache: the old socket is certainly gone
      if ((e as PageTransitionEvent).persisted) this.redial(true);
      else this.onVisible();
    });
    on('document', 'resume', () => this.onVisible());
    on('window', 'online', () => this.onVisible());
    on('window', 'focus', () => this.onVisible());
    if (this.env.hidden()) this.hiddenSince = this.env.now();
    if (s.connected) this.onConnect();
    return () => {
      this.offs.forEach((off) => off());
      this.offs = [];
    };
  }

  /** call after delivering every `state` event to subscribers */
  notifyState(): void {
    const w = this.awaitingState;
    if (w && w.gen === this.gen) {
      clearTimeout(w.timer);
      this.ready(w.gen, w.code);
    }
  }

  /** verify the link is alive right now; redial if not */
  check(): void {
    const now = this.env.now();
    if (!this.socket.connected) {
      this.redial(false);
      return;
    }
    if (this.status !== 'connected' || this.pingTimer) return; // rejoin in progress / already checking
    if (now - this.lastCheckAt < this.t.checkThrottleMs) return;
    this.lastCheckAt = now;
    const g = this.gen;
    this.pingTimer = setTimeout(() => {
      this.pingTimer = null;
      if (g === this.gen) this.socket.dropTransport();
    }, this.t.pingAckMs);
    this.socket.emit('net:ping', () => {
      if (this.pingTimer) clearTimeout(this.pingTimer);
      this.pingTimer = null;
    });
  }

  // ───────────────────────── socket events ─────────────────────────

  private onConnect(): void {
    const g = ++this.gen;
    this.clearPending();
    const session = this.hooks.getSession();
    if (!session) {
      this.ready(g, null);
      return;
    }
    let settled = false;
    const timer = setTimeout(() => {
      if (settled || g !== this.gen) return;
      settled = true;
      this.socket.dropTransport(); // server unresponsive: redial
    }, this.t.rejoinAckMs);
    const ack: Ack = (res) => {
      if (settled || g !== this.gen) return;
      settled = true;
      clearTimeout(timer);
      if (!res || !res.ok) {
        this.hooks.onSessionInvalid(session.code, res?.error ?? 'Session expired');
        this.ready(g, null);
        return;
      }
      // The server acks first and pushes `state` right after: wait for it so the UI never flashes.
      this.awaitingState = { gen: g, code: session.code, timer: setTimeout(() => this.ready(g, session.code), this.t.stateWaitMs) };
    };
    this.socket.emit('room:rejoin', session.code, session.token, ack);
  }

  private onDisconnect(reason: string): void {
    this.gen++;
    this.clearPending();
    if (this.droppedAt === null) this.droppedAt = this.env.now();
    this.lastPresence = null;
    this.setStatus(this.everReady ? 'reconnecting' : 'connecting');
    // the server closed us on purpose (e.g. restart): socket.io won't retry on its own
    if (reason === 'io server disconnect') this.socket.connect();
  }

  private ready(g: number, rejoinedCode: string | null): void {
    if (g !== this.gen || !this.socket.connected) return;
    this.awaitingState = null;
    const droppedAt = this.droppedAt;
    this.droppedAt = null;
    this.everReady = true;
    this.setStatus('connected');
    if (rejoinedCode && droppedAt !== null) this.hooks.onRejoined?.(rejoinedCode, this.env.now() - droppedAt);
    this.sendPresence(true);
  }

  // ───────────────────────── page lifecycle ─────────────────────────

  private onHidden(): void {
    if (this.hiddenSince === null) this.hiddenSince = this.env.now();
    this.sendPresence(false, 'hidden');
  }

  private onVisible(): void {
    if (this.env.hidden()) return; // e.g. `focus` on a background window
    const hiddenFor = this.hiddenSince === null ? 0 : this.env.now() - this.hiddenSince;
    this.hiddenSince = null;
    if (!this.env.online()) return; // `online` will call us again
    if (this.socket.connected && hiddenFor > this.t.longHiddenMs) {
      // after a long background stint the socket is almost certainly a zombie: don't wait for a ping
      this.redial(true);
      return;
    }
    this.sendPresence(false, 'visible');
    this.check();
  }

  // ───────────────────────── helpers ─────────────────────────

  private redial(force: boolean): void {
    const now = this.env.now();
    if (!force && now - this.lastRedialAt < this.t.checkThrottleMs) return;
    this.lastRedialAt = now;
    if (this.socket.connected) this.socket.dropTransport();
    else this.socket.reconnectNow();
  }

  private sendPresence(force: boolean, state: 'visible' | 'hidden' = this.env.hidden() ? 'hidden' : 'visible'): void {
    if (!this.socket.connected || this.status !== 'connected') return;
    if (!force && state === this.lastPresence) return;
    this.lastPresence = state;
    this.socket.emit('presence', state);
  }

  private clearPending(): void {
    if (this.awaitingState) clearTimeout(this.awaitingState.timer);
    this.awaitingState = null;
    if (this.pingTimer) clearTimeout(this.pingTimer);
    this.pingTimer = null;
  }

  private setStatus(s: ConnStatus): void {
    if (s === this.status) return;
    this.status = s;
    this.hooks.onStatus(s);
  }
}
