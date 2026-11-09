import React, { useState } from 'react';
import { WARMUP_FACTOR } from '@oncealiar/shared';
import { useGame, usePlayers, useTopic } from '../state/GameProvider';
import { CountdownRing } from '../components/Countdown';
import { TopicGrid } from '../components/TopicGrid';
import { PeekButton, PrivateFile } from '../components/Dock';
import { ReactionPad, ReactionSplash } from '../components/ReactionSplash';
import { Sheet } from '../components/Sheet';
import { ClueList } from './Clues';
import { Icon } from '../components/Icon';
import { CoachTip } from '../components/coach/CoachTip';
import { haptic } from '../lib/haptics';
import { formatClock } from '../lib/dockStatus';
import { useCountdown } from '../state/hooks';
import './Phases.css';
import './Discussion.css';

/**
 * "Look up" screen: the phone should push faces up, not eyes down. Default view is a big clock,
 * one instruction and a compact clue list. The private file (topic grid, peek, Spy lock-in) sits
 * behind a single button that looks identical for every role.
 */
/** Big m:ss inside the ring — readable from arm's length. */
function BigClock({ endsAt }: { endsAt: number | null }) {
  const ms = useCountdown(endsAt);
  const clock = formatClock(ms);
  if (!clock) return null;
  return (
    <span className="discuss__clock" role="timer" aria-label={`${Math.ceil((ms ?? 0) / 1000)} seconds of debate left`}>
      {clock}
    </span>
  );
}

export function Discussion() {
  const { game, you, actions } = useGame();
  const { isHost } = usePlayers();
  const topic = useTopic();
  const [file, setFile] = useState(false);
  if (!game || !you) return null;
  const total = game.settings.discussionSeconds * (game.round.warmup ? WARMUP_FACTOR : 1);
  return (
    <main className="screen discuss">
      <p className="discuss__meta type">Round {game.round.number} · Open debate · voting when the clock runs out</p>
      <section className="discuss__hero" aria-labelledby="discuss-h">
        <CountdownRing endsAt={game.round.phaseEndsAt} totalSeconds={total} size={156} tick label="Debate time left">
          <BigClock endsAt={game.round.phaseEndsAt} />
        </CountdownRing>
        <h1 className="display discuss__title" id="discuss-h">
          Look up.
          <span className="discuss__title-sub">Who’s the Spy?</span>
        </h1>
        <p className="type discuss__lede">Phones down. Ask about clues, watch faces.</p>
      </section>
      <CoachTip phase="discussion" role={you.role} />

      <section className="discuss__log" aria-labelledby="discuss-log-h">
        <h2 className="eyebrow" id="discuss-log-h">
          Statements on file
        </h2>
        <ClueList />
      </section>

      <section className="discuss__react" aria-labelledby="discuss-react-h">
        <h2 className="eyebrow" id="discuss-react-h">
          Stamp a reaction · everyone sees it
        </h2>
        <ReactionPad />
      </section>
      <ReactionSplash />

      <button
        className="btn btn--block discuss__file"
        onClick={() => {
          haptic('tick');
          setFile(true);
        }}
        aria-haspopup="dialog"
      >
        <Icon name="lock" size={18} /> Peek at my file
      </button>
      <Sheet open={file} onClose={() => setFile(false)} title="Your private file">
        <div className="stack discuss__sheet">
          <p className="type discuss__shield">Shield your screen.</p>
          {topic ? (
            <>
              <h3 className="display h3">
                {topic.emoji} {topic.name}
              </h3>
              <TopicGrid words={topic.words} />
            </>
          ) : (
            <p className="type center">The topic is classified for you this game. Listen to the clues!</p>
          )}
          <PeekButton block />
          <PrivateFile />
        </div>
      </Sheet>

      {isHost && (
        <button className="btn btn--block discuss__host" onClick={actions.skip}>
          <span className="discuss__host-tag">Host</span>
          <Icon name="skip" size={18} /> Skip to voting
        </button>
      )}
    </main>
  );
}
