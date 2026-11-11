import { scoreLabel, type PlayerID, type RoundResult } from '@oncealiar/shared';
import './mechanics.css';

/**
 * Why a player scored this round, as small chips ("+1 Spotted the Spy").
 * Place in Results next to each player's score delta (or just for you).
 * Renders "No points" for an empty breakdown; nothing on old results without one.
 * `practice`: the practice round's points (shown, not counted) render as dashed chips.
 */
export function ScoreBreakdown({ result, playerId, compact, practice }: { result: RoundResult; playerId: PlayerID; compact?: boolean; practice?: boolean }) {
  const lines = result.scoreBreakdown?.[playerId];
  if (!lines) return null;
  if (!lines.length) return compact ? null : <span className="mx-score mx-score--none">No points</span>;
  return (
    <span className={`mx-score ${practice ? 'mx-score--practice' : ''}`}>
      {practice && !compact && <span className="mx-score__practice">Practice — not counted</span>}
      {lines.map((l) => (
        <span key={l.rule} className="mx-score__chip">
          <b>+{l.points}</b> {scoreLabel(l.rule)}
        </span>
      ))}
    </span>
  );
}

/**
 * One-line reveal extras for Results: re-vote happened, and the Spy's early lock-in.
 * Place under the "Spy caught / escaped" banner.
 */
export function RoundNotes({ result, nameOf }: { result: RoundResult; nameOf: (id: PlayerID) => string }) {
  const notes: string[] = [];
  if (result.runoff?.length) notes.push(`Decided by a sudden-death re-vote between ${result.runoff.map(nameOf).join(' & ')}.`);
  for (const [id, word] of Object.entries(result.lockedGuesses ?? {})) {
    const right = word.toLowerCase() === result.secretWord.toLowerCase();
    const pts = result.scoreBreakdown?.[id]?.find((l) => l.rule === 'spy-early-lock')?.points ?? 0;
    notes.push(`${nameOf(id)} locked in “${word}” early — ${right ? (pts > 0 ? `spot on! +${pts}` : 'spot on!') : 'wrong'}.`);
  }
  if (!notes.length) return null;
  return (
    <ul className="mx-notes">
      {notes.map((n) => (
        <li key={n}>{n}</li>
      ))}
    </ul>
  );
}
