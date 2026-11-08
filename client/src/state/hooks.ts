import { useEffect, useRef, useState } from 'react';
import { createWakeLock } from '../lib/wakeLock';
import { useGame } from './GameProvider';

/** Re-renders every `ms` while mounted. */
export function useNow(ms = 250) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

/** Milliseconds left until a server timestamp, corrected for clock skew. */
export function useCountdown(endsAt: number | null | undefined) {
  const { skew } = useGame();
  const now = useNow(200);
  if (!endsAt) return null;
  return Math.max(0, endsAt - (now + skew));
}

export function useReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  );
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const fn = () => setReduced(mq.matches);
    mq.addEventListener?.('change', fn);
    return () => mq.removeEventListener?.('change', fn);
  }, []);
  return reduced;
}

export function usePrevious<T>(value: T) {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

/** true while the page is visible (tab in front, phone unlocked). */
export function usePageVisible() {
  const get = () => typeof document === 'undefined' || document.visibilityState !== 'hidden';
  const [visible, setVisible] = useState(get);
  useEffect(() => {
    const fn = () => setVisible(get());
    document.addEventListener('visibilitychange', fn);
    window.addEventListener('pageshow', fn);
    return () => {
      document.removeEventListener('visibilitychange', fn);
      window.removeEventListener('pageshow', fn);
    };
  }, []);
  return visible;
}

/** Keep the screen awake while `active` (re-acquired automatically after the page is shown again). */
export function useWakeLock(active: boolean) {
  const lock = useRef<ReturnType<typeof createWakeLock> | null>(null);
  useEffect(() => {
    lock.current = createWakeLock();
    return () => {
      lock.current?.dispose();
      lock.current = null;
    };
  }, []);
  useEffect(() => {
    lock.current?.set(active);
  }, [active]);
}
