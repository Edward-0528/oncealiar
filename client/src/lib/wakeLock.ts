/**
 * Keep the screen on during a game.
 *
 * 1. Screen Wake Lock API, re-acquired on `visibilitychange → visible` and on the
 *    next tap (browsers release it whenever the page is hidden, and some refuse a
 *    request that isn't close to a user gesture).
 * 2. Fallback for browsers without the API or that refuse it (older iOS, in-app
 *    browsers like Instagram/Messenger, iOS home-screen apps before 18.4): a tiny
 *    muted, inline, looping video (the NoSleep.js technique). Playing it needs a
 *    user gesture, so it starts on the next tap anywhere.
 */
interface SentinelLike {
  released: boolean;
  release(): Promise<void>;
  addEventListener(type: 'release', fn: () => void): void;
}
interface WakeLockApi {
  request(type: 'screen'): Promise<SentinelLike>;
}

const GESTURES = ['pointerdown', 'touchend', 'click', 'keydown'] as const;

export function createWakeLock(
  nav: Navigator | undefined = typeof navigator === 'undefined' ? undefined : navigator,
  doc: Document | undefined = typeof document === 'undefined' ? undefined : document
) {
  const api = (nav as unknown as { wakeLock?: WakeLockApi } | undefined)?.wakeLock;
  let wanted = false;
  let sentinel: SentinelLike | null = null;
  let pending = false;
  /** the API is missing or refused us: use the video fallback */
  let useVideo = !api;
  let video: HTMLVideoElement | null = null;

  const ensureVideo = (): HTMLVideoElement | null => {
    if (video || !doc?.createElement) return video;
    const v = doc.createElement('video');
    v.setAttribute('playsinline', '');
    v.setAttribute('webkit-playsinline', '');
    v.setAttribute('aria-hidden', 'true');
    v.muted = true;
    v.loop = true;
    v.preload = 'auto';
    v.style.cssText = 'position:fixed;width:1px;height:1px;left:-10px;bottom:0;opacity:0.01;pointer-events:none;';
    for (const [src, type] of [
      ['/keepawake.webm', 'video/webm'],
      ['/keepawake.mp4', 'video/mp4']
    ] as const) {
      const s = doc.createElement('source');
      s.src = src;
      s.type = type;
      v.appendChild(s);
    }
    doc.body?.appendChild(v);
    video = v;
    return v;
  };

  const playVideo = () => {
    const v = ensureVideo();
    if (!v || !v.paused) return;
    const p = v.play?.();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  };

  const acquire = async () => {
    if (!wanted || (doc && doc.visibilityState !== 'visible')) return;
    if (useVideo) return playVideo();
    if (!api || pending || (sentinel && !sentinel.released)) return;
    pending = true;
    try {
      const s = await api.request('screen');
      sentinel = s;
      s.addEventListener('release', () => {
        if (sentinel === s) sentinel = null;
      });
      if (!wanted) void s.release().catch(() => {});
    } catch {
      // refused (no recent gesture, battery saver, policy): fall back to the video trick,
      // which starts on the next tap
      useVideo = true;
    } finally {
      pending = false;
    }
  };

  const onVisibility = () => {
    if (doc?.visibilityState === 'visible') void acquire();
  };
  // any tap re-takes the lock (and is the only way the video fallback may start)
  const onGesture = () => {
    if (wanted) void acquire();
  };
  doc?.addEventListener('visibilitychange', onVisibility);
  for (const g of GESTURES) doc?.addEventListener(g, onGesture, { passive: true, capture: true });

  return {
    supported: !!api,
    set(on: boolean) {
      wanted = on;
      if (on) void acquire();
      else {
        if (sentinel) {
          const s = sentinel;
          sentinel = null;
          void s.release().catch(() => {});
        }
        video?.pause();
      }
    },
    dispose() {
      wanted = false;
      doc?.removeEventListener('visibilitychange', onVisibility);
      for (const g of GESTURES) doc?.removeEventListener(g, onGesture, { capture: true });
      if (sentinel) void sentinel.release().catch(() => {});
      sentinel = null;
      if (video) {
        video.pause();
        video.remove();
        video = null;
      }
    }
  };
}
