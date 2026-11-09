import React, { useState } from 'react';
import { DEFAULT_SETTINGS, AVATARS } from '@oncealiar/shared';
import { Logo } from '../components/Logo';
import { Avatar } from '../components/Avatar';
import { Masthead, Stamp } from '../components/Paper';
import { DemoDots, DemoPhone, DEMO_SCENES, useDemoPlayer } from '../components/demo/GameDemo';
import { APP_PATH } from '../lib/landing';
import { isValidCode, parseCodeInput } from '../lib/roomCode';
import './Landing.css';

const MIN = DEFAULT_SETTINGS.minPlayers;
const MAX = DEFAULT_SETTINGS.maxPlayers;
const COLORS = ['coral', 'sky', 'sun', 'mint', 'orchid', 'tangerine', 'iris', 'lime'];

const STEPS = [
  { n: 1, h: 'Open your secret file', p: 'Everyone sees the same grid of words. Agents also see the codeword. The Spy doesn’t, and has to fake it.' },
  { n: 2, h: 'Say one word each', p: 'Prove you know the codeword without giving it away. The Spy bluffs along and tries not to stand out.' },
  { n: 3, h: 'Argue, vote, unmask', p: 'Most votes is accused. Caught? The Spy gets one guess at the codeword, and a right guess steals the round.' }
];

const FEATURES = [
  { h: 'Nothing to download', p: 'It runs in the browser. Guests scan a code or tap a link and they’re in.' },
  { h: 'Phones stay secret', p: 'Everyone’s role lives on their own phone. Add a TV screen for the room code and the scoreboard, if you like.' },
  { h: 'Try it with bots', p: 'Short on friends? Add a bot or two in the lobby and play a full round to see how it works.' },
  { h: 'A cast of characters', p: `Pick a cover identity from ${AVATARS.length} free characters. Premium packs are on the way.` },
  { h: 'Step away without losing your seat', p: 'Answer a text, lock your phone. The game keeps your place and waits for you.' },
  { h: 'First to 15 wins', p: 'Agents and the Spy both score, so everyone has a reason to play it straight, or not.' }
];

const FAQ = [
  { q: 'Do I need to download an app?', a: 'No. Open the link in any phone browser. Nothing to install and no account to make.' },
  { q: 'How many players do I need?', a: `${MIN} to ${MAX}. Five to eight is the sweet spot. You can add bots in the lobby to try a round on your own.` },
  { q: 'Do we need a TV?', a: 'No, it’s optional. If you have one, open the TV view to show the room code and scores. Roles never appear on it.' },
  { q: 'Is it free?', a: 'Yes. The full game is free. Extra packs and characters may come later as optional extras.' },
  { q: 'Can we play over a video call?', a: 'Yes. Share the invite link in the call and everyone joins from their own phone.' },
  { q: 'Who’s the Spy?', a: 'One random player each round. Everyone takes a turn as the Spy before anyone gets it twice.' }
];

function go(path: string) {
  window.location.assign(path);
}

function JoinForm({ id }: { id: string }) {
  const [code, setCode] = useState('');
  const [bad, setBad] = useState(false);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const c = parseCodeInput(code).code;
    if (!isValidCode(c)) return setBad(true);
    go(`/?room=${c}`);
  };
  return (
    <form className="land__join" onSubmit={submit}>
      <label htmlFor={id} className="sr-only">
        Room code
      </label>
      <input
        id={id}
        className={`land__code ${bad ? 'is-bad' : ''}`}
        value={code}
        onChange={(e) => {
          setBad(false);
          setCode(e.target.value); // shown in capitals by CSS; kept raw so a pasted sentence still parses
        }}
        placeholder="ABCD"
        inputMode="text"
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        maxLength={40}
        aria-invalid={bad || undefined}
      />
      <button className="btn btn--gold" type="submit">
        Join
      </button>
      {bad && (
        <p className="land__bad" role="alert">
          That’s not a room code. It’s 4 letters.
        </p>
      )}
    </form>
  );
}

export function Landing() {
  const p = useDemoPlayer();
  return (
    <div className="land">
      <header className="land__top">
        <Masthead left="Free party game" right={`${MIN}–${MAX} players`} title="The Daily Fib" as="div" />
      </header>

      <main>
        <section className="land__hero">
          <div className="land__copy">
            <Logo size="sm" />
            <h1 className="display land__h1">
              Everyone knows the codeword. <span className="land__h1-hl">Except the Spy.</span>
            </h1>
            <p className="land__sub">
              A party game for your phones. Scan a code, give one-word clues, and work out who’s faking it. No app, no account, no ads.
            </p>
            <div className="land__cta">
              <button className="btn btn--primary btn--lg btn--block" onClick={() => go(APP_PATH)}>
                Start a game
              </button>
              <div className="land__or">
                <span>or join a friend’s room</span>
              </div>
              <JoinForm id="land-code-top" />
            </div>
            <ul className="land__chips" aria-label="Highlights">
              <li className="chip">Free</li>
              <li className="chip">No download</li>
              <li className="chip">{MIN}–{MAX} players</li>
            </ul>
          </div>

          <div className="land__demo" aria-label="How a round looks on a phone">
            <Stamp rot={-7} className="land__stamp">
              Real gameplay
            </Stamp>
            <DemoPhone scene={p.scene} step={p.step} run={p.run} />
            <div className="land__cap" aria-live="polite">
              <span className="eyebrow">
                Step {p.scene + 1} of {DEMO_SCENES.length}
              </span>
              <b className="display land__cap-h">{p.current.caption}</b>
            </div>
            <DemoDots scene={p.scene} onGo={p.go} />
          </div>
        </section>

        <section className="land__sec" id="how">
          <span className="eyebrow">How to play</span>
          <h2 className="display h2">In 30 seconds.</h2>
          <ol className="land__steps">
            {STEPS.map((s) => (
              <li key={s.n} className="card land__step">
                <span className="land__n display" aria-hidden="true">
                  {s.n}
                </span>
                <div>
                  <h3 className="display h4">{s.h}</h3>
                  <p>{s.p}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="land__sec">
          <span className="eyebrow">Why it’s easy to start</span>
          <h2 className="display h2">One link. Everyone’s in.</h2>
          <div className="land__feats">
            {FEATURES.map((f) => (
              <article key={f.h} className="card card--tight land__feat">
                <h3 className="display h4">{f.h}</h3>
                <p>{f.p}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="land__sec land__cast" aria-label="Characters">
          <div className="land__cast-row" aria-hidden="true">
            {AVATARS.slice(0, 8).map((a, i) => (
              <Avatar key={a} avatar={a} color={COLORS[i % COLORS.length]} size={64} label="" animated={false} sticker />
            ))}
          </div>
          <p className="center dim">Pick a cover identity. Somebody at the table is wearing a mask.</p>
        </section>

        <section className="land__sec" id="faq">
          <span className="eyebrow">Questions</span>
          <h2 className="display h2">Before you ask.</h2>
          <div className="land__faq">
            {FAQ.map((f) => (
              <details key={f.q} className="card card--tight land__q">
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="land__final">
          <Stamp rot={-4} lg>
            Extra! Extra!
          </Stamp>
          <h2 className="display h1">One of you is lying.</h2>
          <button className="btn btn--primary btn--lg btn--block" onClick={() => go(APP_PATH)}>
            Start a game
          </button>
          <JoinForm id="land-code-bottom" />
        </section>
      </main>

      <footer className="land__foot faint">Once a Liar · free to play · {MIN}–{MAX} players · one phone each</footer>
    </div>
  );
}
