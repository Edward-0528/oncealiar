import React, { useState } from 'react';
import { Sheet } from './Sheet';
import { Icon } from './Icon';
import { useAccount } from '../state/account';
import { useGame } from '../state/GameProvider';
import { emailLooksValid, normalizeOtp, type HistoryRow } from '../lib/account';
import './AccountSheet.css';

const ordinal = (n: number) => `${n}${['th', 'st', 'nd', 'rd'][n % 100 > 10 && n % 100 < 14 ? 0 : Math.min(n % 10, 4) % 4] ?? 'th'}`;

export function historyLine(h: HistoryRow): string {
  return `${h.won ? 'Won' : ordinal(h.rank)} of ${h.players} · ${h.score} pts · ${h.rounds} round${h.rounds === 1 ? '' : 's'}`;
}

function SignIn() {
  const { client } = useAccount();
  const { toast } = useGame();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    setWorking(true);
    setError(null);
    const res = await client.sendCode(email);
    setWorking(false);
    if (res.ok) setSent(true);
    else setError(res.error);
  };

  return (
    <form
      className="account__form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!sent) return void send();
        setWorking(true);
        setError(null);
        const res = await client.verifyCode(email, code);
        setWorking(false);
        if (res.ok) toast('Signed in', 'success');
        else setError(res.error);
      }}
    >
      <p className="dim">Optional. Sign in to keep your game history and use a Party Pass on any phone. Guests play free, no account needed.</p>
      <label className="field">
        <span className="field__label">Email</span>
        <input
          className="input"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          value={email}
          disabled={sent}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </label>
      {sent && (
        <>
          <p className="account__hint">We emailed {email.trim()}. Tap the sign-in link in that email, or type the code here if it includes one.</p>
          <label className="field">
            <span className="field__label">Code</span>
            <input
              className="input account__code"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(normalizeOtp(e.target.value))}
              placeholder="123456"
              maxLength={8}
              autoFocus
            />
          </label>
        </>
      )}
      {error && (
        <p className="account__error" role="alert">
          {error}
        </p>
      )}
      <button className="btn btn--primary btn--block" type="submit" disabled={working || (!sent ? !emailLooksValid(email) : normalizeOtp(code).length < 6)}>
        {working ? 'One sec…' : sent ? 'Sign in' : 'Email me a code'}
      </button>
      {sent && (
        <button
          type="button"
          className="btn btn--quiet btn--block"
          disabled={working}
          onClick={() => {
            setSent(false);
            setCode('');
            setError(null);
          }}
        >
          Use a different email
        </button>
      )}
    </form>
  );
}

export function BuyPassButton({ onNeedSignIn, block = true }: { onNeedSignIn?: () => void; block?: boolean }) {
  const { client, session, me, priceLabel, purchase } = useAccount();
  const { toast } = useGame();
  const [working, setWorking] = useState(false);
  if (!purchase) return null;
  if (me?.premium) {
    return (
      <p className="account__owned">
        <Icon name="check" size={18} /> You own the Party Pass
      </p>
    );
  }
  return (
    <button
      className={`btn btn--gold ${block ? 'btn--block' : ''}`}
      disabled={working}
      onClick={async () => {
        if (!session) return onNeedSignIn?.();
        setWorking(true);
        const res = await client.checkout();
        if (res.ok) {
          window.location.assign(res.url);
          return;
        }
        setWorking(false);
        toast(res.error, 'error');
      }}
    >
      {working ? 'Opening checkout…' : session ? `Get the Party Pass · ${priceLabel}` : `Sign in to buy · ${priceLabel}`}
    </button>
  );
}

function Signed() {
  const { client, session, me, purchase } = useAccount();
  return (
    <div className="account__signed">
      <p className="dim">
        Signed in as <b>{me?.email || session?.email}</b>
      </p>
      {purchase && (
        <section className="card card--tight account__pass">
          <span className="eyebrow">Party Pass</span>
          {me?.premium ? (
            <p>All premium packs, bigger rooms and characters. It unlocks automatically whenever you host.</p>
          ) : (
            <p>One payment, yours for good: every premium pack, bigger rooms and extra characters for any room you host.</p>
          )}
          <BuyPassButton />
        </section>
      )}
      <section className="account__history" aria-label="Game history">
        <span className="eyebrow">Your games</span>
        {me && me.history.length > 0 ? (
          <ul className="account__list">
            {me.history.map((h) => (
              <li key={`${h.room_code}${h.played_at}`}>
                <b>{historyLine(h)}</b>
                <small className="faint">
                  Room {h.room_code} · {new Date(h.played_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </small>
              </li>
            ))}
          </ul>
        ) : (
          <p className="faint">Nothing yet. Games you finish while signed in show up here.</p>
        )}
      </section>
      <button className="btn btn--secondary btn--block" onClick={() => client.signOut()}>
        Sign out
      </button>
    </div>
  );
}

export function AccountSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { enabled, session } = useAccount();
  if (!enabled) return null;
  return (
    <Sheet open={open} onClose={onClose} title={session ? 'Your account' : 'Sign in'}>
      {session ? <Signed /> : <SignIn />}
    </Sheet>
  );
}
