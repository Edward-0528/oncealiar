/**
 * WakeMonitor — "is the game server awake yet?"
 *
 * The free Render web service sleeps after ~15 idle minutes; the first request then takes
 * ~30–60 s while the instance boots. We probe `GET /healthz` (no-store, short timeout) until
 * it answers, and expose a tiny state machine the UI renders:
 *
 *   probing ──(quietMs, still no answer)──▶ waking ──(slowMs)──▶ slow
 *      └────────────── healthy probe / socket connected ──────────────▶ ready
 *
 * - `probing`: first ~800 ms — show nothing extra (a warm server answers well within this).
 * - `waking`:  full-screen "the newsroom is waking up" with an elapsed-time progress bar.
 * - `slow`:    still nothing after ~90 s — calm "taking longer than usual" + Retry.
 * Probes keep running in the background in every non-ready phase.
 *
 * Free of React/DOM so it can be unit-tested with fake timers and a fake probe.
 */

export type WakePhase = 'probing' | 'waking' | 'slow' | 'ready';

export interface WakeSnapshot {
  phase: WakePhase;
  /** env.now() when monitoring started */
  startedAt: number;
  /** env.now() when the server answered (ready only) */
  readyAt: number | null;
  /** probes sent so far */
  attempts: number;
  /** a probe is in flight right now */
  checking: boolean;
}

export const WAKE_TIMINGS = {
  /** answer within this → no wake UI at all */
  quietMs: 800,
  /** gap between probe starts */
  retryMs: 2000,
  /** abort a probe after this (a sleeping Render service holds requests open) */
  timeoutMs: 2500,
  /** typical cold start; drives the progress bar */
  expectedMs: 50_000,
  /** switch to the "taking longer than usual" copy */
  slowMs: 90_000,
  /** never re-probe faster than this */
  minGapMs: 250
};
export type WakeTimings = typeof WAKE_TIMINGS;

/** resolve true when the server is healthy; may reject or resolve false otherwise */
export type Probe = (signal: AbortSignal) => Promise<boolean>;

export interface WakeEnv {
  now(): number;
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(id: unknown): void;
}

const defaultEnv: WakeEnv = {
  now: () => Date.now(),
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (id) => clearTimeout(id as ReturnType<typeof setTimeout>)
};

export interface WakeOptions extends Partial<WakeTimings> {
  /**
   * Dev simulation: the probe decides alone; a socket `connect` must not short-circuit it
   * (`?wake=slow`, `?mock=wake`).
   */
  simulated?: boolean;
}

export class WakeMonitor {
  readonly t: WakeTimings;
  readonly simulated: boolean;
  private snap: WakeSnapshot;
  private subs = new Set<(s: WakeSnapshot) => void>();
  private timers: { quiet?: unknown; slow?: unknown; retry?: unknown } = {};
  private running = false;
  /** bumps on retryNow/stop so stale probe results are ignored */
  private gen = 0;

  constructor(
    private probe: Probe,
    opts: WakeOptions = {},
    private env: WakeEnv = defaultEnv
  ) {
    const { simulated, ...timings } = opts;
    this.t = { ...WAKE_TIMINGS, ...timings };
    this.simulated = !!simulated;
    this.snap = { phase: 'probing', startedAt: env.now(), readyAt: null, attempts: 0, checking: false };
  }

  get snapshot(): WakeSnapshot {
    return this.snap;
  }

  /** ms since monitoring started (frozen once ready) */
  elapsed(): number {
    return (this.snap.readyAt ?? this.env.now()) - this.snap.startedAt;
  }

  /** begin probing right away (idempotent) */
  start(): this {
    if (this.running || this.snap.phase === 'ready') return this;
    this.running = true;
    this.set({ phase: 'probing', startedAt: this.env.now(), readyAt: null, attempts: 0, checking: false });
    this.timers.quiet = this.env.setTimeout(() => {
      if (this.snap.phase === 'probing') this.set({ phase: 'waking' });
    }, this.t.quietMs);
    this.timers.slow = this.env.setTimeout(() => {
      if (this.snap.phase !== 'ready') this.set({ phase: 'slow' });
    }, this.t.slowMs);
    void this.attempt();
    return this;
  }

  /** stop all timers/probes (component unmounted, banner no longer needed) */
  stop(): void {
    this.running = false;
    this.gen++;
    this.clearTimers();
    if (this.snap.checking) this.set({ checking: false });
  }

  /** the server proved it's up some other way (the socket connected) */
  markHealthy(): void {
    if (this.snap.phase === 'ready') return;
    this.running = false;
    this.gen++;
    this.clearTimers();
    this.set({ phase: 'ready', readyAt: this.env.now(), checking: false });
  }

  /** user tapped Retry: probe now instead of waiting for the next tick */
  retryNow(): void {
    if (this.snap.phase === 'ready') return;
    if (!this.running) {
      this.start();
      return;
    }
    if (this.snap.checking) return;
    if (this.timers.retry !== undefined) this.env.clearTimeout(this.timers.retry);
    this.timers.retry = undefined;
    void this.attempt();
  }

  subscribe(fn: (s: WakeSnapshot) => void): () => void {
    this.subs.add(fn);
    return () => {
      this.subs.delete(fn);
    };
  }

  // ─────────────────────────────────────────────────────────────

  private async attempt(): Promise<void> {
    if (!this.running || this.snap.phase === 'ready') return;
    const g = ++this.gen;
    const t0 = this.env.now();
    this.set({ attempts: this.snap.attempts + 1, checking: true });
    const ctl = new AbortController();
    let ok = false;
    let timer: unknown;
    try {
      const timeout = new Promise<boolean>((resolve) => {
        timer = this.env.setTimeout(() => {
          ctl.abort();
          resolve(false);
        }, this.t.timeoutMs);
      });
      ok = await Promise.race([this.probe(ctl.signal).then((v) => v === true), timeout]);
    } catch {
      ok = false;
    } finally {
      this.env.clearTimeout(timer);
    }
    // (re-read through a method: TS would keep the pre-await narrowing of `phase`)
    if (g !== this.gen || !this.running || this.isReady()) return;
    if (ok) {
      this.markHealthy();
      return;
    }
    this.set({ checking: false });
    const wait = Math.max(this.t.minGapMs, this.t.retryMs - (this.env.now() - t0));
    this.timers.retry = this.env.setTimeout(() => {
      this.timers.retry = undefined;
      void this.attempt();
    }, wait);
  }

  private isReady(): boolean {
    return this.snap.phase === 'ready';
  }

  private clearTimers(): void {
    for (const id of Object.values(this.timers)) if (id !== undefined) this.env.clearTimeout(id);
    this.timers = {};
  }

  private set(patch: Partial<WakeSnapshot>): void {
    this.snap = { ...this.snap, ...patch };
    this.subs.forEach((fn) => fn(this.snap));
  }
}

/**
 * Progress bar fill (0–1) from elapsed time: eases toward 90 % (≈80 % at the expected
 * cold-start time, never "done" while we're still waiting), snaps to 100 % once ready.
 */
export function wakeProgress(elapsedMs: number, ready: boolean, expectedMs = WAKE_TIMINGS.expectedMs): number {
  if (ready) return 1;
  if (!(elapsedMs > 0)) return 0;
  return 0.9 * (1 - Math.exp((-2.2 * elapsedMs) / expectedMs));
}

/** `fetch`-based probe for `GET {server}/healthz` — no-store, no custom headers (no CORS preflight). */
export function fetchProbe(url: string, fetchImpl: typeof fetch = (...a) => fetch(...a)): Probe {
  return async (signal) => {
    const res = await fetchImpl(url, { cache: 'no-store', signal, credentials: 'omit' });
    return res.ok;
  };
}

/** Dev simulation: wrap a probe so it can't succeed before `ms` have elapsed (Infinity = never). */
export function delayedProbe(inner: Probe, ms: number, now: () => number = () => Date.now()): Probe {
  const t0 = now();
  return async (signal) => {
    if (now() - t0 < ms) {
      // look like a held request that eventually times out
      await new Promise<void>((resolve) => signal.addEventListener('abort', () => resolve(), { once: true }));
      return false;
    }
    return inner(signal);
  };
}
