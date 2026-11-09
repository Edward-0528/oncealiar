import { useCallback, useEffect, useState } from 'react';
import { prefersReducedMotion } from '../../lib/motion';

/**
 * Character BEATS ("Ink & Impact"): characters are still by default and react
 * with one short, one-shot animation when a game event happens. A beat is
 * `{ id, key }`; giving an <Avatar> a beat with a NEW key restarts it.
 * The CSS lives in avatars.css (`.av-beat--<id>`).
 */
export const BEAT_IDS = ['drop', 'nudge', 'gag', 'flinch', 'accused', 'unmask', 'gloat', 'slump'] as const;
export type BeatId = (typeof BEAT_IDS)[number];

export interface Beat {
  id: BeatId;
  /** change this to replay the beat (a counter, a turn index, an event id...) */
  key: number | string;
  /** optional start delay in ms (sequencing; halved under reduced motion) */
  delay?: number;
}

/** Approximate beat lengths (ms) — keep in sync with avatars.css. */
export const BEAT_MS: Record<BeatId, number> = {
  drop: 520,
  nudge: 380,
  gag: 700,
  flinch: 260,
  accused: 600,
  unmask: 700,
  gloat: 600,
  slump: 520
};

/** Beats whose end pose is held (fill-mode forwards) instead of settling back. */
export const HELD_BEATS: ReadonlySet<BeatId> = new Set<BeatId>(['slump']);

export function beatClassName(id: BeatId): string {
  return `av-beat av-beat--${id}`;
}

/** React key for the beat layer: changes whenever the beat should restart. */
export function beatLayerKey(beat: Beat | undefined): string {
  return beat ? `${beat.id}:${beat.key}` : 'rest';
}

/**
 * Small helper for imperatively triggered beats:
 *   const [beat, fire] = useBeat();
 *   <Avatar beat={beat} ... />;  onClick={() => fire('gag')}
 */
export function useBeat(initial?: BeatId): readonly [Beat | undefined, (id: BeatId, delay?: number) => void] {
  const [beat, setBeat] = useState<Beat | undefined>(initial ? { id: initial, key: 0 } : undefined);
  const fire = useCallback((id: BeatId, delay?: number) => {
    setBeat((b) => ({ id, key: (typeof b?.key === 'number' ? b.key : 0) + 1, delay }));
  }, []);
  return [beat, fire] as const;
}

export interface BeatCue {
  /** ms after mount */
  at: number;
  id: BeatId;
}

/**
 * Plays a short script of beats over time (e.g. a flinch for every vote that
 * lands, then `accused` when the stamp slams). Each cue gets a fresh key so it
 * restarts even when the same beat repeats. Delays are halved under reduced motion.
 */
export function useBeatCues(cues: readonly BeatCue[], enabled = true): Beat | undefined {
  const [beat, setBeat] = useState<Beat | undefined>(undefined);
  const sig = cues.map((c) => `${c.id}@${c.at}`).join(',');
  useEffect(() => {
    if (!enabled || cues.length === 0) return;
    const scale = prefersReducedMotion() ? 0.5 : 1;
    const timers = cues.map((c, i) => setTimeout(() => setBeat({ id: c.id, key: `cue${i}` }), Math.max(0, c.at * scale)));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, enabled]);
  return beat;
}
