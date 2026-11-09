import { describe, it, expect } from 'vitest';
import { createStampThrottle } from './stampThrottle';

describe('createStampThrottle', () => {
  it('plays one full stamp per window, then soft, then silence', () => {
    const t = createStampThrottle(1200, 2);
    expect(t(0)).toBe('full');
    expect(t(100)).toBe('soft');
    expect(t(300)).toBe('soft');
    expect(t(500)).toBe('none');
    expect(t(1199)).toBe('none');
  });

  it('opens a new window once windowMs has passed since the last full stamp', () => {
    const t = createStampThrottle(1200);
    expect(t(1000)).toBe('full');
    expect(t(1500)).toBe('soft');
    expect(t(2200)).toBe('full');
    expect(t(2300)).toBe('soft');
  });

  it('spaced-out stamps always get the full sound', () => {
    const t = createStampThrottle(1200);
    expect([0, 1300, 2600, 5000].map(t)).toEqual(['full', 'full', 'full', 'full']);
  });
});
