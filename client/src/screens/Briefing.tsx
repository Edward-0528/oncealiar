import React from 'react';
import { useGame, usePlayers } from '../state/GameProvider';
import { Avatar } from '../components/Avatar';
import { Icon } from '../components/Icon';
import { BRIEFING_SECONDS, DEMO_SCENES, DemoDots, DemoPhone, parseDemoFreeze, useDemoPlayer } from '../components/demo/GameDemo';
import { listNames } from '../lib/dockStatus';
import { haptic } from '../lib/haptics';
import { sfx } from '../lib/sound';
import './RoleReveal.css';
import './Briefing.css';
import { ActionButton } from '../components/ActionButton';


/**
 * Group tutorial before the room's first game. Every phone plays the same animated demo
 * (real game pieces, fake data) on a loop. There is no timer and no host skip: the game
 * starts only when everyone who is here has tapped "I'm ready", so nobody gets left behind.
 */
export function Briefing() {
  const { game, you, actions, transport } = useGame();
  const { players, me } = usePlayers();
  const freeze = parseDemoFreeze(transport.mock?.params.get('demo'));
  const demo = useDemoPlayer(DEMO_SCENES, { playing: !freeze, start: freeze ?? undefined });
  if (!game || !you) return null;

  // offline players don't hold the room up (the server skips them too)
  const here = players.filter((p) => p.presence !== 'offline');
  const readyCount = here.filter((p) => p.ready).length;
  const waiting = here.filter((p) => !p.ready);
  const waitingNames = waiting
    .sort((a, b) => (a.id === you.playerId ? -1 : b.id === you.playerId ? 1 : 0))
    .map((p) => (p.id === you.playerId ? 'you' : p.name));
  const iAmReady = !!me?.ready;
  const scene = DEMO_SCENES[demo.scene];

  return (
    <main className="screen brief">
      <header className="brief__head" aria-live="polite">
        <span className="brief__eyebrow">
          How to play · {BRIEFING_SECONDS} seconds
        </span>
        <h1 className="display brief__caption" key={scene.id}>
          <span className="brief__num">{demo.scene + 1}</span>
          {scene.caption}
        </h1>
        <p className="brief__sub">{scene.sub}</p>
      </header>

      <div className="brief__stage">
        <DemoPhone scene={demo.scene} step={demo.step} run={demo.run} className="brief__phone" />
      </div>
      <DemoDots scene={demo.scene} onGo={demo.go} />

      <div className="brief__foot">
        <ActionButton
          className={`btn btn--lg btn--block ${iAmReady ? 'btn--success' : 'btn--primary'}`}
          disabled={iAmReady}
          onAct={() => {
            sfx.stamp();
            haptic('tick');
            return actions.briefingReady();
          }}
        >
          {iAmReady ? (
            <>
              You’re ready <Icon name="check" />
            </>
          ) : (
            'I’m ready'
          )}
        </ActionButton>
        <div className="ready-row brief__ready" aria-label={`${readyCount} of ${here.length} players ready`}>
          <div className="ready-row__avs">
            {here.map((p) => (
              <span key={p.id} className={`ready-row__av ${p.ready ? 'is-ready' : ''}`} title={`${p.name}${p.ready ? ' (ready)' : ''}`}>
                <Avatar avatar={p.avatar} color={p.color} size={30} label="" beat={p.ready ? { id: 'nudge', key: 'ready' } : undefined} />
                {p.ready && (
                  <span className="ready-row__tick">
                    <Icon name="check" size={10} />
                  </span>
                )}
              </span>
            ))}
          </div>
          <span className="type brief__count" role="status">
            {readyCount}/{here.length} ready
            {waiting.length > 0 ? ` · waiting on ${listNames(waitingNames, 2)}` : ' · starting…'}
          </span>
        </div>
        <p className="brief__rule">The game starts when everyone’s ready.</p>
      </div>
    </main>
  );
}
