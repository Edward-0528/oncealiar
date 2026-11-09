import type { PlayerID, PrivateView, PublicGameState } from '@oncealiar/shared';

export interface DockStatus {
  kind: 'you' | 'waiting';
  /** what to do (kind=you) or who we're waiting on (kind=waiting) */
  text: string;
  /** "m:ss" left in the phase, or null if untimed / unknown */
  time: string | null;
}

export function formatClock(ms: number | null | undefined): string | null {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) return null;
  const secs = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
}

/** "Ana", "Ana & Ben", "Ana, Ben +2" */
export function listNames(names: string[], max = 2): string {
  if (names.length <= max) return names.join(names.length === 2 ? ' & ' : ', ');
  return `${names.slice(0, max).join(', ')} +${names.length - max}`;
}

/**
 * One-line dock status, derived only from public state + your own private view, and worded
 * identically for every role (no tells). Returns null whenever the state is unclear.
 */
export function deriveDockStatus(game: PublicGameState | null | undefined, you: PrivateView | null | undefined, msLeft: number | null): DockStatus | null {
  if (!game || !you) return null;
  const me = game.players.find((p) => p.id === you.playerId);
  if (!me) return null;
  const time = formatClock(msLeft);
  const r = game.round;
  const waitingOn = (ids: PlayerID[]): DockStatus | null => {
    const names = ids
      .map((id) => game.players.find((p) => p.id === id))
      .filter((p): p is NonNullable<typeof p> => !!p && p.presence !== 'offline')
      .map((p) => p.name);
    return names.length ? { kind: 'waiting', text: listNames(names), time } : null;
  };

  switch (r.phase) {
    case 'briefing':
      if (!me.ready) return { kind: 'you', text: 'Watch the demo, then tap I’m ready', time: null };
      return waitingOn(game.players.filter((p) => !p.ready && p.id !== me.id).map((p) => p.id));
    case 'role-reveal':
      if (!me.ready) return { kind: 'you', text: 'Read your card, then tap Got it', time };
      return waitingOn(game.players.filter((p) => !p.ready && p.id !== me.id).map((p) => p.id));
    case 'clues': {
      const current = r.turnOrder[r.currentTurn];
      if (!current) return null;
      if (current === me.id) return { kind: 'you', text: game.settings.clueMode === 'typed' ? 'Type your one-word clue' : 'Say your clue out loud', time };
      return waitingOn([current]);
    }
    case 'discussion':
      return { kind: 'you', text: 'Look up and talk it out', time };
    case 'voting': {
      if (!you.myVote && !me.hasVoted) return { kind: 'you', text: r.runoff ? 'Sudden death: vote again' : 'Vote for the Spy', time };
      return waitingOn(game.players.filter((p) => !p.hasVoted && p.id !== me.id).map((p) => p.id));
    }
    default:
      return null;
  }
}
