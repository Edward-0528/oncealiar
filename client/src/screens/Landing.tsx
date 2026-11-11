import React, { useState } from 'react';
import { DEFAULT_SETTINGS, AVATARS } from '@oncealiar/shared';
import { Logo } from '../components/Logo';
import { AccountSheet } from '../components/AccountSheet';
import { useAccount } from '../state/account';
import { Avatar } from '../components/Avatar';
import { APP_PATH } from '../lib/landing';
import { isValidCode, parseCodeInput } from '../lib/roomCode';
import './Landing.css';

const MIN = DEFAULT_SETTINGS.minPlayers;
const MAX = DEFAULT_SETTINGS.maxPlayers;
const COLORS = ['coral', 'sky', 'sun', 'mint', 'orchid', 'tangerine'];
const OCCASIONS = ['Living room', 'Video call', 'Road trip', 'Pub table'];

const TIMELINE = [
  { t: '0:30', p: 'Everyone joins on their phone and picks a cover identity.' },
  { t: '1 min', p: 'Secret files open. Agents learn the codeword; the Spy doesn’t.' },
  { t: '3 min', p: 'One-word clues, then the argument.' },
  { t: '30 sec', p: 'Vote. If the Spy is caught, they get one guess.' }
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
  const { enabled, session } = useAccount();
  const [signIn, setSignIn] = useState(false);
  const openSignIn = () => setSignIn(true);
  return (
    <div className="land">
      <header className="land__top">
        <Logo size="sm" />
        {enabled && (
          <button className="land__signin" onClick={openSignIn}>
            {session ? 'Account' : 'Sign in'}
          </button>
        )}
      </header>

      <main>
        <section className="land__hero">
          <h1 className="display land__h1">Game night, sorted in 30 seconds.</h1>
          <p className="land__sub">
            One person starts, everyone scans a code. A bluffing game for {MIN} to {MAX} phones, with no app to install.
          </p>
          <ul className="land__chips" aria-label="Where to play">
            {OCCASIONS.map((o) => (
              <li key={o} className="chip">
                {o}
              </li>
            ))}
          </ul>
        </section>

        <section className="land__panel" aria-label="Join or host">
          <span className="eyebrow">Got a room code?</span>
          <JoinForm id="land-code" />
          <div className="land__or">
            <span>or</span>
          </div>
          <button className="btn btn--primary btn--lg btn--block" onClick={() => go(APP_PATH)}>
            Host a new game
          </button>
        </section>

        <section className="land__sec" id="how">
          <span className="eyebrow">What a round looks like</span>
          <ol className="land__time">
            {TIMELINE.map((s) => (
              <li key={s.t}>
                <time className="display">{s.t}</time>
                <p>{s.p}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="land__sec" aria-label="Characters">
          <span className="eyebrow">Pick a face</span>
          <div className="land__faces" aria-hidden="true">
            {AVATARS.slice(0, 6).map((a, i) => (
              <Avatar key={a} avatar={a} color={COLORS[i % COLORS.length]} size={46} label="" animated={false} sticker />
            ))}
          </div>
          <p className="dim">Somebody at the table is wearing a mask.</p>
        </section>

        {enabled && (
          <section className="land__save" aria-label="Save your wins">
            <h2 className="display h3">Save your wins</h2>
            <ul>
              <li>Keep your game history</li>
              <li>Use a Party Pass on any phone</li>
            </ul>
            <div className="land__save-row">
              <button className="btn btn--gold" onClick={openSignIn}>
                {session ? 'Your account' : 'Sign in'}
              </button>
              <span className="dim">Optional. Guests play free.</span>
            </div>
          </section>
        )}
      </main>

      <footer className="land__foot faint">Free to play · one phone each · {MIN}–{MAX} players</footer>
      <AccountSheet open={signIn} onClose={() => setSignIn(false)} />
    </div>
  );
}
