import React, { useEffect, useMemo, useState } from 'react';
import { useReducedMotion } from '../state/hooks';
import './Confetti.css';

const WORDS = ['EXTRA!', 'SCOOP', 'LIES', 'SPY', 'WOW', 'SHOCK', '¡AY!', 'EXCLUSIVE', 'TRUTH'];

/** Celebration burst of newspaper scraps and headline clippings. */
export function Confetti({ count = 70, duration = 4200 }: { count?: number; duration?: number }) {
  const reduced = useReducedMotion();
  const [alive, setAlive] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setAlive(false), duration + 1500);
    return () => clearTimeout(t);
  }, [duration]);
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const head = i % 4 === 0;
        return {
          i,
          head,
          word: WORDS[i % WORDS.length],
          tone: head ? ['', 'is-red', 'is-ink'][i % 3] : '',
          left: Math.random() * 100,
          delay: Math.random() * 0.9,
          dur: duration / 1000 - 0.8 + Math.random() * 1.8,
          rot: Math.random() * 540 - 270,
          drift: (Math.random() - 0.5) * 180,
          w: 18 + Math.random() * 22,
          fs: 12 + Math.random() * 8
        };
      }),
    [count, duration]
  );
  if (reduced || !alive) return null;
  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.i}
          className={`confetti__p ${p.head ? `is-head ${p.tone}` : 'is-scrap'}`}
          style={
            {
              left: `${p.left}%`,
              width: p.head ? undefined : p.w,
              height: p.head ? undefined : p.w * 0.7,
              fontSize: p.head ? p.fs : undefined,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.dur}s`,
              '--rot': `${p.rot}deg`,
              '--drift': `${p.drift}px`
            } as React.CSSProperties
          }
        >
          {p.head ? p.word : null}
        </span>
      ))}
    </div>
  );
}
