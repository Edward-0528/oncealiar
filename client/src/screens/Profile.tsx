import React, { useState } from 'react';
import { useGame } from '../state/GameProvider';
import { ProfileEditor } from '../components/ProfileEditor';
import type { Intent } from './Home';

export function ProfileScreen({ intent, onBack }: { intent: Intent; onBack: () => void }) {
  const { profile, setProfile, actions, busy, transport } = useGame();
  const [draft, setDraft] = useState(profile);
  // dev mock: `?mock=profile&premium=1` previews the picker as if the room were premium
  const mockPremium = transport.mock?.params.get('premium') === '1' ? true : undefined;

  const submit = async (p: typeof profile) => {
    setProfile(p);
    if (intent.kind === 'host') await actions.create(p);
    else if (intent.kind === 'join') await actions.join(intent.code, p);
    else onBack();
  };
  const label =
    intent.kind === 'host'
      ? (noun: string) => `Places, everyone! Host as ${noun}`
      : intent.kind === 'join'
        ? (noun: string) => `Places, everyone! Join as ${noun}`
        : 'Save';

  return (
    <main className="bs-page">
      <h1 className="sr-only">Who are you tonight?</h1>
      <ProfileEditor
        variant="page"
        value={draft}
        onChange={setDraft}
        onSubmit={(p) => void submit(p)}
        ctaLabel={label}
        busy={busy}
        autoFocusName={!profile.name}
        premium={mockPremium}
        host={intent.kind === 'host' ? true : undefined}
        onBack={onBack}
      />
    </main>
  );
}
