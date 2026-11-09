export type StampSound = 'full' | 'soft' | 'none';

/**
 * Throttle for incoming reaction-stamp sounds. In any `windowMs` window (started by a full
 * thunk) only the first stamp gets the full sound; the next `softMax` get the quiet variant
 * and anything beyond that is silent — so a burst of reactions doesn't machine-gun every phone.
 */
export function createStampThrottle(windowMs = 1200, softMax = 2) {
  let windowStart = -Infinity;
  let soft = 0;
  return (now: number): StampSound => {
    if (now - windowStart >= windowMs) {
      windowStart = now;
      soft = 0;
      return 'full';
    }
    if (soft < softMax) {
      soft += 1;
      return 'soft';
    }
    return 'none';
  };
}
