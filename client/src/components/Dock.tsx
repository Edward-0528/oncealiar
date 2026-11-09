import React, { useState } from 'react';
import { REACTIONS } from '@oncealiar/shared';
import { useGame, useTopic } from '../state/GameProvider';
import { Icon } from './Icon';
import { Sheet } from './Sheet';
import { TopicGrid } from './TopicGrid';
import { haptic } from '../lib/haptics';
import { useCountdown } from '../state/hooks';
import { deriveDockStatus } from '../lib/dockStatus';
import { reactionStamp } from './Paper';
import { SpyLockIn } from './mechanics';
import './Dock.css';

export function ReactionBar({ compact }: { compact?: boolean }) {
  const { actions } = useGame();
  return (
    <div className={`rbar ${compact ? 'rbar--compact' : ''}`} role="group" aria-label="Stamp a reaction">
      {REACTIONS.map((e) => {
        const s = reactionStamp(e);
        return (
          <button
            key={e}
            className={`rbar__btn rbar__btn--${s.tone}`}
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

/**
 * Folded "private file" tab. Looks identical for every player when closed, so it isn't a tell.
 * Opened: the Spy gets the early lock-in; Agents get a reminder to keep their codeword hidden.
 */
export function PrivateFile() {
  const { game, you, actions } = useGame();
  const topic = useTopic();
  const [open, setOpen] = useState(false);
  if (!game || !you) return null;
  const liar = you.role === 'liar';
  return (
    <div className={`pfile ${open ? 'is-open' : ''}`}>
      <button className="pfile__tab" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <Icon name="lock" size={16} /> Private file
        <span className="pfile__hint">{open ? 'Close' : 'Tap to open · shield your screen'}</span>
      </button>
      {open && (
        <div className="pfile__body anim-paper">
          {liar ? (
            <SpyLockIn words={topic?.words ?? []} lockedGuess={you.lockedGuess} onLock={(w) => actions.guess(w)} />
          ) : (
            <p className="type pfile__note">
              Nothing to file, Agent. Keep your codeword to yourself and watch for vague clues.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/** Press-and-hold to re-peek your role/secret. Releasing hides it again. */
export function PeekButton({ block }: { block?: boolean }) {
  const { you } = useGame();
  const topic = useTopic();
  const [on, setOn] = useState(false);
  const liar = you?.role === 'liar';
  const start = (e: React.SyntheticEvent) => {
    e.preventDefault();
    setOn(true);
    haptic('thud');
  };
  const end = () => setOn(false);
  return (
    <button
      className={`peek ${on ? 'is-on' : ''} ${liar ? 'peek--liar' : ''} ${block ? 'peek--block' : ''}`}
      onPointerDown={start}
      onPointerUp={end}
      onPointerLeave={end}
      onPointerCancel={end}
      onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && !e.repeat && start(e)}
      onKeyUp={end}
      onContextMenu={(e) => e.preventDefault()}
      aria-label="Hold to peek at your codeword"
    >
      <span className="peek__hint">
        <Icon name="eye" size={18} /> Hold to peek
      </span>
      <span className="peek__secret" aria-live="polite">
        {on && (liar ? <>Spy · codeword unknown{topic ? ` · ${topic.name}` : ''}</> : <span className="hl">{you?.secretWord}</span>)}
      </span>
    </button>
  );
}

export function GridSheetButton() {
  const topic = useTopic();
  const [open, setOpen] = useState(false);
  if (!topic) return null;
  return (
    <>
      <button className="dock__btn" onClick={() => setOpen(true)} aria-label="Show topic grid">
        <Icon name="grid" />
        <span>Intel</span>
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={`${topic.emoji} ${topic.name}`}>
        <TopicGrid words={topic.words} />
        <PeekButton block />
      </Sheet>
    </>
  );
}

/**
 * One-line status: "YOU: <what to do>" or "WAITING ON: <names> (0:12)".
 * Same wording for every role; renders nothing when the state is unclear.
 */
export function DockStatusLine() {
  const { game, you } = useGame();
  const ms = useCountdown(game?.round.phaseEndsAt);
  const st = deriveDockStatus(game, you, ms);
  if (!st) return null;
  return (
    <div className={`dock__status dock__status--${st.kind}`}>
      <span className="dock__status-text" role="status">
        <b>{st.kind === 'you' ? 'You:' : 'Waiting on:'}</b> {st.text}
      </span>
      {st.time && (
        <span className="dock__status-time" aria-hidden="true">
          {st.time}
        </span>
      )}
    </div>
  );
}

/** Persistent bottom dock during a round: status line, then grid, peek, reactions. */
export function GameDock({ showReactions = true }: { showReactions?: boolean }) {
  const [react, setReact] = useState(false);
  return (
    <div className="dock">
      {react && showReactions && (
        <div className="dock__pop anim-pop">
          <ReactionBar compact />
        </div>
      )}
      <div className="dock__bar">
        <DockStatusLine />
        <div className="dock__row">
          <GridSheetButton />
          <PeekButton />
          {showReactions && (
            <button className={`dock__btn ${react ? 'is-on' : ''}`} onClick={() => setReact((r) => !r)} aria-expanded={react} aria-label="Reaction stamps">
              <Icon name="smile" />
              <span>Stamp</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
