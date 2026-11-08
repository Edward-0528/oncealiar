import React, { useEffect, useRef, useState } from 'react';
import { useGame, usePlayers } from '../state/GameProvider';
import { Avatar } from '../components/Avatar';
import { CountdownRing } from '../components/Countdown';
import { GameDock, PrivateFile } from '../components/Dock';
import { Icon } from '../components/Icon';
import { buzz } from '../lib/haptics';
import { sfx } from '../lib/sound';
import { colorVar } from '../lib/profile';
import { CoachTip } from '../components/coach/CoachTip';
import { Stamp } from '../components/Paper';
import './Clues.css';

export function ClueList() {
  const { game } = useGame();
  const { byId } = usePlayers();
  if (!game) return null;
  const clues = game.round.clues;
  const typed = game.settings.clueMode === 'typed';
  if (!clues.length) return <p className="type center clue-list__empty">No statements on file yet.</p>;
  return (
    <ol className="clue-list">
      {clues.map((c, i) => {
        const p = byId(c.playerId);
        return (
          <li key={`${c.playerId}-${i}`} className="clue-list__item" style={{ ['--pc' as string]: colorVar(p?.color) }}>
            <span className="clue-list__no type">#{i + 1}</span>
            {p && <Avatar avatar={p.avatar} color={p.color} size={34} label="" />}
            <span className="clue-list__name">{p?.name ?? 'Someone'}</span>
            <span className="clue-list__dots" aria-hidden="true" />
            <span className={`clue-list__text ${typed ? '' : 'is-spoken'}`}>{typed ? c.text || '—' : 'said it aloud'}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function Clues() {
  const { game, you, actions } = useGame();
  const { byId, isHost } = usePlayers();
  const [text, setText] = useState('');
  const stripRef = useRef<HTMLOListElement>(null);
  const actionRef = useRef<HTMLDivElement>(null);
  const r = game?.round;
  const currentId = r ? r.turnOrder[r.currentTurn] : undefined;
  const isMine = !!you && currentId === you.playerId;

  useEffect(() => {
    if (isMine) {
      buzz([60, 40, 60]);
      sfx.yourTurn();
    }
    const t = window.setTimeout(() => sfx.stamp(), 300);
    setText('');
    stripRef.current?.querySelector('.is-current')?.scrollIntoView?.({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    // on small phones the action sits below the fold: bring it up when it's your turn
    const s = isMine ? window.setTimeout(() => actionRef.current?.scrollIntoView?.({ block: 'center', behavior: 'smooth' }), 450) : 0;
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(s);
    };
  }, [currentId, isMine]);

  if (!game || !you || !r) return null;
  const cur = byId(currentId);
  const typed = game.settings.clueMode === 'typed';

  const submit = () => {
    const word = text.trim().split(/\s+/)[0];
    if (!word) return;
    sfx.pop();
    actions.submitClue(word.slice(0, 24));
  };

  return (
    <main className="screen screen--dock clues">
      <div className="masthead">
        <div className="masthead__meta">
          <span>Round {game.round.number} · Clue round</span>
          <span>
            Statement {Math.min(r.currentTurn + 1, r.turnOrder.length)} of {r.turnOrder.length}
          </span>
        </div>
      </div>
      <CoachTip phase="clues" role={you.role} />

      <ol className="turn-strip" ref={stripRef} aria-label="Turn order">
        {r.turnOrder.map((id, i) => {
          const p = byId(id);
          if (!p) return null;
          const state = i < r.currentTurn ? 'is-done' : i === r.currentTurn ? 'is-current' : '';
          return (
            <li key={id} className={`turn-strip__item ${state}`} aria-current={i === r.currentTurn ? 'step' : undefined} style={{ ['--r' as string]: `${[-3, 2, -1, 3, -2][i % 5]}deg` }}>
              <span className={`pin ${i === r.currentTurn ? 'pin--red' : ''}`} aria-hidden="true" />
              <span className="turn-strip__av">
                <Avatar avatar={p.avatar} color={p.color} size={44} label="" />
              </span>
              <span className="turn-strip__name">{p.id === you.playerId ? 'You' : p.name}</span>
              {i < r.currentTurn && (
                <span className="turn-strip__tick" aria-label="done">
                  <Icon name="check" size={12} />
                </span>
              )}
            </li>
          );
        })}
      </ol>

      <section className={`spotlight ${isMine ? 'spotlight--you' : ''}`} key={currentId}>
        <span className="tape" aria-hidden="true" />
        <div className="spotlight__photo">
          <CountdownRing endsAt={r.phaseEndsAt} totalSeconds={game.settings.clueSeconds} size={168} tick={isMine} label="Turn time left">
            {cur && <Avatar avatar={cur.avatar} color={cur.color} size={110} label={cur.name} className="spotlight__av" />}
          </CountdownRing>
          <Stamp rot={-10} slam delay={250} className="spotlight__stamp">
            On the record
          </Stamp>
        </div>
        <h1 className="display h2 spotlight__title">{isMine ? 'Your turn!' : `${cur?.name ?? '…'}’s turn`}</h1>
        <p className="spotlight__sub type">
          {isMine
            ? typed
              ? 'Type ONE word that proves you know the codeword, without giving it away.'
              : 'Say ONE word out loud that proves you know the codeword.'
            : typed
              ? 'is choosing their words carefully…'
              : 'Listen closely. Is it a real clue, or a bluff?'}
        </p>

        <div ref={actionRef} className="clues__action">
        {isMine && typed && (
          <form
            className="clue-form"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <label className="sr-only" htmlFor="clue-input">
              Your one-word clue
            </label>
            <input
              id="clue-input"
              className="input"
              value={text}
              autoFocus
              maxLength={24}
              autoComplete="off"
              autoCapitalize="words"
              enterKeyHint="send"
              placeholder="One word…"
              onChange={(e) => setText(e.target.value.replace(/\s/g, ''))}
            />
            <button className="btn btn--primary" type="submit" disabled={!text.trim()} aria-label="Send clue">
              <Icon name="send" /> Send
            </button>
          </form>
        )}
        {isMine && !typed && (
          <button
            className="btn btn--primary btn--lg btn--block"
            onClick={() => {
              sfx.pop();
              actions.clueDone();
            }}
          >
            <Icon name="check" /> Done — I said it
          </button>
        )}
        {!isMine && isHost && (
          <button className="btn btn--quiet btn--sm" onClick={() => (typed ? actions.skip() : actions.clueDone())}>
            <Icon name="skip" size={18} /> Skip {cur?.name ?? 'turn'}
          </button>
        )}
        </div>
      </section>

      <PrivateFile />
      {typed && (
        <section className="stack">
          <h2 className="display h3 clues__loghead">Statements on file</h2>
          <ClueList />
        </section>
      )}
      <GameDock />
    </main>
  );
}
