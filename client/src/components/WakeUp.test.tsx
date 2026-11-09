import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { App } from '../ui/App';
import { createMockTransport } from '../lib/mock';
import { WakeMonitor, type Probe } from '../lib/wake';
import { READY_STAMP_MS } from './WakeUp';

const wakeStatus = () => screen.getAllByRole('status').find((el) => el.classList.contains('wake__status'))!;

function setup(probe: Probe) {
  const params = new URLSearchParams({ mock: 'home' });
  const transport = createMockTransport('home', params, { name: 'Tester', avatar: 'owl', color: 'sky' });
  // simulated: the mock transport is "connected" immediately, which must not count as awake here
  const wake = new WakeMonitor(probe, { simulated: true }).start();
  render(<App transport={transport} wake={wake} />);
  return wake;
}

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  window.matchMedia =
    window.matchMedia ||
    ((q: string) =>
      ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false }) as unknown as MediaQueryList);
});
afterEach(() => {
  vi.useRealTimers();
});

describe('WakeGate', () => {
  it('goes straight to Home when the server answers fast', async () => {
    setup(async () => true);
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(screen.getByRole('button', { name: /host a game/i })).toBeInTheDocument();
    expect(screen.queryByText(/stop the presses/i)).not.toBeInTheDocument();
  });

  it('shows the wake-up screen while the server sleeps, then READY, then Home', async () => {
    let up = false;
    setup(async () => up);
    expect(screen.queryByRole('button', { name: /host a game/i })).not.toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(900));
    expect(screen.getByRole('heading', { name: /stop the presses/i })).toBeInTheDocument();
    expect(wakeStatus()).toHaveTextContent(/under a minute/i);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /host a game/i })).not.toBeInTheDocument();

    // how-to-play is available while waiting
    fireEvent.click(screen.getByRole('button', { name: /how to play while you wait/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    up = true;
    await act(() => vi.advanceTimersByTimeAsync(2100));
    expect(screen.getByText(/hot off the press/i)).toBeInTheDocument();
    // waits while the reader still has How to play open…
    await act(() => vi.advanceTimersByTimeAsync(READY_STAMP_MS + 50));
    expect(screen.queryByRole('button', { name: /host a game/i })).not.toBeInTheDocument();
    expect(wakeStatus()).toHaveTextContent(/close this whenever/i);
    // …and continues once it's closed
    fireEvent.keyDown(document, { key: 'Escape' });
    await act(() => vi.advanceTimersByTimeAsync(READY_STAMP_MS + 50));
    expect(screen.getByRole('button', { name: /host a game/i })).toBeInTheDocument();
  });

  it('turns calm after 90 s with a Retry button', async () => {
    const probe = vi.fn<Parameters<Probe>, ReturnType<Probe>>(async () => false);
    setup(probe);
    await act(() => vi.advanceTimersByTimeAsync(91_000));
    expect(wakeStatus()).toHaveTextContent(/longer than usual/i);
    const n = probe.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: /retry now/i }));
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(probe.mock.calls.length).toBe(n + 1);
  });
});
