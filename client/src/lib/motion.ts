/**
 * Motion helpers ("Ink & Impact"). Still by default; one-shot moves on events.
 * Durations mirror the CSS tokens in styles/tokens.css.
 */
export const DUR = { press: 90, fast: 160, base: 240, slow: 380, scene: 520 } as const;
export const STAGGER_MS = 40;
/** Entrance staggers stop growing after this many items. */
export const STAGGER_CAP = 6;

/** Stagger delay (ms) for the i-th item in a list, capped so long lists don't drag. */
export function staggerDelay(i: number, step: number = STAGGER_MS, cap: number = STAGGER_CAP): number {
  return Math.max(0, Math.min(i, cap)) * step;
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** One 120ms scale tick (countdown seconds). No-op under reduced motion or without WAAPI. */
export function tick(el: Element | null | undefined, amount = 1.08): void {
  if (!el || typeof (el as HTMLElement).animate !== 'function' || prefersReducedMotion()) return;
  (el as HTMLElement).animate([{ scale: '1' }, { scale: String(amount), offset: 0.35 }, { scale: '1' }], { duration: 120, easing: 'ease-out' });
}
