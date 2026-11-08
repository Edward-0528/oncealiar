import React from 'react';
import { AVATAR_INFO, isAvatarId } from '@oncealiar/shared';
import { CHARACTER_ART } from './index';
import { INK, PAPER, type Mood } from './kit';

/**
 * Pure SVG renderer for a character (no CSS, no hooks, no app imports) so the
 * in-game <Avatar> and the Node asset exporter (tools/assets) draw identical art.
 */

const MASK_PATH = 'M-40 -5 Q-20 -17 0 -6 Q20 -17 40 -5 Q38 13 18 13 Q7 13 0 4 Q-7 13 -18 13 Q-38 13 -40 -5 Z';

export interface AvatarArtProps {
  avatar: string;
  /** resolved CSS colour (hex or var(--pc-*)) for the player-tinted part */
  c: string;
  uid: string;
  mood?: Mood;
  size?: number | string;
  masked?: boolean;
  maskClassName?: string;
  className?: string;
  label?: string;
  /** white die-cut sticker halo (for exports / big promos) */
  sticker?: boolean;
  /** standalone file: add xmlns */
  standalone?: boolean;
}

export function AvatarArt({ avatar, c, uid: rawUid, mood = 'idle', size = 56, masked, maskClassName, className, label, sticker, standalone }: AvatarArtProps) {
  const uid = rawUid.replace(/[^a-zA-Z0-9_-]/g, '') || 'a';
  const id = isAvatarId(avatar) ? avatar : 'chancla';
  const art = CHARACTER_ART[id];
  const m = art.mask;
  const k = 1.2 * (m.s ?? 1);
  const sw = (w: number) => w / k;
  const body = (
    <g className={`av-anim av-anim--${art.anim}`}>
      {art.draw({ c, mood, uid })}
      {masked && (
        <g transform={`translate(${m.x} ${m.y}) rotate(${m.rot ?? 0})`}>
          <g className={maskClassName}>
            <g transform={`scale(${k})`}>
              <path d={MASK_PATH} fill="var(--accent, #E8322A)" stroke={INK} strokeWidth={sw(3.5)} strokeLinejoin="round" />
              <ellipse cx={-16} cy={0} rx={8} ry={5.5} fill={INK} />
              <ellipse cx={16} cy={0} rx={8} ry={5.5} fill={INK} />
              <path d="M-36 -4 Q-42 -11 -46 -9 M36 -4 Q42 -11 46 -9" fill="none" stroke={INK} strokeWidth={sw(3)} strokeLinecap="round" />
            </g>
          </g>
        </g>
      )}
    </g>
  );
  return (
    <svg
      xmlns={standalone ? 'http://www.w3.org/2000/svg' : undefined}
      viewBox={sticker ? '-10 -10 140 140' : '0 0 120 120'}
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={label ?? `${AVATAR_INFO[id].name} avatar`}
      style={standalone ? undefined : { overflow: 'visible' }}
    >
      {sticker ? (
        <>
          <filter id={`${uid}st`} x="-20%" y="-20%" width="140%" height="140%">
            {/* dilate the silhouette: blur + hard alpha threshold (much faster than feMorphology) */}
            <feGaussianBlur in="SourceAlpha" stdDeviation="5" result="b" />
            <feComponentTransfer in="b" result="d">
              <feFuncA type="linear" slope="100" intercept="-11" />
            </feComponentTransfer>
            <feFlood floodColor={PAPER} />
            <feComposite in2="d" operator="in" result="w" />
            <feOffset in="d" dx="2.5" dy="3" result="o" />
            <feFlood floodColor={INK} floodOpacity="0.85" />
            <feComposite in2="o" operator="in" result="s" />
            <feMerge>
              <feMergeNode in="s" />
              <feMergeNode in="w" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <g filter={`url(#${uid}st)`}>{body}</g>
        </>
      ) : (
        body
      )}
    </svg>
  );
}
