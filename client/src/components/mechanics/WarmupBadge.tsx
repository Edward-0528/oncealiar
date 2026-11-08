import type { PublicRound } from '@oncealiar/shared';
import './mechanics.css';

/** "Warm-up round · extra time" pill. Place in the TopBar/phase header; renders only during the warm-up round. */
export function WarmupBadge({ round }: { round: Pick<PublicRound, 'warmup'> }) {
  if (!round.warmup) return null;
  return (
    <span className="mx-warmup" title="First round in this room: 50% more time on every timer">
      Warm-up round · extra time
    </span>
  );
}
