import React, { useEffect, useId, useRef, useState } from 'react';
import { colorVar } from '../lib/profile';
import { AvatarArt } from './avatars/render';
import type { Mood } from './avatars/kit';
import { beatClassName, beatLayerKey, type Beat, type BeatId } from './avatars/beats';
import './avatars/avatars.css';

/**
 * "Tabloid Spy" sticker characters (ids from ALL_AVATARS in shared/content.ts),
 * tinted by the player's colour. Art lives in ./avatars/*, drawn in a 120x120
 * viewBox with a 3.5px ink outline + flat cel shadows. Unknown ids fall back to La Chancla.
 *
 * Motion ("Ink & Impact"): characters are STILL at rest. They only move when a
 * game event hands them a `beat` (one-shot, then they settle).
 */

export type AvatarMood = Mood;
export type { Beat, BeatId };

/** Delay before the auto-gag after a character swap (lets the stage curtain open). */
export const SWAP_GAG_DELAY_MS = 200;

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
  /**
   * Allowed to beat. With `animated`, swapping the character plays its gag once.
   * `animated={false}` suppresses beats entirely. Never loops.
   */
  animated?: boolean;
  /** one-shot reaction; a new `key` replays it (see avatars/beats.ts) */
  beat?: Beat;
  /** white die-cut sticker halo (exports, promo tiles) */
  sticker?: boolean;
}

export function Avatar({ avatar, color, size = 56, masked, maskClassName, className, label, mood = 'idle', animated, beat, sticker = false }: AvatarProps) {
  const uid = useId();
  const swapBeat = useSwapGag(avatar, animated === true);
  const active = animated === false ? undefined : (beat ?? swapBeat);
  const cls = ['av', active ? `av--beat-${active.id}` : '', className ?? ''].filter(Boolean).join(' ');
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
      beatLayer={{
        key: beatLayerKey(active),
        className: active ? beatClassName(active.id) : undefined,
        style: active?.delay ? ({ '--beat-delay': `${active.delay}ms` } as React.CSSProperties) : undefined
      }}
    />
  );
}

/** When an `animated` avatar's character changes (e.g. the profile stage), play its gag once. */
function useSwapGag(avatar: string, enabled: boolean): Beat | undefined {
  const prev = useRef(avatar);
  const [beat, setBeat] = useState<Beat | undefined>(undefined);
  useEffect(() => {
    if (prev.current === avatar) return;
    prev.current = avatar;
    if (enabled) setBeat((b) => ({ id: 'gag', key: (typeof b?.key === 'number' ? b.key : 0) + 1, delay: SWAP_GAG_DELAY_MS }));
  }, [avatar, enabled]);
  return beat;
}
