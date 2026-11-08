import React, { useState } from 'react';
import { useGame } from '../state/GameProvider';
import { ProfileEditor } from '../components/ProfileEditor';
import { Icon } from '../components/Icon';
import type { Intent } from './Home';

export function ProfileScreen({ intent, onBack }: { intent: Intent; onBack: () => void }) {
  const { profile, setProfile, actions, busy } = useGame();
  const [draft, setDraft] = useState(profile);
  const name = draft.name.trim();

  const submit = async () => {
    const p = { ...draft, name };
    setProfile(p);
    if (intent.kind === 'host') await actions.create(p);
    else if (intent.kind === 'join') await actions.join(intent.code, p);
    else onBack();
  };
  const label = intent.kind === 'host' ? 'Host game' : intent.kind === 'join' ? `Join ${intent.code}` : 'Save';

  return (
    <main className="screen">
      <div className="row">
        <button className="icon-btn" onClick={onBack} aria-label="Back">
          <Icon name="left" />
        </button>
        <div>
          <span className="eyebrow">Your disguise</span>
          <h1 className="display h2">Who are you tonight?</h1>
        </div>
      </div>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          if (name) void submit();
        }}
      >
        <ProfileEditor value={draft} onChange={setDraft} autoFocusName={!profile.name} />
        <button className="btn btn--primary btn--lg btn--block" type="submit" disabled={!name || busy}>
          {name ? label : 'Enter a name'}
        </button>
      </form>
    </main>
  );
}
