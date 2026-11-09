import type { PublicRound } from '@oncealiar/shared';
import './mechanics.css';

/**
 * Pill for the room's first round. Practice round (points don't count, extra time) when
 * `round.practice`; otherwise the older warm-up wording. Renders nothing in normal rounds.
 */
export function WarmupBadge({ round }: { round: Pick<PublicRound, 'warmup' | 'practice'> }) {
  if (round.practice) {
    return (
      <span className="mx-warmup mx-warmup--practice" title="First round: 50% more time on every timer, and its points don’t count">
        Practice round · points don’t count
      </span>
    );
  }
  if (!round.warmup) return null;
  return (
    <span className="mx-warmup" title="First round in this room: 50% more time on every timer">
      Warm-up round · extra time
    </span>
  );
}
