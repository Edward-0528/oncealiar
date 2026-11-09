import React, { useEffect, useRef, useState } from 'react';
import { REACTIONS } from '@oncealiar/shared';
import { useGame, usePlayers } from '../state/GameProvider';
import { Avatar } from './Avatar';
import { Stamp, reactionStamp } from './Paper';
import { haptic } from '../lib/haptics';
import { sfx } from '../lib/sound';
import { createStampThrottle } from '../lib/stampThrottle';
import { createSplashQueue, type SplashState } from '../lib/reactionSplash';
import type { FloatingReaction } from '../state/GameProvider';
import './ReactionSplash.css';

/**
 * Discussion-only: every reaction (yours included) slams full screen on every phone for ~1.1s.
 * One at a time; a burst folds into a "+N" counter on the splash that's up. Sound uses the
 * shared stamp throttle (full thunk, then soft taps, then silence).
 */
export function ReactionSplash() {
  const { reactions } = useGame();
  const { byId } = usePlayers();
  const [state, setState] = useState<SplashState<FloatingReaction>>({ current: null, extra: 0 });
  // reactions already on screen when the phase opened don't replay
  const seen = useRef(new Set<string | number>(reactions.map((r) => r.id)));
  const queue = useRef<ReturnType<typeof createSplashQueue<FloatingReaction>> | null>(null);
  const throttle = useRef(createStampThrottle());
  if (!queue.current) queue.current = createSplashQueue<FloatingReaction>(setState);
  useEffect(() => () => queue.current?.dispose(), []);

  useEffect(() => {
    reactions.forEach((r) => {
      if (seen.current.has(r.id)) return;
      seen.current.add(r.id);
      queue.current!.push(r);
      const level = throttle.current(Date.now());
      if (level === 'full') sfx.stamp();
      else if (level === 'soft') sfx.stampSoft();
    });
  }, [reactions]);

  const r = state.current;
  if (!r) return null;
  const p = byId(r.playerId);
  const s = reactionStamp(r.emoji);
  return (
    <div className="rsplash" key={r.id} aria-hidden="true" data-testid="reaction-splash">
      <div className="rsplash__stack">
        <Stamp tone={s.tone} rot={-8} slam className="rsplash__stamp">
          {s.label}
        </Stamp>
        {state.extra > 0 && (
          <span className="rsplash__more" key={state.extra} data-testid="reaction-splash-more">
            +{state.extra}
          </span>
        )}
        {p && (
          <span className="rsplash__who">
            <Avatar avatar={p.avatar} color={p.color} size={40} label="" />
            {p.name}
          </span>
        )}
      </div>
    </div>
  );
}

/** Big reaction tiles for the discussion screen: 3 × 2 grid, Anton labels, ≥64px tall. */
export function ReactionPad() {
  const { actions } = useGame();
  return (
    <div className="rpad" role="group" aria-label="Stamp a reaction">
      {REACTIONS.map((e) => {
        const s = reactionStamp(e);
        return (
          <button
            key={e}
            type="button"
            className={`rpad__btn rpad__btn--${s.tone}`}
            onClick={() => {
              actions.react(e);
              haptic('tick');
            }}
            aria-label={`Stamp ${s.label} (${s.name})`}
          >
            {s.label}
          </button>
        );
      })}
    </div>
  );
}
