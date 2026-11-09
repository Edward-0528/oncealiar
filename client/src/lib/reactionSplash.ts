/**
 * Full-screen reaction queue for the discussion phase. At most ONE splash is on screen; any
 * reaction that arrives while it's up only bumps its "+N" counter (and is then dropped), so a
 * burst of taps reads as one big stamp with "+3", never a pile-up.
 */
export interface SplashItem {
  id: string | number;
  emoji: string;
  playerId: string;
}

export interface SplashState<T extends SplashItem = SplashItem> {
  current: T | null;
  /** reactions folded into the current splash */
  extra: number;
}

export const SPLASH_MS = 1100;

export function createSplashQueue<T extends SplashItem>(onChange: (s: SplashState<T>) => void, showMs = SPLASH_MS) {
  let state: SplashState<T> = { current: null, extra: 0 };
  let timer: ReturnType<typeof setTimeout> | null = null;
  const set = (s: SplashState<T>) => {
    state = s;
    onChange(s);
  };
  return {
    /** returns 'shown' for a new splash, 'folded' when it only bumped the counter */
    push(item: T): 'shown' | 'folded' {
      if (state.current) {
        set({ current: state.current, extra: state.extra + 1 });
        return 'folded';
      }
      set({ current: item, extra: 0 });
      timer = setTimeout(() => {
        timer = null;
        set({ current: null, extra: 0 });
      }, showMs);
      return 'shown';
    },
    get state() {
      return state;
    },
    dispose() {
      if (timer) clearTimeout(timer);
      timer = null;
    }
  };
}
