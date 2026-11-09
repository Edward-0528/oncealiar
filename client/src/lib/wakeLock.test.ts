// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { createWakeLock } from './wakeLock';

function fakeDoc() {
  const doc = document.implementation.createHTMLDocument('t');
  Object.defineProperty(doc, 'visibilityState', { value: 'visible', configurable: true });
  return doc;
}

describe('createWakeLock', () => {
  it('uses the Wake Lock API when it is available', async () => {
    const request = vi.fn().mockResolvedValue({ released: false, release: vi.fn().mockResolvedValue(undefined), addEventListener: vi.fn() });
    const doc = fakeDoc();
    const lock = createWakeLock({ wakeLock: { request } } as unknown as Navigator, doc);
    lock.set(true);
    await Promise.resolve();
    expect(request).toHaveBeenCalledWith('screen');
    expect(doc.querySelector('video')).toBeNull();
    lock.dispose();
  });

  it('falls back to a muted looping inline video on the next tap when the API is missing', () => {
    const doc = fakeDoc();
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve());
    const lock = createWakeLock({} as Navigator, doc);
    lock.set(true);
    doc.dispatchEvent(new Event('pointerdown'));
    const v = doc.querySelector('video')!;
    expect(v).toBeTruthy();
    expect(v.muted).toBe(true);
    expect(v.loop).toBe(true);
    expect(v.hasAttribute('playsinline')).toBe(true);
    expect(play).toHaveBeenCalled();
    lock.dispose();
    expect(doc.querySelector('video')).toBeNull();
    play.mockRestore();
  });

  it('switches to the video fallback when the browser refuses the lock', async () => {
    const doc = fakeDoc();
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve());
    const request = vi.fn().mockRejectedValue(new Error('NotAllowedError'));
    const lock = createWakeLock({ wakeLock: { request } } as unknown as Navigator, doc);
    lock.set(true);
    await new Promise((r) => setTimeout(r, 0));
    doc.dispatchEvent(new Event('click'));
    expect(doc.querySelector('video')).toBeTruthy();
    expect(play).toHaveBeenCalled();
    lock.dispose();
    play.mockRestore();
  });
});
