import React, { useEffect, useState } from 'react';
import { useGame, usePlayers, useTopic } from '../state/GameProvider';
import { useReducedMotion } from '../state/hooks';
import { TimerPill } from '../components/Countdown';
import { TopicGrid } from '../components/TopicGrid';
import { Avatar } from '../components/Avatar';
import { Stamp } from '../components/Paper';
import { CoachTip } from '../components/coach/CoachTip';
import { sfx } from '../lib/sound';
import './Phases.css';

/** Types `text` one character at a time (with key clicks), then holds. */
function Typewriter({ text, sound, speed = 70 }: { text: string; sound?: boolean; speed?: number }) {
  const reduced = useReducedMotion();
  const [n, setN] = useState(reduced ? text.length : 0);
  useEffect(() => {
    if (reduced) return setN(text.length);
    setN(0);
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setN(i);
      if (sound && text[i - 1] && text[i - 1] !== ' ') sfx.type();
      if (i >= text.length) {
        window.clearInterval(id);
        if (sound) sfx.ding();
      }
    }, speed);
    return () => window.clearInterval(id);
  }, [text, sound, speed, reduced]);
  return (
    <span className="typewriter" aria-hidden="true">
      {text.slice(0, n)}
      <span className="typewriter__caret" />
    </span>
  );
}

function SpyIsGuessing({ words }: { words: string[] }) {
  const [k, setK] = useState(0);
  useEffect(() => {
    if (!words.length) return;
    const id = window.setInterval(() => setK((x) => x + 1), 2600);
    return () => window.clearInterval(id);
  }, [words.length]);
  const w = words.length ? words[(k * 7 + 3) % words.length] : '';
  return (
    <>
      <p className="display h2 guess__typed">
        <span className="sr-only">The spy is guessing…</span>
        <Typewriter text="The spy is guessing…" sound />
      </p>
      {w && (
        <p className="type guess__mutter" aria-hidden="true">
          <Typewriter key={k} text={`Hmm… is it ${w.toUpperCase()}?`} speed={55} />
        </p>
      )}
    </>
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
            <Stamp rot={8} className="guess__stamp">
              In custody
            </Stamp>
            <p className="type guess__lede">…but the spy gets one last shot. If they name the codeword, they steal the round.</p>
            <SpyIsGuessing words={words} />
          </div>
        </div>
        {words.length > 0 && <TopicGrid words={words} scanning label="Words the spy is choosing from" />}
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
      <div className="folder guess__file">
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
        <div className="card center stack anim-pop guess__locked">
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
              sfx.type();
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
                  <button
                    className="btn btn--primary btn--sm"
                    onClick={() => {
                      sfx.stamp();
                      setLocked(true);
                      actions.guess(pick);
                    }}
                  >
                    Lock it in
                  </button>
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
