import React, { useEffect, useRef } from 'react';
import { useGame, usePlayers } from '../state/GameProvider';
import { Avatar } from './Avatar';
import { sfx } from '../lib/sound';
import { createStampThrottle } from '../lib/stampThrottle';
import './Paper.css';

/* ---------------- Masthead ---------------- */

export function Masthead({ left, right, title = 'The Daily Fib', as: Tag = 'div', children }: { left?: React.ReactNode; right?: React.ReactNode; title?: React.ReactNode; as?: 'div' | 'header'; children?: React.ReactNode }) {
  return (
    <Tag className="masthead">
      {(left || right) && (
        <div className="masthead__meta">
          <span>{left}</span>
          <span>{right}</span>
        </div>
      )}
      {title && <span className="masthead__title">{title}</span>}
      {children}
    </Tag>
  );
}

/* ---------------- Stamps ---------------- */

export type StampTone = 'red' | 'blue' | 'ink' | 'green' | 'solid';

export function Stamp({ children, tone = 'red', rot = -8, slam, lg, className = '', style, delay }: { children: React.ReactNode; tone?: StampTone; rot?: number; slam?: boolean; lg?: boolean; className?: string; style?: React.CSSProperties; delay?: number }) {
  const toneCls = tone === 'red' ? '' : tone === 'solid' ? 'stamp--solid' : `stamp--${tone}`;
  return (
    <span
      className={`stamp ${toneCls} ${slam ? 'stamp--slam' : ''} ${lg ? 'stamp--lg' : ''} ${className}`}
      style={{ ['--stamp-rot' as string]: `${rot}deg`, animationDelay: delay ? `${delay}ms` : undefined, ...style }}
    >
      {children}
    </span>
  );
}

/** Black redaction bar. `text` sets its width; screen readers hear `label`. */
export function Redacted({ text = 'XXXXXXXX', label = 'Redacted', className = '' }: { text?: string; label?: string; className?: string }) {
  return (
    <span className={`redact ${className}`} role="img" aria-label={label}>
      {text}
    </span>
  );
}

/** Inked thumbprint on the closed role file (RoleReveal + the briefing demo). */
export function Fingerprint({ size = 74 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" className="rcard__print">
      {[6, 11, 16, 21, 26].map((r, i) => (
        <path
          key={r}
          d={`M${32 - r} ${38 + i} a${r} ${r + 4} 0 0 1 ${r * 2} 0`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeDasharray={i % 2 ? '10 4' : '18 5'}
        />
      ))}
      <path d="M32 40 v14 M24 44 q0 10 4 14 M40 44 q0 10 -4 14" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

/* ---------------- Reactions as rubber stamps ---------------- */

/** Contract reaction ids (emoji) → stamp label. Unknown ids fall back to the emoji itself. */
export const REACTION_STAMPS: Record<string, { label: string; tone: StampTone; rot: number; name: string }> = {
  '😂': { label: 'LOL', tone: 'ink', rot: -6, name: 'laughing' },
  '🤨': { label: 'SUS', tone: 'red', rot: -8, name: 'suspicious' },
  '😱': { label: '¡AY!', tone: 'blue', rot: -7, name: 'shocked' },
  '👀': { label: 'WATCHING', tone: 'ink', rot: -9, name: 'watching' },
  '🔥': { label: '¡PUM!', tone: 'red', rot: -10, name: 'fire' },
  '🤥': { label: 'LIES!', tone: 'solid', rot: -6, name: 'lies' }
};

export const reactionStamp = (emoji: string) => REACTION_STAMPS[emoji] ?? { label: emoji, tone: 'ink' as StampTone, rot: -7, name: emoji };

/** How many stamps the lane shows at once (newest win). */
const LANE_MAX = 4;

/**
 * Global layer: incoming reactions slam into a fixed lane along the top edge as rubber stamps,
 * hold, then exit quickly — they never land on top of clues or ballots. Sound is throttled:
 * one full thunk per ~1.2s, then a quieter tap, then silence. Rendered once from TopBar.
 */
export function ReactionStampLayer() {
  const { reactions } = useGame();
  const { byId } = usePlayers();
  const seen = useRef(new Set<string | number>());
  const throttle = useRef(createStampThrottle());
  useEffect(() => {
    let fresh = false;
    reactions.forEach((r) => {
      if (!seen.current.has(r.id)) {
        seen.current.add(r.id);
        fresh = true;
      }
    });
    if (!fresh) return;
    const level = throttle.current(Date.now());
    if (level === 'full') sfx.stamp();
    else if (level === 'soft') sfx.stampSoft();
  }, [reactions]);
  return (
    <div className="rstamps" aria-hidden="true">
      {reactions.slice(-LANE_MAX).map((r) => {
        const p = byId(r.playerId);
        const s = reactionStamp(r.emoji);
        return (
          <div key={r.id} className="rstamp">
            <Stamp tone={s.tone} rot={s.rot} slam className="rstamp__mark">
              {s.label}
            </Stamp>
            {p && (
              <span className="rstamp__who">
                <Avatar avatar={p.avatar} color={p.color} size={18} label="" />
                {p.name}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
