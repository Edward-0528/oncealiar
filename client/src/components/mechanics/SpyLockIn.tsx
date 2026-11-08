import { useState } from 'react';
import { SCORE } from '@oncealiar/shared';
import './mechanics.css';

interface Props {
  /** the grid words (useTopic()?.words) */
  words: string[];
  /** you.lockedGuess */
  lockedGuess: string | null | undefined;
  /** actions.guess(word) — the server treats guess:submit as a lock-in during clues/discussion/voting */
  onLock: (word: string) => void;
}

/**
 * Spy-only "lock in an early guess" control for Clues (after your turn), Discussion and Voting.
 * Render only when you.role === 'liar' and phase ∈ clues|discussion|voting.
 * Collapsed by default so it isn't a visible tell across the room.
 */
export function SpyLockIn({ words, lockedGuess, onLock }: Props) {
  const [open, setOpen] = useState(false);
  const [pick, setPick] = useState<string | null>(null);

  if (lockedGuess) {
    return (
      <div className="mx-lock mx-lock--done" role="status">
        <span aria-hidden="true">🔒</span> Locked in: <b>{lockedGuess}</b>
        <span className="mx-lock__hint">+{SCORE['spy-early-lock']} if right · your final answer if caught</span>
      </div>
    );
  }
  if (!open) {
    return (
      <button type="button" className="mx-lock__open" onClick={() => setOpen(true)}>
        <span aria-hidden="true">🔒</span> Know the codeword? Lock it in for +{SCORE['spy-early-lock']}
      </button>
    );
  }
  return (
    <div className="mx-lock">
      <p className="mx-lock__title">Pick the codeword. It's final if you get caught.</p>
      <div className="mx-lock__words" role="radiogroup" aria-label="Codeword guess">
        {words.map((w) => (
          <button key={w} type="button" role="radio" aria-checked={pick === w} className={`mx-chip ${pick === w ? 'is-on' : ''}`} onClick={() => setPick(w)}>
            {w}
          </button>
        ))}
      </div>
      <div className="mx-lock__actions">
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => (setOpen(false), setPick(null))}>
          Not yet
        </button>
        <button type="button" className="btn btn--primary btn--sm" disabled={!pick} onClick={() => pick && onLock(pick)}>
          Lock in {pick ?? ''}
        </button>
      </div>
    </div>
  );
}
