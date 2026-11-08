import React, { useId } from 'react';
import { colorVar } from '../lib/profile';
import { AvatarArt } from './avatars/render';
import type { Mood } from './avatars/kit';
import './avatars/avatars.css';

/**
 * "Tabloid Spy" sticker characters (ids from ALL_AVATARS in shared/content.ts),
 * tinted by the player's colour. Art lives in ./avatars/*, drawn in a 120x120
 * viewBox with a 3.5px ink outline + flat cel shadows. Unknown ids fall back to La Chancla.
 */

export type AvatarMood = Mood;

export interface AvatarProps {
  avatar: string;
  color: string;
  size?: number | string;
  masked?: boolean;
  /** extra class for the mask (used by the unmask animation) */
  maskClassName?: string;
  className?: string;
  label?: string;
  /** facial expression: sus = side-eye, caught = shocked, win = big grin */
  mood?: Mood;
  /** gentle idle loop (respects prefers-reduced-motion) */
  animated?: boolean;
  /** white die-cut sticker halo (exports, promo tiles) */
  sticker?: boolean;
}

export function Avatar({ avatar, color, size = 56, masked, maskClassName, className, label, mood = 'idle', animated = false, sticker = false }: AvatarProps) {
  const uid = useId();
  const cls = ['av', animated ? 'av--animated' : '', className ?? ''].filter(Boolean).join(' ');
  return (
    <AvatarArt
      avatar={avatar}
      c={colorVar(color)}
      uid={uid}
      mood={mood}
      size={size}
      masked={masked}
      maskClassName={maskClassName}
      className={cls}
      label={label}
      sticker={sticker}
    />
  );
}
