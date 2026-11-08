import React, { useEffect, useRef } from 'react';
import { useGame, usePlayers } from '../state/GameProvider';
import { Avatar } from './Avatar';
import { sfx } from '../lib/sound';
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

/* ---------------- Reactions as rubber stamps ---------------- */

/** Contract reaction ids (emoji) → stamp label. Unknown ids fall back to the emoji itself. */
export const REACTION_STAMPS: Record<string, { label: string; tone: StampTone; rot: number; name: string }> = {
  '😂': { label: 'LOL', tone: 'ink', rot: -6, name: 'laughing' },
  '🤨': { label: 'SUS', tone: 'red', rot: 5, name: 'suspicious' },
  '😱': { label: '¡AY!', tone: 'blue', rot: -4, name: 'shocked' },
  '👀': { label: 'WATCHING', tone: 'ink', rot: 3, name: 'watching' },
  '🔥': { label: '¡PUM!', tone: 'red', rot: -7, name: 'fire' },
  '🤥': { label: 'LIES!', tone: 'solid', rot: 6, name: 'lies' }
};

export const reactionStamp = (emoji: string) => REACTION_STAMPS[emoji] ?? { label: emoji, tone: 'ink' as StampTone, rot: -4, name: emoji };

/**
 * Global layer: incoming reactions slam onto the screen as rubber stamps (with a thunk).
 * Rendered once from TopBar. Replaces the old floating emoji.
 */
export function ReactionStampLayer() {
  const { reactions } = useGame();
  const { byId } = usePlayers();
  const seen = useRef(new Set<string | number>());
  useEffect(() => {
    let fresh = false;
    reactions.forEach((r) => {
      if (!seen.current.has(r.id)) {
        seen.current.add(r.id);
        fresh = true;
      }
    });
    if (fresh) sfx.stamp();
  }, [reactions]);
  return (
    <div className="rstamps" aria-hidden="true">
      {reactions.map((r, i) => {
        const p = byId(r.playerId);
        const s = reactionStamp(r.emoji);
        const top = 18 + ((Math.abs(r.drift) * 7 + i * 13) % 52);
        return (
          <div key={r.id} className="rstamp" style={{ left: `${Math.min(70, Math.max(4, r.left - 12))}%`, top: `${top}%` }}>
            <Stamp tone={s.tone} rot={s.rot + r.drift / 10} slam className="rstamp__mark">
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
