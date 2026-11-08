import React, { useEffect, useRef } from 'react';
import { useCountdown } from '../state/hooks';
import { sfx } from '../lib/sound';
import './Countdown.css';

interface Props {
  endsAt: number | null;
  totalSeconds: number;
  size?: number;
  /** play ticks in the final 5 seconds */
  tick?: boolean;
  children?: React.ReactNode;
  label?: string;
}

/** Circular countdown, corrected for server clock skew. Children render inside the ring. */
export function CountdownRing({ endsAt, totalSeconds, size = 120, tick, children, label = 'Time left' }: Props) {
  const ms = useCountdown(endsAt);
  const secs = ms === null ? null : Math.ceil(ms / 1000);
  const frac = ms === null ? 1 : Math.min(1, ms / (totalSeconds * 1000));
  const urgent = secs !== null && secs <= 5;
  const lastTick = useRef<number | null>(null);

  useEffect(() => {
    if (!tick || secs === null || secs > 5 || secs === lastTick.current || secs === 0) return;
    lastTick.current = secs;
    if (secs <= 3) sfx.tickUrgent();
    else sfx.tick();
  }, [secs, tick]);

  const stroke = Math.max(6, size * 0.07);
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <div className={`ring ${urgent ? 'ring--urgent' : ''}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle className="ring__track" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} />
        <circle
          className="ring__bar"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="butt"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - frac)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="ring__inner">{children}</div>
      {secs !== null && (
        <span className="ring__secs" role="timer" aria-label={`${label}: ${secs} seconds`}>
          {secs}
        </span>
      )}
    </div>
  );
}

/** Compact pill timer for headers. */
export function TimerPill({ endsAt, tick }: { endsAt: number | null; tick?: boolean }) {
  const ms = useCountdown(endsAt);
  const lastTick = useRef<number | null>(null);
  const secs = ms === null ? null : Math.ceil(ms / 1000);
  useEffect(() => {
    if (!tick || secs === null || secs > 5 || secs === 0 || secs === lastTick.current) return;
    lastTick.current = secs;
    if (secs <= 3) sfx.tickUrgent();
    else sfx.tick();
  }, [secs, tick]);
  if (secs === null) return null;
  const m = Math.floor(secs / 60);
  const s = String(secs % 60).padStart(2, '0');
  return (
    <span className={`timer-pill ${secs <= 10 ? 'timer-pill--urgent' : ''}`} role="timer" aria-label={`${secs} seconds left`}>
      <span className="timer-pill__dot" aria-hidden="true" />
      {String(m).padStart(2, '0')}:{s}
    </span>
  );
}
