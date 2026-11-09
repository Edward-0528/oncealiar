/**
 * Pre-warm: imported FIRST by main.tsx so the `/healthz` probe leaves the browser before
 * React (or anything else) loads — a sleeping free-tier server starts booting immediately.
 *
 * Dev-only simulations (ignored in production builds):
 * - `?wake=slow[&wakeMs=15000]` live server, but the probe can't succeed for wakeMs.
 * - `?wake=never` probe never succeeds (see the "taking longer than usual" state;
 *   add `&wakeSlowMs=10000` to get there faster).
 * - `?mock=wake[&wakeMs=12000]` mock transport + simulated wake-up, no server needed.
 * The server can also fake it for real: `SIMULATE_COLD_START_MS=20000 npm run dev:server`.
 */
import { WakeMonitor, delayedProbe, fetchProbe, type Probe, type WakeOptions } from './wake';
import { healthUrl } from './serverUrl';

export function createBootMonitor(search: string, dev: boolean): WakeMonitor | null {
  const params = new URLSearchParams(search);
  const mock = dev ? params.get('mock') : null;
  const sim = dev ? params.get('wake') : null;
  const num = (k: string, d: number) => {
    const v = Number(params.get(k));
    return Number.isFinite(v) && v > 0 ? v : d;
  };
  const opts: WakeOptions = {};
  if (dev && params.has('wakeSlowMs')) opts.slowMs = num('wakeSlowMs', 90_000);

  if (mock && mock !== 'wake') return null; // other mock screens: no server involved
  let probe: Probe = fetchProbe(healthUrl());
  if (mock === 'wake') {
    probe = delayedProbe(async () => true, sim === 'never' ? Infinity : num('wakeMs', 12_000));
    opts.simulated = true;
  } else if (sim === 'slow' || sim === 'never') {
    probe = delayedProbe(probe, sim === 'never' ? Infinity : num('wakeMs', 15_000));
    opts.simulated = true;
  }
  return new WakeMonitor(probe, opts).start();
}

export const bootMonitor: WakeMonitor | null =
  typeof window === 'undefined' ? null : createBootMonitor(window.location.search, import.meta.env.DEV);
