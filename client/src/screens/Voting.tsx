import React from 'react';
import { useGame, usePlayers } from '../state/GameProvider';
import { TimerPill } from '../components/Countdown';
import { GameDock, PrivateFile, ReactionBar } from '../components/Dock';
import { RunoffBanner, isVoteTarget } from '../components/mechanics';
import { staggerDelay } from '../lib/motion';
import { Avatar } from '../components/Avatar';
import { Icon } from '../components/Icon';
import { Stamp } from '../components/Paper';
import { CoachTip } from '../components/coach/CoachTip';
import { haptic } from '../lib/haptics';
import { sfx } from '../lib/sound';
import './Phases.css';

export function Voting() {
  const { game, you, actions } = useGame();
  const { players, isHost } = usePlayers();
  if (!game || !you) return null;
  const voted = players.filter((p) => p.hasVoted).length;
  const cols = 3;
  const rows = Math.ceil(players.length / cols);
  const H = rows * 100;
  // red string: every pin connects to a central "?" note
  const hub = { x: 150, y: H / 2 };
  const pins = players.map((_, i) => ({ x: ((i % cols) + 0.5) * 100, y: Math.floor(i / cols) * 100 + 6 }));

  return (
    <main className="screen screen--dock screen--wide voting">
      <header className="masthead">
        <div className="masthead__meta">
          <span>Round {game.round.number} · Voting</span>
          <span>
            {voted}/{players.length} voted
          </span>
        </div>
        <div className="masthead__row">
          <h1 className="masthead__title">Who’s the spy?</h1>
          <TimerPill endsAt={game.round.phaseEndsAt} tick />
        </div>
      </header>
      <RunoffBanner round={game.round} players={players} />
      <CoachTip phase="voting" role={you.role} />
      <p className="type voting__lede">{you.myVote ? 'Accusation filed. You can still change it.' : 'Tap a player to accuse them.'}</p>

      <div className="board">
        <svg className="board__string" viewBox={`0 0 300 ${H}`} preserveAspectRatio="none" aria-hidden="true">
          {pins.map((p, i) => (
            <path key={i} d={`M${hub.x} ${hub.y} Q${(hub.x + p.x) / 2} ${(hub.y + p.y) / 2 + 12} ${p.x} ${p.y}`} />
          ))}
        </svg>
        <span className="board__hub" aria-hidden="true">
          ?
        </span>
        <div className="board__grid" role="group" aria-label="Accuse a player">
          {players.map((p, i) => {
            const self = p.id === you.playerId;
            const picked = you.myVote === p.id;
            const target = isVoteTarget(game.round, p.id, you.playerId);
            const out = !self && !target;
            return (
              <button
                key={p.id}
                className={`suspect polaroid ${picked ? 'is-picked' : ''} ${self ? 'is-self' : ''} ${out ? 'is-out' : ''}`}
                style={{ animationDelay: `${staggerDelay(i)}ms` }}
                disabled={!target}
                aria-pressed={picked}
                aria-label={self ? `${p.name} (you can't vote for yourself)` : out ? `${p.name} (not in the re-vote)` : `Accuse ${p.name}${picked ? ' (your vote)' : ''}${p.hasVoted ? ', has voted' : ''}`}
                onClick={() => {
                  if (!target || picked) return;
                  sfx.stamp();
                  haptic('thud');
                  actions.vote(p.id);
                }}
              >
                <span className={`pin ${picked ? 'pin--red' : ''}`} aria-hidden="true" />
                <span className="polaroid__photo">
                  <Avatar avatar={p.avatar} color={p.color} size="82%" label="" mood={picked ? 'sus' : 'idle'} beat={picked ? { id: 'flinch', key: p.id } : undefined} />
                </span>
                <span className="suspect__name">{self ? 'You' : p.name}</span>
                <span className={`suspect__status ${p.hasVoted ? 'is-voted' : ''}`}>{p.hasVoted ? '✓ Voted' : self ? 'That’s you' : out ? 'Not in re-vote' : 'Deciding'}</span>
                {picked && (
                  <Stamp rot={-10} slam className="suspect__stamp">
                    Suspect
                  </Stamp>
                )}
              </button>
            );
          })}
        </div>
      </div>
      <p className="faint center voting__note">Votes stay secret until the reveal.</p>
      <PrivateFile />

      <div className="discuss__react">
        <span className="eyebrow center">Stamp a reaction</span>
        <ReactionBar />
      </div>
      {isHost && (
        <button className="btn btn--ghost btn--block" onClick={actions.skip}>
          <Icon name="skip" size={18} /> End voting now
        </button>
      )}
      <GameDock showReactions={false} />
    </main>
  );
}
