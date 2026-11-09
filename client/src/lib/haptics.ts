export type HapticPattern = number | readonly number[];

/**
 * Named vibration presets — the one place haptic patterns live.
 * Every preset is role-neutral: the same event buzzes the same way for every player.
 */
export const HAPTICS = {
  /** lightest acknowledgement (taps, small toggles) */
  tick: 10,
  /** a firm single knock (vote cast, peek pressed) */
  thud: 25,
  /** double pulse: "your turn" / attention */
  heartbeat: [40, 30, 40],
  /** short-then-long: a stamp or reveal landing */
  slam: [40, 30, 120],
  /** celebratory flutter */
  win: [30, 30, 30, 30, 90],
  /** one soft pulse — deliberately gentler than win */
  lose: [70]
} as const satisfies Record<string, HapticPattern>;

export type HapticName = keyof typeof HAPTICS;

export function buzz(pattern: HapticPattern) {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(typeof pattern === 'number' ? pattern : [...pattern]);
  } catch {
    /* unsupported */
  }
}

/** Play a named preset. */
export function haptic(name: HapticName) {
  buzz(HAPTICS[name]);
}
