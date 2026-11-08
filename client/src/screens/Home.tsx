import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useGame } from '../state/GameProvider';
import { Logo } from '../components/Logo';
import { CodeInput } from '../components/CodeInput';
import { Avatar } from '../components/Avatar';
import { Icon } from '../components/Icon';
import { HowToPlay } from '../components/HowToPlay';
import { InstallHint } from '../components/Overlays';
import { loadRecent, loadSession } from '../lib/storage';
import { isValidCode } from '../lib/roomCode';
import { sfx } from '../lib/sound';
import './Home.css';

export type Intent = { kind: 'host' } | { kind: 'join'; code: string } | { kind: 'edit' };

/** small delay after the 4th letter so people see what they typed before we jump */
const AUTO_JOIN_DELAY_MS = 300;

export function Home({ onProfile, initialCode = '' }: { onProfile: (intent: Intent) => void; initialCode?: string }) {
  const { profile, actions, busy, autoProfile } = useGame();
  const [code, setCode] = useState(initialCode.toUpperCase().slice(0, 4));
  const [failed, setFailed] = useState<string | null>(null);
  const [help, setHelp] = useState(false);
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasName = profile.name.trim().length > 0;

  const session = useMemo(() => loadSession(), []);
  const recent = useMemo(() => loadRecent().filter((r) => r.code !== session?.code), [session]);

  useEffect(() => () => {
    if (autoTimer.current) clearTimeout(autoTimer.current);
  }, []);

  const host = () => {
    sfx.tap();
    void actions.host();
  };
  const join = async (c = code) => {
    if (!isValidCode(c) || busy) return;
    sfx.tap();
    const ok = await actions.joinCode(c);
    if (!ok) setFailed(c);
  };
  const rejoin = async (c: string, token: string) => {
    sfx.tap();
    const ok = await actions.rejoin(c, token);
    if (!ok) setCode(c);
  };

  return (
    <main className="screen home">
      <section className="home__hero anim-rise">
        <Logo />
        <p className="home__tag dim">The party game where someone’s lying.</p>
      </section>

      {session && (
        <button className="home__rejoin card" onClick={() => void rejoin(session.code, session.token)} disabled={busy}>
          <span className="home__rejoin-live" aria-hidden="true" />
          <span className="home__rejoin-text">
            <span className="eyebrow">Game in progress</span>
            <span className="home__rejoin-title">Rejoin your game ({session.code})</span>
          </span>
          <Icon name="right" />
        </button>
      )}

      <button className="home__me card card--tight" onClick={() => onProfile({ kind: 'edit' })} aria-label="Edit your profile">
        <Avatar avatar={profile.avatar} color={profile.color} size={44} label="" />
        <span className="home__me-name">{hasName ? profile.name : 'Pick your look'}</span>
        <span className="chip">
          <Icon name="edit" size={14} /> {hasName && !autoProfile ? 'Edit' : 'Change'}
        </span>
      </button>

      <div className="stack anim-rise" style={{ animationDelay: '80ms' }}>
        <button className="btn btn--primary btn--lg btn--block" onClick={host} disabled={busy}>
          Host a game
        </button>

        <form
          className="card home__join"
          onSubmit={(e) => {
            e.preventDefault();
            void join();
          }}
        >
          <div className="row">
            <h2 className="display h3">Got a code?</h2>
            <span className="spacer" />
            {initialCode && <span className="chip chip--gold">Invite</span>}
          </div>
          <CodeInput
            value={code}
            invalid={!!failed && failed === code}
            disabled={busy}
            onChange={(v) => {
              setCode(v);
              if (autoTimer.current) clearTimeout(autoTimer.current);
            }}
            onComplete={(v) => {
              if (failed === v) return; // don't loop on a code that just failed
              if (autoTimer.current) clearTimeout(autoTimer.current);
              autoTimer.current = setTimeout(() => void join(v), AUTO_JOIN_DELAY_MS);
            }}
          />
          <button className="btn btn--gold btn--block" type="submit" disabled={code.length !== 4 || busy}>
            {busy && code.length === 4 ? `Joining ${code}…` : code.length === 4 ? `Join ${code}` : 'Join game'}
          </button>
          <p className="home__paste faint">Tip: paste an invite link straight into the boxes.</p>
        </form>

        {recent.length > 0 && (
          <section className="home__recent" aria-label="Recent rooms">
            <span className="eyebrow">Recent rooms</span>
            <div className="row row--wrap">
              {recent.map((r) => (
                <button key={r.code} className="chip home__recent-chip" onClick={() => void rejoin(r.code, r.token)} disabled={busy}>
                  <span className="home__recent-code">{r.code}</span>
                  {r.name && <span className="faint">as {r.name}</span>}
                </button>
              ))}
            </div>
          </section>
        )}
      </div>

      <InstallHint />

      <button className="btn btn--quiet home__help" onClick={() => setHelp(true)}>
        <Icon name="help" size={20} /> How to play
      </button>
      <p className="home__foot faint">3–12 players · one phone each · optional TV for the room code</p>
      <HowToPlay open={help} onClose={() => setHelp(false)} />
    </main>
  );
}
