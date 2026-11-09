import React, { useEffect } from 'react';
import { useGame, usePlayers } from '../state/GameProvider';
import { Avatar } from '../components/Avatar';
import { Confetti } from '../components/Confetti';
import { Icon } from '../components/Icon';
import { shareOrCopy } from '../lib/share';
import { CoachTip } from '../components/coach/CoachTip';
import { Masthead, Stamp } from '../components/Paper';
import { AwardsList } from '../components/mechanics';
import { sfx } from '../lib/sound';
import { haptic } from '../lib/haptics';
import './GameOver.css';

/** podium reactions land on the WINNER stamp's impact frame (slam at 1500ms + ~260ms) */
const PODIUM_BEAT_MS = 1760;

export function GameOver() {
  const { game, you, actions, toast } = useGame();
  const { players, isHost } = usePlayers();
  // win fanfare + haptic only on the winners' phones; everyone else gets a softer cue
  const wonAtOpen = !!game && !!you && (game.winners?.length ? game.winners : [...game.players].sort((a, b) => b.score - a.score).slice(0, 1).map((p) => p.id)).includes(you.playerId);
  useEffect(() => {
    sfx.paper();
    const t = setTimeout(() => {
      sfx.flash();
      if (wonAtOpen) {
        sfx.win();
        haptic('win');
      } else {
        sfx.lose();
        haptic('lose');
      }
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!game || !you) return null;
  const ranked = [...players].sort((a, b) => b.score - a.score);
  const winnerIds = game.winners?.length ? game.winners : ranked[0] ? [ranked[0].id] : [];
  const winners = players.filter((p) => winnerIds.includes(p.id));
  const top3 = ranked.slice(0, 3);
  const podium = [top3[1], top3[0], top3[2]];
  const me = players.find((p) => p.id === you.playerId);
  const myRank = ranked.findIndex((p) => p.id === you.playerId) + 1;
  const iWon = winnerIds.includes(you.playerId);

  const share = async () => {
    const names = winners.map((w) => w.name).join(' & ');
    const text = iWon
      ? `🎭 I just won Once a Liar with ${me?.score ?? 0} points — nobody saw through my poker face. Think you can out-bluff me?`
      : `🎭 ${names} just won our Once a Liar game with ${winners[0]?.score ?? 0} points. I came #${myRank}. Can you spot the spy?`;
    const r = await shareOrCopy({ title: 'Once a Liar', text, url: window.location.origin });
    if (r === 'copied') toast('Result copied — paste it anywhere!', 'success');
  };

  const date = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  return (
    <main className="screen screen--wide gameover">
      <Confetti count={80} />
      <Masthead left={`Game over · ${date}`} right="Final edition" title="The Daily Fib" />
      <CoachTip phase="game-over" role={you.role} />
      <h1 className="display gameover__headline">{winners.length > 1 ? 'Dead heat at the top!' : `${winners[0]?.name ?? 'Someone'} wins it all!`}</h1>
      <p className="type gameover__dek">Sources confirm: {players.length} suspects, {game.settings.roundsPerGame} rounds, zero trust left.</p>

      <section className="podium" aria-label="Podium">
        {podium.map((p, i) => {
          const place = [2, 1, 3][i];
          return p ? (
            <div key={p.id} className={`podium__col podium__col--${place}`}>
              {winnerIds.includes(p.id) && (
                <Stamp tone="solid" rot={-8} slam delay={1500} className="podium__crown">
                  Winner
                </Stamp>
              )}
              <span className="podium__photo polaroid">
                <span className="pin pin--red" aria-hidden="true" />
                <span className="polaroid__photo">
                  <Avatar avatar={p.avatar} color={p.color} size={place === 1 ? 88 : 66} label={p.name} className="podium__av" mood={winnerIds.includes(p.id) ? 'win' : 'idle'} beat={{ id: winnerIds.includes(p.id) ? 'gloat' : 'slump', key: 'final', delay: PODIUM_BEAT_MS }} />
                </span>
              </span>
              <b className="podium__name">{p.name}</b>
              <div className="podium__block">
                <span className="display podium__place">{place}</span>
                <span className="podium__pts">{p.score} pts</span>
              </div>
            </div>
          ) : (
            <div key={`empty-${i}`} />
          );
        })}
      </section>

      {!!game.awards?.length && (
        <section className="gameover__awards" aria-labelledby="awards-h">
          <h2 className="display h3 gameover__awards-h" id="awards-h">
            Also in this edition
          </h2>
          <AwardsList awards={game.awards} players={players} />
        </section>
      )}

      {ranked.length > 3 && (
        <ol className="gameover__rest" start={4}>
          {ranked.slice(3).map((p, i) => (
            <li key={p.id}>
              <span className="type">#{i + 4}</span>
              <Avatar avatar={p.avatar} color={p.color} size={30} label="" />
              <span className="spacer">{p.name}</span>
              <b className="display">{p.score}</b>
            </li>
          ))}
        </ol>
      )}

      <section className="share-card" aria-label="Your result">
        <span className="tape" aria-hidden="true" />
        <div className="share-card__head">
          <span className="display">The Daily Fib</span>
          <span className="type">Clip &amp; share</span>
        </div>
        <div className="share-card__body">
          {me && (
            <span className="share-card__mug">
              <Avatar avatar={me.avatar} color={me.color} size={64} label="" mood={iWon ? 'win' : 'idle'} beat={{ id: iWon ? 'gloat' : 'slump', key: 'final', delay: 600 }} />
            </span>
          )}
          <div>
            <b className="display h3">{iWon ? 'Top agent' : `#${myRank} of ${players.length}`}</b>
            <p className="type">{me?.score ?? 0} points tonight</p>
          </div>
        </div>
        <button className="btn btn--gold btn--block" onClick={share}>
          <Icon name="share" /> Share result
        </button>
      </section>

      <div className="stack">
        {isHost ? (
          <button className="btn btn--primary btn--lg btn--block" onClick={actions.restart}>
            Play again
          </button>
        ) : (
          <div className="waitbar">
            <span className="waitbar__dot" aria-hidden="true" />
            Waiting for the host to start a new game…
          </div>
        )}
        <button className="btn btn--quiet" onClick={actions.leave}>
          <Icon name="door" size={18} /> Leave
        </button>
      </div>
    </main>
  );
}
