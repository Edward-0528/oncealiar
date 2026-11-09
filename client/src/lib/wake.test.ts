import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WakeMonitor, delayedProbe, fetchProbe, wakeProgress, type Probe } from './wake';
import { resolveServerOrigin } from './serverUrl';
import { createBootMonitor } from './bootWake';

/** a probe that never answers until aborted (like a request held by a sleeping Render service) */
const hanging: Probe = (signal) => new Promise((_, reject) => signal.addEventListener('abort', () => reject(new Error('aborted'))));

describe('WakeMonitor', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('stays quiet when the server answers fast', async () => {
    const probe = vi.fn<Parameters<Probe>, ReturnType<Probe>>(async () => true);
    const m = new WakeMonitor(probe).start();
    const phases: string[] = [];
    m.subscribe((s) => phases.push(s.phase));
    await vi.advanceTimersByTimeAsync(0);
    expect(m.snapshot.phase).toBe('ready');
    await vi.advanceTimersByTimeAsync(5000);
    expect(phases).not.toContain('waking');
    expect(probe).toHaveBeenCalledTimes(1);
  });

  it('shows waking after ~800 ms, retries every ~2 s, and becomes ready', async () => {
    let up = false;
    const probe = vi.fn<Parameters<Probe>, ReturnType<Probe>>(async () => up);
    const m = new WakeMonitor(probe).start();
    await vi.advanceTimersByTimeAsync(799);
    expect(m.snapshot.phase).toBe('probing');
    await vi.advanceTimersByTimeAsync(2);
    expect(m.snapshot.phase).toBe('waking');
    await vi.advanceTimersByTimeAsync(2000);
    expect(probe).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(4000);
    expect(probe).toHaveBeenCalledTimes(4);
    up = true;
    await vi.advanceTimersByTimeAsync(2000);
    expect(m.snapshot.phase).toBe('ready');
    expect(m.snapshot.readyAt).not.toBeNull();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(probe).toHaveBeenCalledTimes(5); // stops probing once ready
  });

  it('aborts a held probe after the timeout and retries promptly', async () => {
    const probe = vi.fn(hanging);
    const m = new WakeMonitor(probe).start();
    await vi.advanceTimersByTimeAsync(2499);
    expect(probe).toHaveBeenCalledTimes(1);
    expect(probe.mock.calls[0][0].aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(probe.mock.calls[0][0].aborted).toBe(true);
    expect(m.snapshot.checking).toBe(false);
    await vi.advanceTimersByTimeAsync(250);
    expect(probe).toHaveBeenCalledTimes(2);
  });

  it('treats a rejected fetch (CORS / network / 502 page) as not-yet', async () => {
    const m = new WakeMonitor(async () => {
      throw new TypeError('Failed to fetch');
    }).start();
    await vi.advanceTimersByTimeAsync(1000);
    expect(m.snapshot.phase).toBe('waking');
    expect(m.snapshot.attempts).toBe(1);
  });

  it('switches to slow after 90 s and keeps retrying; Retry probes immediately', async () => {
    const probe = vi.fn<Parameters<Probe>, ReturnType<Probe>>(async () => false);
    const m = new WakeMonitor(probe).start();
    await vi.advanceTimersByTimeAsync(90_000);
    expect(m.snapshot.phase).toBe('slow');
    const n = probe.mock.calls.length;
    await vi.advanceTimersByTimeAsync(4000);
    expect(probe.mock.calls.length).toBe(n + 2);
    m.retryNow();
    await vi.advanceTimersByTimeAsync(0);
    expect(probe.mock.calls.length).toBe(n + 3);
  });

  it('markHealthy (socket connected) wins and stops everything', async () => {
    const probe = vi.fn(hanging);
    const m = new WakeMonitor(probe).start();
    await vi.advanceTimersByTimeAsync(1500);
    m.markHealthy();
    expect(m.snapshot.phase).toBe('ready');
    await vi.advanceTimersByTimeAsync(100_000);
    expect(m.snapshot.phase).toBe('ready');
    expect(probe).toHaveBeenCalledTimes(1);
    expect(m.elapsed()).toBe(1500);
  });

  it('stop() cancels pending retries', async () => {
    const probe = vi.fn<Parameters<Probe>, ReturnType<Probe>>(async () => false);
    const m = new WakeMonitor(probe).start();
    await vi.advanceTimersByTimeAsync(10);
    m.stop();
    await vi.advanceTimersByTimeAsync(20_000);
    expect(probe).toHaveBeenCalledTimes(1);
    expect(m.snapshot.phase).toBe('probing');
  });

  it('fetchProbe sends a no-store GET to the health URL', async () => {
    const fetchImpl = vi.fn(async () => new Response('{"ok":true}', { status: 200 }));
    const m = new WakeMonitor(fetchProbe('https://srv.example/healthz', fetchImpl as unknown as typeof fetch)).start();
    await vi.advanceTimersByTimeAsync(0);
    expect(m.snapshot.phase).toBe('ready');
    expect(fetchImpl).toHaveBeenCalledWith('https://srv.example/healthz', expect.objectContaining({ cache: 'no-store' }));
  });

  it('fetchProbe treats a 503 as not ready', async () => {
    const fetchImpl = vi.fn(async () => new Response('waking', { status: 503 }));
    const m = new WakeMonitor(fetchProbe('/healthz', fetchImpl as unknown as typeof fetch)).start();
    await vi.advanceTimersByTimeAsync(1000);
    expect(m.snapshot.phase).toBe('waking');
  });

  it('delayedProbe (dev simulation) cannot succeed before its delay', async () => {
    const m = new WakeMonitor(delayedProbe(async () => true, 10_000), { simulated: true }).start();
    expect(m.simulated).toBe(true);
    await vi.advanceTimersByTimeAsync(9_000);
    expect(m.snapshot.phase).toBe('waking');
    await vi.advanceTimersByTimeAsync(4_000);
    expect(m.snapshot.phase).toBe('ready');
  });
});

describe('wakeProgress', () => {
  it('eases toward 90 % and snaps to 100 % when ready', () => {
    expect(wakeProgress(0, false)).toBe(0);
    const at10 = wakeProgress(10_000, false);
    const at50 = wakeProgress(50_000, false);
    expect(at10).toBeGreaterThan(0.2);
    expect(at50).toBeGreaterThan(at10);
    expect(at50).toBeGreaterThan(0.75);
    expect(at50).toBeLessThan(0.85);
    expect(wakeProgress(10 * 60_000, false)).toBeLessThanOrEqual(0.9);
    expect(wakeProgress(3000, true)).toBe(1);
  });
});

describe('resolveServerOrigin', () => {
  it('is same-origin by default', () => {
    expect(resolveServerOrigin(undefined, undefined)).toBe('');
    expect(resolveServerOrigin('', '  ')).toBe('');
  });
  it('turns a Render internal host into its public onrender.com URL', () => {
    expect(resolveServerOrigin(undefined, 'oncealiar-server')).toBe('https://oncealiar-server.onrender.com');
    expect(resolveServerOrigin(undefined, 'oncealiar-server-x1y2')).toBe('https://oncealiar-server-x1y2.onrender.com');
  });
  it('keeps real hosts and full URLs; the URL override wins', () => {
    expect(resolveServerOrigin(undefined, 'api.example.com')).toBe('https://api.example.com');
    expect(resolveServerOrigin(undefined, 'localhost:3001')).toBe('http://localhost:3001');
    expect(resolveServerOrigin('https://play.example.com/', 'oncealiar-server')).toBe('https://play.example.com');
  });
});

describe('createBootMonitor', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('skips the probe on mock screens, simulates on ?mock=wake (dev only)', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
    expect(createBootMonitor('?mock=lobby', true)).toBeNull();
    const sim = createBootMonitor('?mock=wake&wakeMs=5000', true);
    expect(sim?.simulated).toBe(true);
    sim?.stop();
    const prod = createBootMonitor('?wake=slow', false);
    expect(prod?.simulated).toBe(false);
    prod?.stop();
  });
});
