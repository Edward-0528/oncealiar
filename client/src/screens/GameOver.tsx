import React, { useEffect } from 'react';
import { useGame, usePlayers } from '../state/GameProvider';
import { Avatar } from '../components/Avatar';
import { Confetti } from '../components/Confetti';
import { Icon } from '../components/Icon';
import { shareOrCopy } from '../lib/share';
import { CoachTip } from '../components/coach/CoachTip';
import { Masthead } from '../components/Paper';
import { RaceBoard } from '../components/RaceBoard';
import { targetOf } from '../lib/gameEnd';
import { AwardsList } from '../components/mechanics';
import { sfx } from '../lib/sound';
import { haptic } from '../lib/haptics';
import './GameOver.css';
import { ActionButton } from '../components/ActionButton';

/** the race bars start after the headline slam lands */
const RACE_START_MS = 700;

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
  const target = targetOf(game.settings);
  const ended = !!game.sessionEnded;
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
      <Masthead left={`${ended ? 'Session ended' : 'Game over'} · ${date}`} right="Final edition" title="The Daily Fib" />
      {ended ? (
        <div className="gameover__ended" role="status">
          <span className="gameover__ended-kicker">Stop the presses</span>
          <span className="gameover__ended-txt">The host ended the session. These are the final scores.</span>
        </div>
      ) : (
        <CoachTip phase="game-over" role={you.role} />
      )}
      <h1 className="display gameover__headline">{winners.length > 1 ? 'Dead heat at the top!' : `${winners[0]?.name ?? 'Someone'} wins it all!`}</h1>
      <p className="type gameover__dek">
        {ended
          ? `Session ended in round ${game.round.number}. ${players.length} suspects, zero trust left.`
          : `Sources confirm: ${players.length} suspects, ${game.round.number} rounds${target > 0 ? `, first to ${target}` : ''}, zero trust left.`}
      </p>

      <section className="gameover__race" aria-labelledby="race-h">
        <h2 className="sr-only" id="race-h">
          Final standings
        </h2>
        <RaceBoard hero target={target} rounds={game.round.number} afterLabel={ended ? `Final · round ${game.round.number}` : undefined} youId={you.playerId} winnerIds={winnerIds} delay={RACE_START_MS} rows={ranked.map((p) => ({ player: p, score: p.score }))} />
      </section>

      {!!game.awards?.length && (
        <section className="gameover__awards" aria-labelledby="awards-h">
          <h2 className="display h3 gameover__awards-h" id="awards-h">
            Also in this edition
          </h2>
          <AwardsList awards={game.awards} players={players} />
        </section>
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

      {ended ? (
        <div className="stack gameover__cta">
          <button className="btn btn--primary btn--lg btn--block" onClick={actions.leave}>
            <Icon name="door" /> Back to home
          </button>
        </div>
      ) : (
      <div className="stack gameover__cta">
        {isHost ? (
          <ActionButton className="btn btn--primary btn--lg btn--block" pendingLabel="Setting up…" onAct={() => actions.restart()}>
            Play again
          </ActionButton>
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
      )}
    </main>
  );
}
