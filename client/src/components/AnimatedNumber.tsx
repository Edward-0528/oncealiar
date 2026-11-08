import React, { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '../state/hooks';

export function AnimatedNumber({ from, to, duration = 900, delay = 0, prefix = '' }: { from: number; to: number; duration?: number; delay?: number; prefix?: string }) {
  const reduced = useReducedMotion();
  const [v, setV] = useState(reduced ? to : from);
  const raf = useRef(0);
  useEffect(() => {
    if (reduced) {
      setV(to);
      return;
    }
    let start = 0;
    const timer = setTimeout(() => {
      const step = (t: number) => {
        if (!start) start = t;
        const p = Math.min(1, (t - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        setV(Math.round(from + (to - from) * eased));
        if (p < 1) raf.current = requestAnimationFrame(step);
      };
      raf.current = requestAnimationFrame(step);
    }, delay);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf.current);
    };
  }, [from, to, duration, delay, reduced]);
  return (
    <span style={{ fontVariantNumeric: 'tabular-nums' }}>
      {prefix}
      {v}
    </span>
  );
}
