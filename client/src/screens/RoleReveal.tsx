import React, { useRef, useState } from 'react';
import { useGame, usePlayers, useTopic } from '../state/GameProvider';
import { TopicGrid } from '../components/TopicGrid';
import { Avatar } from '../components/Avatar';
import { Icon } from '../components/Icon';
import { buzz } from '../lib/haptics';
import { sfx } from '../lib/sound';
import { AVATAR_INFO, SCORE, type AvatarId } from '@oncealiar/shared';
import { CoachTip } from '../components/coach/CoachTip';
import { Stamp, Redacted } from '../components/Paper';
import './RoleReveal.css';

function Fingerprint() {
  return (
    <svg viewBox="0 0 64 64" width="74" height="74" aria-hidden="true" className="rcard__print">
      {[6, 11, 16, 21, 26].map((r, i) => (
        <path
          key={r}
          d={`M${32 - r} ${38 + i} a${r} ${r + 4} 0 0 1 ${r * 2} 0`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeDasharray={i % 2 ? '10 4' : '18 5'}
        />
      ))}
      <path d="M32 40 v14 M24 44 q0 10 4 14 M40 44 q0 10 -4 14" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

export function RoleReveal() {
  const { game, you, actions } = useGame();
  const { players, me, isHost } = usePlayers();
  const topic = useTopic();
  const [revealed, setRevealed] = useState(false);
  const [sticky, setSticky] = useState(false);
  const [seen, setSeen] = useState(false);
  const downAt = useRef(0);
  if (!game || !you) return null;
  const liar = you.role === 'liar';
  const readyCount = players.filter((p) => p.ready).length;

  const show = () => {
    if (!seen) {
      if (liar) {
        buzz([90, 60, 180]);
        sfx.liar();
      } else {
        buzz(40);
        sfx.reveal();
      }
    } else sfx.paper();
    window.setTimeout(() => sfx.stamp(), 260);
    setSeen(true);
    setRevealed(true);
  };
  const onDown = (e: React.PointerEvent | React.KeyboardEvent) => {
    e.preventDefault();
    if (sticky) {
      setSticky(false);
      setRevealed(false);
      sfx.flip();
      return;
    }
    downAt.current = Date.now();
    show();
  };
  const onUp = () => {
    if (!revealed || sticky) return;
    if (Date.now() - downAt.current < 280) setSticky(true); // quick tap = tap-to-flip
    else setRevealed(false);
  };

  const caseNo = `${String(game.round.number).padStart(2, '0')}-${game.code}`;
  return (
    <main className="screen reveal">
      <div className="masthead reveal__mast">
        <div className="masthead__meta">
          <span>Round {game.round.number} · Eyes only</span>
          <span>
            Ready {readyCount} / {players.length}
          </span>
        </div>
      </div>
      <CoachTip phase="role-reveal" role={you.role} />

      <button
        className={`rcard ${revealed ? 'is-flipped' : ''} ${liar ? 'rcard--liar' : ''}`}
        onPointerDown={onDown}
        onPointerUp={onUp}
        onPointerLeave={() => !sticky && revealed && setRevealed(false)}
        onPointerCancel={() => !sticky && setRevealed(false)}
        onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && !e.repeat && onDown(e)}
        onKeyUp={onUp}
        onContextMenu={(e) => e.preventDefault()}
        aria-label={revealed ? 'Hide your role' : 'Hold to reveal your role'}
        aria-pressed={revealed}
      >
        <span className="rcard__inner">
          <span className="rcard__face rcard__back" aria-hidden={revealed}>
            <span className="rcard__tab" aria-hidden="true">
              Case {caseNo}
            </span>
            <Stamp lg rot={-9} className="rcard__topsecret">
              Top secret
            </Stamp>
            <span className="rcard__eyes type">EYES ONLY: {me?.name ?? 'Agent'}</span>
            <Fingerprint />
            <span className="display rcard__hold">{seen ? 'Hold to look again' : 'Press & hold to open'}</span>
            <span className="rcard__hint">
              <Icon name="eye" size={16} /> or tap to flip · keep it hidden
            </span>
          </span>
          <span className="rcard__face rcard__front" aria-hidden={!revealed} aria-live="polite">
            {revealed &&
              (liar ? (
                <span className="dossier dossier--spy">
                  <Stamp rot={9} className="dossier__stamp" slam>
                    Classified
                  </Stamp>
                  <span className="dossier__id">
                    <span className="dossier__photo">
                      {me && <Avatar avatar={me.avatar} color={me.color} size={58} masked label="You, masked" />}
                    </span>
                    <span className="dossier__lines type">
                      <span>SUBJECT: {me?.name}</span>
                      <span>ALIAS: {me ? AVATAR_INFO[me.avatar as AvatarId]?.name ?? '—' : '—'}</span>
                      <span>
                        CLEARANCE: <Redacted text="XXXXXX" label="Clearance redacted" />
                      </span>
                    </span>
                  </span>
                  <span className="dossier__role">
                    <span className="type dossier__k">ASSIGNED ROLE</span>
                    <span className="display rcard__liar-title">The Spy</span>
                  </span>
                  <span className="dossier__facts type">
                    <span>TOPIC: {topic ? topic.name : <Redacted text="HARD MODE" label="Topic hidden: hard mode" />}</span>
                    <span className="dossier__cw">
                      CODEWORD: <Redacted text="XXXXXXXXXXXX" label="Codeword redacted — you don’t know it" className="dossier__bar" />
                    </span>
                  </span>
                  <span className="dossier__brief type">
                    Blend in. The agents all know the codeword. You don’t. Fake a clue vague enough to pass, and crack the codeword from <span className="hl">their clues</span> before they catch you.
                  </span>
                  <span className="dossier__pts">
                    <span>
                      Escape <b className="display">+{SCORE['spy-escapes']}</b>
                    </span>
                    <span>
                      Caught + guess it <b className="display">+{SCORE['spy-cracks-codeword']}</b>
                    </span>
                  </span>
                  {topic && <TopicGrid words={topic.words} compact label="Possible codewords" />}
                </span>
              ) : (
                <span className="dossier dossier--agent">
                  <Stamp tone="blue" rot={8} className="dossier__stamp" slam>
                    Cleared
                  </Stamp>
                  <span className="dossier__lines type">
                    <span>
                      AGENT: {me?.name}
                      {me && AVATAR_INFO[me.avatar as AvatarId] ? ` · ALIAS: ${AVATAR_INFO[me.avatar as AvatarId].name}` : ''}
                    </span>
                    <span>ASSIGNED ROLE: AGENT</span>
                    <span>TOPIC: {topic ? topic.name : '—'}</span>
                  </span>
                  <span className="dossier__role">
                    <span className="type dossier__k">CODEWORD</span>
                    <span className="display rcard__word hl">{you.secretWord}</span>
                  </span>
                  <span className="dossier__brief type">
                    One of you is a <b>spy</b>. Prove you know the codeword without saying it. Too obvious and the spy steals it. Too vague and they’ll suspect you.
                  </span>
                  {topic && (
                    <span className="dossier__intel">
                      <span className="dossier__k type">INTEL: THE {topic.words.length} POSSIBLE CODEWORDS</span>
                      <TopicGrid words={topic.words} highlight={you.secretWord} compact />
                    </span>
                  )}
                </span>
              ))}
          </span>
        </span>
      </button>

      <p className="reveal__burn type">{revealed && !sticky ? 'This file self-destructs when you let go.' : revealed ? 'Tap the file to close it.' : seen ? 'File sealed. Hold it to peek again.' : 'Make sure nobody is reading over your shoulder.'}</p>

      <div className="reveal__foot">
        <button
          className={`btn btn--lg btn--block ${me?.ready ? 'btn--success' : 'btn--primary'}`}
          disabled={!seen || me?.ready}
          onClick={() => {
            sfx.stamp();
            setRevealed(false);
            setSticky(false);
            actions.ready();
          }}
        >
          {me?.ready ? (
            <>
              <Icon name="check" /> Filed. Waiting…
            </>
          ) : seen ? (
            'Briefing received'
          ) : (
            'Open your file first'
          )}
        </button>
        <div className="ready-row" aria-label={`${readyCount} of ${players.length} players ready`}>
          <div className="ready-row__avs">
            {players.map((p) => (
              <span key={p.id} className={`ready-row__av ${p.ready ? 'is-ready' : ''}`} title={`${p.name}${p.ready ? ' — ready' : ''}`}>
                <Avatar avatar={p.avatar} color={p.color} size={30} label="" />
                {p.ready && (
                  <span className="ready-row__tick">
                    <Icon name="check" size={10} />
                  </span>
                )}
              </span>
            ))}
          </div>
          <span className="type">
            {readyCount}/{players.length} ready
          </span>
          {isHost && readyCount < players.length && (
            <button className="btn btn--quiet btn--sm" onClick={actions.skip}>
              Start anyway
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
