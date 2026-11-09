import React, { useState } from 'react';
import { useGame, usePlayers, useTopic } from '../state/GameProvider';
import { TimerPill } from '../components/Countdown';
import { TopicGrid } from '../components/TopicGrid';
import { Avatar } from '../components/Avatar';
import { Stamp } from '../components/Paper';
import { CoachTip } from '../components/coach/CoachTip';
import { sfx } from '../lib/sound';
import './Phases.css';
import { ActionButton } from '../components/ActionButton';

/**
 * Calm waiting state for everyone but the Spy. No invented "is it X?" guesses, no typewriter
 * clicks on every phone — the drama is the Spy's face, so point eyes there.
 */
function SpyIsGuessing() {
  return (
    <div className="guess__waiting" role="status">
      <span className="guess__pulse" aria-hidden="true" />
      <p className="display h3 guess__waiting-h">The Spy is making their last guess</p>
      <p className="type guess__waiting-sub">Look up and watch their face.</p>
    </div>
  );
}

export function LiarGuess() {
  const { game, you, actions } = useGame();
  const { me } = usePlayers();
  const topic = useTopic();
  const [pick, setPick] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  if (!game || !you) return null;
  const liar = you.role === 'liar';
  const words = topic?.words ?? [];

  if (!liar) {
    return (
      <main className="screen guess guess--wait">
        <header className="masthead">
          <div className="masthead__meta">
            <span>Round {game.round.number} · Breaking</span>
            <span>Interrogation room</span>
          </div>
          <div className="masthead__row">
            <h1 className="masthead__title">Spy caught!</h1>
            <TimerPill endsAt={game.round.phaseEndsAt} />
          </div>
        </header>
        <CoachTip phase="liar-guess" role={you.role} />
        <div className="guess__suspect folder">
          <div className="folder__body">
            <Stamp rot={-8} className="guess__stamp">
              In custody
            </Stamp>
            <p className="type guess__lede">…but the spy gets one last shot. If they name the codeword, they steal the round.</p>
            <SpyIsGuessing />
          </div>
        </div>
        {words.length > 0 && <TopicGrid words={words} label="Words the spy is choosing from" />}
      </main>
    );
  }

  return (
    <main className="screen guess">
      <header className="masthead">
        <div className="masthead__meta">
          <span>Round {game.round.number} · Interrogation</span>
          <span>One guess only</span>
        </div>
        <div className="masthead__row">
          <h1 className="masthead__title">Last chance, Spy.</h1>
          <TimerPill endsAt={game.round.phaseEndsAt} tick />
        </div>
      </header>
      <CoachTip phase="liar-guess" role={you.role} />
      <div className="folder guess__file spy-face">
        <div className="folder__body guess__file-body">
          <Stamp rot={-7} slam className="guess__stamp">
            Cover blown
          </Stamp>
          {me && (
            <span className="guess__mug">
              <Avatar avatar={me.avatar} color={me.color} size={56} masked label="You, caught" />
            </span>
          )}
          <p className="type">Name the codeword and you steal the round. Get it wrong and the agents win.</p>
        </div>
      </div>
      {locked ? (
        <div className="card card--hero center stack anim-pop guess__locked spy-face">
          <span className="eyebrow">Locked in</span>
          <p className="display h1">
            <span className="hl">{pick}</span>
          </p>
          <p className="type">Fingers crossed…</p>
        </div>
      ) : (
        <>
          <TopicGrid
            words={words}
            selectable
            selected={pick}
            onSelect={(w) => {
              sfx.tap();
              setPick(w);
            }}
            label="Guess the codeword"
          />
          <div className={`guess__confirm ${pick ? 'is-on' : ''}`}>
            {pick ? (
              <>
                <span className="guess__q">
                  Lock in <b className="display">“{pick}”</b>?
                </span>
                <div className="row">
                  <button className="btn btn--sm" onClick={() => setPick(null)}>
                    Change
                  </button>
                  <ActionButton
                    className="btn btn--primary btn--sm"
                    pendingLabel="Locking…"
                    onAct={async () => {
                      sfx.stamp();
                      const ok = await actions.guess(pick);
                      if (ok) setLocked(true);
                      return ok;
                    }}
                  >
                    Lock it in
                  </ActionButton>
                </div>
              </>
            ) : (
              <span className="type">Tap a word to choose it.</span>
            )}
          </div>
        </>
      )}
    </main>
  );
}
