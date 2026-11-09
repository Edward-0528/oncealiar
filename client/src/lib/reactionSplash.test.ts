import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSplashQueue, SPLASH_MS, type SplashState } from './reactionSplash';

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

const r = (id: number) => ({ id, emoji: '🤨', playerId: `p${id}` });

describe('discussion full-screen reaction queue', () => {
  it('shows one splash at a time and folds a burst into a +N counter', () => {
    const states: SplashState[] = [];
    const q = createSplashQueue((s) => states.push(s));
    expect(q.push(r(1))).toBe('shown');
    expect(q.push(r(2))).toBe('folded');
    expect(q.push(r(3))).toBe('folded');
    expect(q.state.current?.id).toBe(1);
    expect(q.state.extra).toBe(2);
    // never more than one splash in any emitted state
    expect(new Set(states.map((s) => s.current?.id)).size).toBe(1);
  });

  it('clears after ~1.1s; the next reaction gets a fresh splash', () => {
    const q = createSplashQueue(() => {});
    q.push(r(1));
    q.push(r(2));
    vi.advanceTimersByTime(SPLASH_MS - 1);
    expect(q.state.current?.id).toBe(1);
    vi.advanceTimersByTime(1);
    expect(q.state).toEqual({ current: null, extra: 0 });
    expect(q.push(r(3))).toBe('shown');
    expect(q.state).toEqual({ current: r(3), extra: 0 });
  });

  it('dispose cancels the pending clear', () => {
    const q = createSplashQueue(() => {});
    q.push(r(1));
    q.dispose();
    vi.advanceTimersByTime(SPLASH_MS * 2);
    expect(q.state.current?.id).toBe(1);
  });
});
