import React, { useState } from 'react';
import { Sheet } from './Sheet';
import { useGame, usePlayers } from '../state/GameProvider';
import { useAccount } from '../state/account';
import { AccountSheet, BuyPassButton } from './AccountSheet';
import './PremiumModal.css';

/** Party Pass upsell: one-time purchase tied to an account (when the server has payments on), or a host unlock code. */
export function PremiumModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { actions, toast, busy } = useGame();
  const { isHost } = usePlayers();
  const [code, setCode] = useState('');
  const [working, setWorking] = useState(false);
  const { purchase, priceLabel } = useAccount();
  const [signIn, setSignIn] = useState(false);

  return (
    <Sheet open={open} onClose={onClose} title="Premium packs" variant="modal">
      <div className="premium">
        <div className="premium__art" aria-hidden="true">
          <span>🍿</span>
          <span>🧙</span>
          <span>🌶️</span>
        </div>
        <span className="tag premium__kicker">{purchase ? `Party Pass · ${priceLabel}` : 'Coming soon'}</span>
        <h3 className="display h2 center">{purchase ? 'Unlock the Party Pass' : 'Premium packs'}</h3>
        <p className="dim center">
          {purchase
            ? 'One payment, yours for good. Every premium pack, bigger rooms and extra characters whenever you host. Guests never pay.'
            : 'Hundreds of new topics, bigger rooms and party themes. Join the waitlist and we’ll let you know the moment they drop.'}
        </p>
        {purchase ? (
          <BuyPassButton onNeedSignIn={() => setSignIn(true)} />
        ) : (
          <button
            className="btn btn--gold btn--block"
            onClick={() => {
              toast('Waitlist opens soon — thanks for the interest!', 'success');
              onClose();
            }}
          >
            Join the waitlist
          </button>
        )}
        <AccountSheet open={signIn} onClose={() => setSignIn(false)} />
        {isHost && (
          <form
            className="premium__code"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!code.trim()) return;
              setWorking(true);
              const ok = await actions.unlock(code);
              setWorking(false);
              if (ok) {
                setCode('');
                onClose();
              }
            }}
          >
            <label className="field">
              <span className="field__label">Have an unlock code?</span>
              <div className="row">
                <input
                  className="input"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="ENTER CODE"
                  autoCapitalize="characters"
                  autoComplete="off"
                  maxLength={32}
                />
                <button className="btn btn--secondary" type="submit" disabled={!code.trim() || working || busy}>
                  Unlock
                </button>
              </div>
            </label>
          </form>
        )}
      </div>
    </Sheet>
  );
}
