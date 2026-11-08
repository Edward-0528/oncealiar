import React from 'react';
import { useGame, usePlayers, useTopic } from '../state/GameProvider';
import { TimerPill } from '../components/Countdown';
import { TopicGrid } from '../components/TopicGrid';
import { PeekButton, PrivateFile, ReactionBar } from '../components/Dock';
import { ClueList } from './Clues';
import { Icon } from '../components/Icon';
import { CoachTip } from '../components/coach/CoachTip';
import './Phases.css';

export function Discussion() {
  const { game, you, actions } = useGame();
  const { isHost } = usePlayers();
  const topic = useTopic();
  if (!game || !you) return null;
  return (
    <main className="screen screen--wide discuss">
      <header className="masthead">
        <div className="masthead__meta">
          <span>Round {game.round.number} · Open debate</span>
          <span>Voting when the clock runs out</span>
        </div>
        <div className="masthead__row">
          <h1 className="masthead__title">Who’s the spy?</h1>
          <TimerPill endsAt={game.round.phaseEndsAt} tick />
        </div>
      </header>
      <CoachTip phase="discussion" role={you.role} />
      <p className="type discuss__lede">Grill the suspicious ones. Defend your clue. Point fingers responsibly.</p>

      <div className="discuss__cols">
        <section className="card stack discuss__intel">
          {topic ? (
            <>
              <h2 className="display h3">
                Intel: {topic.emoji} {topic.name}
              </h2>
              <TopicGrid words={topic.words} />
            </>
          ) : (
            <p className="type center">The topic is classified for you this game. Listen to the clues!</p>
          )}
          <PeekButton block />
          <PrivateFile />
        </section>
        <section className="card stack discuss__log">
          <h2 className="display h3">Statements on file</h2>
          <ClueList />
        </section>
      </div>

      <div className="discuss__react">
        <span className="eyebrow center">Stamp a reaction</span>
        <ReactionBar />
      </div>
      {isHost && (
        <button className="btn btn--ghost btn--block" onClick={actions.skip}>
          <Icon name="skip" size={18} /> Skip to voting
        </button>
      )}
    </main>
  );
}
