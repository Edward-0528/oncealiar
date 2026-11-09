import React from 'react';
import type { Player } from '@oncealiar/shared';
import { Avatar } from './Avatar';
import { AnimatedNumber } from './AnimatedNumber';
import { staggerDelay } from '../lib/motion';
import './RaceBoard.css';

export interface RaceRow {
  player: Player;
  /** total to show (and the bar's end) */
  score: number;
  /** total before this round: the bar grows from here, the number counts up from here */
  from?: number;
  /** "+2" chip (Results) */
  delta?: number;
  practice?: boolean;
  tag?: React.ReactNode;
  below?: React.ReactNode;
}

/** Bar scale: the finish line (or the top score past it), or the top score in fixed-round games. */
export function raceScale(target: number, scores: number[]): number {
  const top = Math.max(0, ...scores);
  return target > 0 ? Math.max(target, top) : Math.max(1, top);
}

/** A bar's width in % of the track. */
export function barPct(score: number, scale: number): number {
  return Math.max(0, Math.min(100, (score / scale) * 100));
}

/**
 * Race-to-target scoreboard: one thick bar per player filling toward the finish line.
 * Bars grow from the left on mount (scaleX, staggered over the first 6 rows), the leader is
 * inked red. `hero` = the game-over version that fills the phone.
 */
export function RaceBoard({
  rows,
  target,
  rounds,
  youId,
  winnerIds,
  hero,
  delay = 300,
  winnerBeatDelay,
  afterLabel,
  className = ''
}: {
  rows: RaceRow[];
  target: number;
  /** rounds played: labels the fixed-rounds board "after N rounds" */
  rounds: number;
  youId?: string;
  winnerIds?: string[];
  hero?: boolean;
  /** ms before the first bar starts */
  delay?: number;
  /** game over: winner's gloat lands when its bar finishes (defaults to just after) */
  winnerBeatDelay?: number;
  /** fixed-rounds header override (e.g. a session ended early) */
  afterLabel?: string;
  className?: string;
}) {
  const scale = raceScale(target, rows.map((r) => r.score));
  const top = Math.max(0, ...rows.map((r) => r.score));
  const finishPct = target > 0 ? barPct(target, scale) : null;
  const avSize = hero ? 44 : 30;
  return (
    <div
      className={`race ${hero ? 'race--hero' : ''} ${className}`}
      style={finishPct !== null ? ({ ['--finish' as string]: `${finishPct}%` } as React.CSSProperties) : undefined}
    >
      <div className="race__head" aria-hidden={finishPct !== null ? 'true' : undefined}>
        <span className="race__head-track">
          {finishPct !== null ? (
            <span className="race__finish-label">
              Finish <b>{target}</b>
            </span>
          ) : (
            <span className="race__after">{afterLabel ?? `After ${rounds} round${rounds === 1 ? '' : 's'}`}</span>
          )}
        </span>
      </div>
      {finishPct !== null && <p className="sr-only">First to {target} points wins.</p>}
      <ol className="race__list">
        {rows.map((r, i) => {
          const p = r.player;
          const lead = top > 0 && r.score === top;
          const won = !!winnerIds?.includes(p.id);
          const from = r.from ?? 0;
          // results: top-down; game over: a podium reveal — the pack first, then 3rd, 2nd, 1st last
          const d = hero ? delay + Math.max(0, 5 - i) * 160 : delay + staggerDelay(i, 90, 5);
          const pct = barPct(r.score, scale);
          return (
            <li
              key={p.id}
              className={`race__row ${lead ? 'is-lead' : ''} ${won ? 'is-winner' : ''} ${p.id === youId ? 'is-you' : ''}`}
              style={{ ['--d' as string]: `${d}ms`, ['--k' as string]: r.score > 0 ? Math.max(0, Math.min(1, from / r.score)) : 0 }}
            >
              <span className="race__av">
                <Avatar
                  avatar={p.avatar}
                  color={p.color}
                  size={avSize}
                  label=""
                  mood={won ? 'win' : 'idle'}
                  beat={won && hero ? { id: 'gloat', key: 'final', delay: winnerBeatDelay ?? d + 420 } : undefined}
                />
                {won && <span className="race__crown" aria-label="Winner">Winner</span>}
              </span>
              <span className="race__main">
                <span className="race__name">
                  <span className="race__name-txt">{p.name}</span>
                  {r.tag}
                </span>
                <span className="race__track" aria-hidden="true">
                  <span className="race__bar" data-testid="race-bar" style={{ width: `${pct}%` }} />
                  {finishPct !== null && <span className="race__line" />}
                </span>
              </span>
              <span className="race__nums">
                {r.delta !== undefined && (
                  <span className={`race__delta ${r.delta > 0 ? '' : 'is-zero'} ${r.practice ? 'is-practice' : ''}`} aria-label={r.practice ? `+${r.delta} (practice, not counted)` : `+${r.delta} this round`}>
                    +{r.delta}
                  </span>
                )}
                <span className="race__score display" aria-label={`${r.score} points`}>
                  <AnimatedNumber from={from} to={r.score} delay={d} duration={380} />
                </span>
              </span>
              {r.below && <span className="race__below">{r.below}</span>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
