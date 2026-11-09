import { useEffect, useState } from 'react';
import type { Phase, Role } from '@oncealiar/shared';
import { useGame, type GameStore } from '../../state/GameProvider';
import { COACH_COPY, coachKey } from './coachCopy';
import { coachActive, loadCoach, noteGame, saveCoach, setCoachTipsEnabled, type CoachState } from './coachStore';
import './CoachTip.css';

export { setCoachTipsEnabled, coachTipsEnabled } from './coachStore';

export interface CoachTipProps {
  phase: Phase;
  role: Role | null;
}

function useOptionalGame(): GameStore | null {
  try {
    return useGame();
  } catch {
    return null;
  }
}

/**
 * Contextual "how to play this moment" tip shown inside each phase screen.
 * Screens just render <CoachTip phase role />. A slim "editor's note" strip: TIP label, two lines
 * max (tap to expand, which also offers "Turn off all tips"), 44px dismiss. Short, dismissible,
 * remembered in localStorage, and automatically off after the player's 2nd game.
 * Returns null when there is nothing to say (or the player turned tips off).
 */
export function CoachTip({ phase, role }: CoachTipProps) {
  const store = useOptionalGame();
  const round = store?.game?.round;
  const code = store?.game?.code ?? '';
  const [coach, setCoach] = useState<CoachState>(loadCoach);
  const [open, setOpen] = useState(false);

  // count games: round 1's role-reveal deadline is unique per game start
  const gameId = round && round.number === 1 && round.phase === 'role-reveal' ? `${code}:${round.phaseEndsAt ?? 0}` : null;
  useEffect(() => {
    if (!gameId) return;
    const cur = loadCoach();
    const next = noteGame(cur, gameId);
    if (next !== cur) {
      saveCoach(next);
      setCoach(next);
    }
  }, [gameId]);

  useEffect(() => {
    const sync = () => setCoach(loadCoach());
    window.addEventListener('oal:coach', sync);
    return () => window.removeEventListener('oal:coach', sync);
  }, []);

  const key = coachKey(phase, role, !!round?.runoff?.length);
  if (!key || !coachActive(coach) || coach.dismissed.includes(key)) return null;

  const dismiss = () => {
    const next = { ...loadCoach(), dismissed: [...new Set([...coach.dismissed, key])] };
    saveCoach(next);
    setCoach(next);
  };

  return (
    <aside className={`coach-tip ${open ? 'is-open' : ''}`} role="note" aria-label="Tip" key={key}>
      <button type="button" className="coach-tip__main" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="coach-tip__label" aria-hidden="true">
          Tip
        </span>
        <span className="coach-tip__text">{COACH_COPY[key]}</span>
      </button>
      <button type="button" className="coach-tip__close" onClick={dismiss} aria-label="Dismiss tip">
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <button type="button" className="coach-tip__off" onClick={() => setCoachTipsEnabled(false)}>
          Turn off all tips
        </button>
      )}
    </aside>
  );
}
