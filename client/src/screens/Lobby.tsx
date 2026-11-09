import React, { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { AVATAR_INFO, type AvatarId, type Player } from '@oncealiar/shared';
import { useGame, usePlayers } from '../state/GameProvider';
import { PlayerTile } from '../components/PlayerTile';
import { Icon } from '../components/Icon';
import { Sheet } from '../components/Sheet';
import { EndSessionSheet } from '../components/EndSessionSheet';
import { ProfileEditor } from '../components/ProfileEditor';
import { SettingsSheet } from './SettingsSheet';
import { copyText, inviteUrl, shareOrCopy, tvUrl } from '../lib/share';
import { sfx } from '../lib/sound';
import { CoachTip } from '../components/coach/CoachTip';
import { Masthead } from '../components/Paper';
import { staggerDelay } from '../lib/motion';
import { BRIEFING_SECONDS } from '../components/demo/GameDemo';
import { hasRoomPlayed } from '../lib/roomHistory';
import './Lobby.css';

export function Lobby() {
  const { game, you, actions, toast, profile, setProfile } = useGame();
  const { players, isHost, me } = usePlayers();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [qrBig, setQrBig] = useState(false);
  const [kickTarget, setKickTarget] = useState<Player | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [editMe, setEditMe] = useState(false);
  const [draft, setDraft] = useState(profile);
  const count = useRef(players.length);
  // players already here when the lobby opened don't drop in; later joiners do
  const present = useRef(new Set(players.map((p) => p.id)));

  useEffect(() => {
    if (players.length > count.current) sfx.join();
    count.current = players.length;
  }, [players.length]);

  if (!game || !you) return null;
  const s = game.settings;
  const url = inviteUrl(game.code);
  const need = Math.max(0, s.minPlayers - players.length);
  const packNames = game.packs.filter((p) => s.packIds.includes(p.id)).map((p) => `${p.emoji} ${p.name}`);

  const share = async () => {
    const r = await shareOrCopy({ title: 'Once a Liar', text: `Join my Once a Liar game — room ${game.code}!`, url });
    if (r === 'copied') toast('Invite link copied', 'success');
    if (r === 'failed') toast('Couldn’t share — the code is ' + game.code, 'error');
  };

  return (
    <main className="screen screen--wide lobby">
      <div className="lobby__mast">
        <Masthead left="Special lineup edition" right={game.premium ? '★ Premium room' : 'Free edition'} />
      </div>
      <div className="lobby__coach">
        <CoachTip phase="lobby" role={you.role} />
      </div>

      <section className="lobby__invite" aria-labelledby="lobby-code-label">
        <span className="tag lobby__extra" aria-hidden="true">
          Extra!
        </span>
        <span className="lobby__label" id="lobby-code-label">
          Room code · join at <b>{window.location.host}</b>
        </span>
        <div className="lobby__code display" aria-label={`Room code ${game.code.split('').join(' ')}`}>
          {game.code.split('').map((c, i) => (
            <span key={i} style={{ animationDelay: `${i * 90}ms` }}>
              {c}
            </span>
          ))}
        </div>
        <div className="lobby__btns">
          <button className="btn btn--gold btn--sm" onClick={share}>
            <Icon name="share" size={18} /> Invite
          </button>
          <button
            className="btn btn--sm"
            onClick={async () => toast((await copyText(url)) ? 'Link copied' : 'Couldn’t copy', 'success')}
          >
            <Icon name="copy" size={18} /> Copy link
          </button>
          <a className="btn btn--sm" href={tvUrl(game.code)} target="_blank" rel="noopener">
            <Icon name="qr" size={18} /> Show on TV
          </a>
        </div>
        <button className="lobby__qr" onClick={() => setQrBig(true)} aria-label="Show large QR code">
          <QRCodeSVG value={url} size={256} level="M" bgColor="#ffffff" fgColor="#111111" style={{ width: '100%', height: 'auto' }} />
          <span className="lobby__qr-hint">Scan to join</span>
        </button>
      </section>

      <section className="lobby__players" aria-labelledby="lobby-lineup">
        <div className="lobby__sechead">
          <h2 className="display h2" id="lobby-lineup">
            The lineup
          </h2>
          <span className="ticker lobby__count">
            {players.length}/{s.maxPlayers}
          </span>
        </div>
        <div className="ptiles lobby__tiles">
          {players.map((p, i) => (
            <PlayerTile
              key={p.id}
              player={p}
              isYou={p.id === you.playerId}
              animated
              alias={AVATAR_INFO[p.avatar as AvatarId]?.name}
              beat={present.current.has(p.id) ? undefined : { id: 'drop', key: p.id }}
              style={{ animationDelay: `calc(${staggerDelay(i)}ms * var(--delay-scale, 1))` }}
              onClick={
                p.id === you.playerId
                  ? () => {
                      setDraft(me ? { name: me.name, avatar: me.avatar, color: me.color } : profile);
                      setEditMe(true);
                    }
                  : undefined
              }
              ariaLabel={p.id === you.playerId ? 'Edit your profile' : undefined}
              sub={p.id === you.playerId ? 'tap to edit' : undefined}
              onKick={isHost && p.id !== you.playerId ? () => setKickTarget(p) : undefined}
            />
          ))}
          {isHost && players.length < s.maxPlayers && (
            <button type="button" className="lobby__addbot" onClick={() => actions.addBot()}>
              <span className="lobby__addbot-plus" aria-hidden="true">+</span>
              <span className="lobby__addbot-t">Add a bot</span>
              <span className="lobby__addbot-sub">for testing</span>
            </button>
          )}
          {Array.from({ length: Math.max(0, need - (isHost ? 1 : 0)) }, (_, i) => (
            <div key={`empty-${i}`} className="lobby__empty" aria-hidden="true">
              <span className="lobby__empty-q">?</span>
              <span className="lobby__empty-t">Wanted</span>
            </div>
          ))}
        </div>
      </section>

      <section className="lobby__settings card">
        <div className="row">
          <h2 className="display h3">Mission settings</h2>
          <span className="spacer" />
          {isHost && (
            <button className="btn btn--sm" onClick={() => setSettingsOpen(true)}>
              <Icon name="settings" size={18} /> Edit
            </button>
          )}
        </div>
        <ul className="lobby__facts">
          <li>
            <b>{s.roundsPerGame}</b> rounds
          </li>
          <li>{s.clueMode === 'spoken' ? 'Clues out loud' : 'Typed clues'}</li>
          <li>
            <b>{s.clueSeconds}s</b> per clue
          </li>
          <li>
            <b>{s.discussionSeconds}s</b> to argue
          </li>
          <li>
            <b>{s.liarCount > 1 ? `${s.liarCount} spies` : '1 spy'}</b>
          </li>
        </ul>
        <div className="row row--wrap">
          {packNames.map((n) => (
            <span key={n} className="chip">
              {n}
            </span>
          ))}
        </div>
      </section>

      <div className="lobby__start">
        {isHost ? (
          <>
            <button
              className="btn btn--primary btn--lg btn--block"
              disabled={need > 0}
              onClick={() => {
                sfx.paper();
                actions.start();
              }}
            >
              {need > 0 ? `Need ${need} more suspect${need > 1 ? 's' : ''}` : `Start game · ${players.length} players`}
            </button>
            {need === 0 && s.briefing && !hasRoomPlayed(game.code) && <p className="center lobby__tutorial">Starts with a {BRIEFING_SECONDS}-second tutorial</p>}
            <p className="center lobby__hint">
              {need > 0 ? 'Share the code. Everyone joins on their own phone.' : players.length < 5 ? 'Tip: 5–8 players is the sweet spot.' : 'Looking good. Phones out, poker faces on.'}
            </p>
            <button className="btn btn--danger btn--sm lobby__end" onClick={() => setConfirmEnd(true)}>
              End session
            </button>
          </>
        ) : (
          <>
            <div className="waitbar">
              <span className="waitbar__dot" aria-hidden="true" />
              Waiting for the host to start…
            </div>
            <button className="btn btn--secondary btn--sm lobby__end" onClick={() => actions.leave()}>
              Leave room
            </button>
          </>
        )}
      </div>

      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <Sheet open={qrBig} onClose={() => setQrBig(false)} title={`Join room ${game.code}`} variant="modal">
        <div className="lobby__qr-big">
          <QRCodeSVG value={url} size={512} level="M" bgColor="#ffffff" fgColor="#111111" style={{ width: '100%', height: 'auto' }} />
        </div>
        <p className="center display h1" style={{ letterSpacing: '0.2em' }}>
          {game.code}
        </p>
      </Sheet>

      <Sheet
        open={!!kickTarget}
        onClose={() => setKickTarget(null)}
        title={kickTarget?.name ?? ''}
        variant="modal"
        footer={
          <>
            <button className="btn btn--sm" onClick={() => setKickTarget(null)}>
              Cancel
            </button>
            <button
              className="btn btn--danger btn--sm"
              onClick={() => {
                if (kickTarget) actions.kick(kickTarget.id);
                setKickTarget(null);
              }}
            >
              Remove
            </button>
          </>
        }
      >
        {kickTarget && !kickTarget.isBot && kickTarget.connected ? (
          <div className="stack">
            <button
              className="btn btn--gold btn--block"
              onClick={() => {
                actions.makeHost(kickTarget.id);
                setKickTarget(null);
              }}
            >
              Make {kickTarget.name} the host
            </button>
            <p className="dim">The host starts games and changes settings. Removing someone sends them back to the home screen.</p>
          </div>
        ) : (
          <p className="dim">{kickTarget?.isBot ? 'Remove this bot from the room.' : 'They’ll be sent back to the home screen.'}</p>
        )}
      </Sheet>

      <EndSessionSheet
        open={confirmEnd}
        onClose={() => setConfirmEnd(false)}
        onConfirm={() => {
          setConfirmEnd(false);
          actions.endSession();
        }}
      />

      <Sheet open={editMe} onClose={() => setEditMe(false)} title="Edit your look">
        <ProfileEditor
          value={draft}
          onChange={setDraft}
          ctaLabel="Save"
          onSubmit={(p) => {
            setProfile(p);
            actions.updateProfile(p);
            setEditMe(false);
          }}
        />
      </Sheet>
    </main>
  );
}
