import type { Player, PlayerID, PublicRound } from '@oncealiar/shared';
import './mechanics.css';

/** true if `id` may be voted for right now (during a re-vote only the tied players). */
export function isVoteTarget(round: Pick<PublicRound, 'runoff'>, id: PlayerID, myId?: PlayerID | null): boolean {
  if (id === myId) return false;
  return !round.runoff?.length || round.runoff.includes(id);
}

/**
 * Sudden-death banner for the Voting screen. Renders nothing unless a re-vote is running.
 * Place at the top of Voting, above the player grid; dim/disable tiles where !isVoteTarget().
 */
export function RunoffBanner({ round, players }: { round: Pick<PublicRound, 'runoff'>; players: Player[] }) {
  if (!round.runoff?.length) return null;
  const names = round.runoff.map((id) => players.find((p) => p.id === id)?.name ?? '?');
  const list = names.length === 2 ? `${names[0]} or ${names[1]}` : `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}`;
  return (
    <div className="mx-runoff" role="status" aria-live="assertive">
      <span className="mx-runoff__flag">Sudden death</span>
      <p className="mx-runoff__text">
        It's a tie! Vote again: <b>{list}</b>?
      </p>
      <p className="mx-runoff__sub">Still tied after 10 seconds? The Spy slips away.</p>
    </div>
  );
}
