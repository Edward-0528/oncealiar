/**
 * Screen Wake Lock with automatic re-acquire. Browsers release the lock whenever the
 * page is hidden, so we take it again on `visibilitychange → visible`.
 * No-op where unsupported (older iOS, Firefox) or when the request is refused.
 */
interface SentinelLike {
  released: boolean;
  release(): Promise<void>;
  addEventListener(type: 'release', fn: () => void): void;
}
interface WakeLockApi {
  request(type: 'screen'): Promise<SentinelLike>;
}

export function createWakeLock(nav: Navigator | undefined = typeof navigator === 'undefined' ? undefined : navigator, doc: Document | undefined = typeof document === 'undefined' ? undefined : document) {
  const api = (nav as unknown as { wakeLock?: WakeLockApi } | undefined)?.wakeLock;
  let wanted = false;
  let sentinel: SentinelLike | null = null;
  let pending = false;

  const acquire = async () => {
    if (!api || !wanted || pending || (sentinel && !sentinel.released)) return;
    if (doc && doc.visibilityState !== 'visible') return;
    pending = true;
    try {
      const s = await api.request('screen');
      sentinel = s;
      s.addEventListener('release', () => {
        if (sentinel === s) sentinel = null;
      });
      if (!wanted) void s.release().catch(() => {});
    } catch {
      /* refused (battery saver, not visible) — try again next time we become visible */
    } finally {
      pending = false;
    }
  };

  const onVisibility = () => {
    if (doc?.visibilityState === 'visible') void acquire();
  };
  doc?.addEventListener('visibilitychange', onVisibility);

  return {
    supported: !!api,
    set(on: boolean) {
      wanted = on;
      if (on) void acquire();
      else if (sentinel) {
        const s = sentinel;
        sentinel = null;
        void s.release().catch(() => {});
      }
    },
    dispose() {
      wanted = false;
      doc?.removeEventListener('visibilitychange', onVisibility);
      if (sentinel) void sentinel.release().catch(() => {});
      sentinel = null;
    }
  };
}
