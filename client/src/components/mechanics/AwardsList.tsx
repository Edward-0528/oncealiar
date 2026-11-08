import { AWARDS, awardBlurb, type Award, type Player } from '@oncealiar/shared';
import './mechanics.css';

/**
 * Game-over awards ("Sharpest Eye", "Smoothest Spy", …) from state.awards.
 * Place on GameOver under the podium/winner. Renders nothing without awards.
 */
export function AwardsList({ awards, players }: { awards: Award[] | undefined; players: Player[] }) {
  if (!awards?.length) return null;
  return (
    <ul className="mx-awards" aria-label="Awards">
      {awards.map((a, i) => {
        const copy = AWARDS[a.id];
        const winners = a.playerIds.map((id) => players.find((p) => p.id === id)).filter((p): p is Player => !!p);
        if (!copy || !winners.length) return null;
        return (
          <li key={a.id} className="mx-award" style={{ animationDelay: `${i * 0.12}s` }}>
            <span className="mx-award__emoji" aria-hidden="true">{copy.emoji}</span>
            <span className="mx-award__body">
              <span className="mx-award__title">{copy.title}</span>
              <span className="mx-award__who">
                {winners.map((p) => (
                  <span key={p.id} className="mx-award__name">
                    <i style={{ background: `var(--pc-${p.color}, var(--accent))` }} aria-hidden="true" />
                    {p.name}
                  </span>
                ))}
              </span>
              <span className="mx-award__blurb">{awardBlurb(a.id, a.value)}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
