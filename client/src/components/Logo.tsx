import React from 'react';
import './Logo.css';

export function MaskMark({ size = 40 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 40" width={size} height={size * 0.625} aria-hidden="true" className="mask-mark">
      <path
        d="M3 9 Q17 1 32 9 Q47 1 61 9 Q61 31 45 33 Q36 34 32 25 Q28 34 19 33 Q3 31 3 9 Z"
        fill="var(--accent)"
        stroke="var(--av-ink)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <ellipse cx="19" cy="17" rx="7" ry="4.6" fill="var(--av-ink)" />
      <ellipse cx="45" cy="17" rx="7" ry="4.6" fill="var(--av-ink)" />
      <circle cx="32" cy="5.5" r="3" fill="var(--highlight)" stroke="var(--av-ink)" strokeWidth="2" />
    </svg>
  );
}

export function Logo({ size = 'lg' }: { size?: 'lg' | 'sm' }) {
  return (
    <div className={`logo logo--${size}`} aria-label="Once a Liar">
      <MaskMark size={size === 'lg' ? 64 : 30} />
      <div className="logo__text display" aria-hidden="true">
        <span className="logo__once">Once a</span>
        <span className="logo__liar">Liar</span>
      </div>
    </div>
  );
}
