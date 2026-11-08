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
 * Screens just render <CoachTip phase role />. Short, role-specific, dismissible,
 * remembered in localStorage, and automatically off after the player's 2nd game.
 * Returns null when there is nothing to say (or the player turned tips off).
 */
export function CoachTip({ phase, role }: CoachTipProps) {
  const store = useOptionalGame();
  const round = store?.game?.round;
  const code = store?.game?.code ?? '';
  const [coach, setCoach] = useState<CoachState>(loadCoach);

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
    <aside className="coach-tip" role="note" aria-label="Tip" key={key}>
      <span className="coach-tip__icon" aria-hidden="true">💡</span>
      <div className="coach-tip__body">
        <p className="coach-tip__text">{COACH_COPY[key]}</p>
        <button type="button" className="coach-tip__off" onClick={() => setCoachTipsEnabled(false)}>
          Turn off tips
        </button>
      </div>
      <button type="button" className="coach-tip__close" onClick={dismiss} aria-label="Dismiss tip">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </button>
    </aside>
  );
}
