import React, { useEffect, useState } from 'react';
import type { Transport } from '../lib/transport';
import { GameProvider, useGame } from '../state/GameProvider';
import { useGameFx } from '../state/useGameFx';
import { TopBar } from '../components/TopBar';
import { LookHint, NotifyPrompt, ReconnectBanner, Splash, Toasts } from '../components/Overlays';
import { useWakeLock } from '../state/hooks';
import { roomFromLocation } from '../lib/roomCode';
import { bumpStat } from '../lib/storage';
import { registerServiceWorker } from '../lib/pwa';
import { TvView } from '../screens/TvView';
import { MockBar } from '../components/MockBar';
import { Home, type Intent } from '../screens/Home';
import { ProfileScreen } from '../screens/Profile';
import { Lobby } from '../screens/Lobby';
import { RoleReveal } from '../screens/RoleReveal';
import { Clues } from '../screens/Clues';
import { Discussion } from '../screens/Discussion';
import { Voting } from '../screens/Voting';
import { LiarGuess } from '../screens/LiarGuess';
import { Results } from '../screens/Results';
import { GameOver } from '../screens/GameOver';
import { WakeGate } from '../components/WakeUp';
import type { WakeMonitor } from '../lib/wake';

let bootCounted = false;

function Router() {
  const { game, you, transport, restoring, joining } = useGame();
  const [intent, setIntent] = useState<Intent | null>(transport.initialView === 'profile' ? { kind: 'edit' } : null);
  useGameFx();
  // keep phones awake for the whole game (lobby → results); browsers drop the lock when hidden, we re-take it
  useWakeLock(!!game && game.round.phase !== 'game-over');
  const roomParam = typeof window !== 'undefined' ? roomFromLocation().code ?? '' : '';

  if (!game || !you) {
    if (restoring) return <Splash label="Getting you back in…" />;
    if (joining) return <Splash label={`Joining ${joining}…`} />;
    if (intent) return <ProfileScreen intent={intent} onBack={() => setIntent(null)} />;
    return <Home onProfile={setIntent} initialCode={roomParam} />;
  }
  // key on phase+round so each screen mounts fresh (resets local UI state, replays entrance animations)
  const key = `${game.round.phase}-${game.round.number}`;
  switch (game.round.phase) {
    case 'lobby':
      return <Lobby key={key} />;
    case 'role-reveal':
      return <RoleReveal key={key} />;
    case 'clues':
      return <Clues key={key} />;
    case 'discussion':
      return <Discussion key={key} />;
    case 'voting':
      return <Voting key={key} />;
    case 'liar-guess':
      return <LiarGuess key={key} />;
    case 'results':
      return <Results key={key} />;
    case 'game-over':
      return <GameOver key={key} />;
  }
}

function Tv({ code, transport }: { code: string; transport: Transport }) {
  useWakeLock(true);
  return <TvView code={code} transport={transport} />;
}

/**
 * `wake`: the boot-time server probe (lib/bootWake). While a sleeping free-tier server boots,
 * the WakeGate shows the "STOP THE PRESSES!" screen instead of the app. Omitted in tests/mock.
 */
export function App({ transport, wake = null }: { transport: Transport; wake?: WakeMonitor | null }) {
  useEffect(() => {
    if (transport.kind !== 'live' || bootCounted) return;
    bootCounted = true;
    bumpStat('visits');
    registerServiceWorker();
  }, [transport.kind]);

  const tv = transport.kind === 'live' && typeof window !== 'undefined' ? roomFromLocation().tv : null;
  if (tv) {
    return (
      <GameProvider transport={transport}>
        <WakeGate monitor={wake}>
          <ReconnectBanner />
          <Tv code={tv} transport={transport} />
        </WakeGate>
      </GameProvider>
    );
  }

  return (
    <GameProvider transport={transport}>
      <div className="app">
        <WakeGate monitor={wake}>
          <ReconnectBanner />
          <TopBar />
          <LookHint />
          <NotifyPrompt />
          <Router />
        </WakeGate>
      </div>
      <Toasts />
      {transport.kind === 'mock' && <MockBar />}
    </GameProvider>
  );
}
