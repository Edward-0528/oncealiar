import React, { useEffect, useRef, useState } from 'react';
import type { Player, PlayerProfile, Presence } from '@oncealiar/shared';
import { useGame, usePlayers } from '../state/GameProvider';
import { usePageVisible } from '../state/hooks';
import { Avatar } from './Avatar';
import { Icon } from './Icon';
import { Sheet } from './Sheet';
import { ProfileEditor } from './ProfileEditor';
import { dedupeName } from '../lib/profile';
import { getFlag, loadStats, setFlag } from '../lib/storage';
import { notificationPermission, requestNotifications } from '../lib/attention';
import { canPromptInstall, isIOS, isStandalone, onInstallAvailability, promptInstall } from '../lib/pwa';
import './Overlays.css';

export function Toasts() {
  const { toasts, dismissToast } = useGame();
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <button key={t.id} className={`toast toast--${t.tone}`} onClick={() => dismissToast(t.id)}>
          <span className="toast__dot" aria-hidden="true" />
          <span>{t.message}</span>
        </button>
      ))}
    </div>
  );
}

/** Blips shorter than this are invisible to the player. */
export const RECONNECT_PILL_DELAY_MS = 2000;

/**
 * Calm connection indicator: nothing for short blips, a small "Reconnecting…" pill after 2s,
 * and a "Back in the game!" toast once we're back (only if the pill was shown).
 * Timers only run while the page is visible, so coming back from another app is silent
 * when the reconnect is quick.
 */
export function ReconnectBanner() {
  const { conn, game, toast, transport } = useGame();
  const visible = usePageVisible();
  const [show, setShow] = useState(false);
  const wasShown = useRef(false);
  const inGame = useRef(false);
  inGame.current = !!game;

  useEffect(() => {
    if (conn === 'connected') {
      if (wasShown.current && inGame.current) toast('Back in the game!', 'success');
      wasShown.current = false;
      setShow(false);
      return;
    }
    if (!visible || transport.kind !== 'live') return;
    const t = setTimeout(() => {
      wasShown.current = true;
      setShow(true);
    }, RECONNECT_PILL_DELAY_MS);
    return () => clearTimeout(t);
  }, [conn, visible, toast, transport.kind]);

  if (!show || conn === 'connected') return null;
  return (
    <div className="reconnect" role="status" aria-live="polite">
      <span className="reconnect__pill">
        <span className="reconnect__spin" aria-hidden="true" />
        {game ? 'Reconnecting…' : 'Connecting to the game server…'}
      </span>
    </div>
  );
}

const PhoneIcon = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="6" y="2" width="12" height="20" rx="2.5" stroke="currentColor" strokeWidth="2.4" />
    <path d="M10.5 18.5h3" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
  </svg>
);

export function presenceOf(player: Pick<Player, 'connected'> & { presence?: Presence }): Presence {
  return player.presence ?? (player.connected ? 'online' : 'offline');
}

/**
 * Tiny presence badge for player tiles: nothing when online, "texting…" with a phone icon
 * while the player is in another app / locked their phone, "offline" after the grace period.
 * Usage: `<PresenceBadge player={p} />` (absolutely positionable; pass className to place it).
 */
export function PresenceBadge({
  player,
  presence,
  className = '',
  compact
}: {
  player?: Pick<Player, 'connected'> & { presence?: Presence };
  presence?: Presence;
  className?: string;
  /** icon only (for tight lists) */
  compact?: boolean;
}) {
  const p = presence ?? (player ? presenceOf(player) : 'online');
  if (p === 'online') return null;
  const label = p === 'away' ? 'texting…' : 'offline';
  return (
    <span className={`presence presence--${p} ${compact ? 'presence--compact' : ''} ${className}`} title={p === 'away' ? 'In another app — still in the game' : 'Disconnected'} aria-label={p === 'away' ? 'Away (in another app)' : 'Offline'}>
      <PhoneIcon />
      {!compact && <span className="presence__txt">{label}</span>}
    </span>
  );
}

export function MuteButton() {
  const { muted, toggleMute } = useGame();
  return (
    <button className="icon-btn" onClick={toggleMute} aria-label={muted ? 'Unmute sounds' : 'Mute sounds'} aria-pressed={muted}>
      <Icon name={muted ? 'mute' : 'volume'} />
    </button>
  );
}

/** Quiet full-screen placeholder while we resume a session or follow an invite link. */
export function Splash({ label }: { label: string }) {
  return (
    <main className="screen splash" aria-busy="true">
      <div className="splash__card card">
        <span className="splash__spin" aria-hidden="true" />
        <span className="splash__label display">{label}</span>
      </div>
    </main>
  );
}

/**
 * "You're Sneaky Fox · Tap to change your look" — shown in the lobby after a zero-typing join
 * with a generated codename. Opens the profile editor in a sheet.
 */
export function LookHint() {
  const { autoProfile, game, you, profile, setProfile, actions } = useGame();
  const { me, players } = usePlayers();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<PlayerProfile>(profile);
  if (!autoProfile || !game || !you || !me || game.round.phase !== 'lobby') return null;

  const save = () => {
    const name = draft.name.trim();
    if (!name) return;
    const p = { ...draft, name };
    setProfile(p);
    actions.updateProfile({ ...p, name: dedupeName(name, players.filter((x) => x.id !== me.id).map((x) => x.name)) });
    setOpen(false);
  };

  return (
    <>
      <div className="hintbar" role="note">
        <button
          className="hintbar__main"
          onClick={() => {
            setDraft({ name: me.name, avatar: me.avatar, color: me.color });
            setOpen(true);
          }}
        >
          <Avatar avatar={me.avatar} color={me.color} size={30} label="" />
          <span>
            You’re <b>{me.name}</b> · <u>Tap to change your look</u>
          </span>
        </button>
        <button className="hintbar__x" aria-label="Keep this look" onClick={() => setProfile({ name: me.name, avatar: me.avatar, color: me.color })}>
          <Icon name="close" size={16} />
        </button>
      </div>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Your disguise"
        footer={
          <button className="btn btn--primary btn--block" onClick={save} disabled={!draft.name.trim()}>
            Looks good
          </button>
        }
      >
        <ProfileEditor value={draft} onChange={setDraft} />
      </Sheet>
    </>
  );
}

/**
 * In-context, opt-in prompt for "buzz me when it's my turn" notifications (lobby only).
 * Never asks on load: permission is requested only from the button tap.
 */
export function NotifyPrompt() {
  const { game, toast, autoProfile } = useGame();
  const [hidden, setHidden] = useState(() => getFlag('notifyPromptDismissed'));
  const [perm, setPerm] = useState(notificationPermission);
  if (hidden || autoProfile || perm !== 'default' || !game || game.round.phase !== 'lobby') return null;
  const dismiss = () => {
    setFlag('notifyPromptDismissed');
    setHidden(true);
  };
  return (
    <div className="hintbar hintbar--notify" role="note">
      <span className="hintbar__main hintbar__main--static">
        <span aria-hidden="true">🔔</span>
        <span>Get a nudge when it’s your turn — even if you’re texting.</span>
      </span>
      <button
        className="btn btn--sm btn--ink hintbar__cta"
        onClick={async () => {
          const ok = await requestNotifications();
          setPerm(notificationPermission());
          if (ok) toast('We’ll nudge you when it’s your turn', 'success');
          dismiss();
        }}
      >
        Turn on
      </button>
      <button className="hintbar__x" aria-label="No thanks" onClick={dismiss}>
        <Icon name="close" size={16} />
      </button>
    </div>
  );
}

/** "Add to Home Screen" hint for repeat hosts (never on a first visit, never when installed). */
export function InstallHint() {
  const [, force] = useState(0);
  const [dismissed, setDismissed] = useState(() => getFlag('installHintDismissed'));
  useEffect(() => onInstallAvailability(() => force((n) => n + 1)), []);
  const stats = loadStats();
  if (dismissed || isStandalone() || stats.hosted < 1 || stats.visits < 2) return null;
  const ios = isIOS();
  const canPrompt = canPromptInstall();
  if (!ios && !canPrompt) return null;
  const close = () => {
    setFlag('installHintDismissed');
    setDismissed(true);
  };
  return (
    <div className="install card card--tight" role="note">
      <span className="install__icon" aria-hidden="true">
        <img src="/icon.svg" alt="" width={36} height={36} />
      </span>
      <span className="install__txt">
        <b>Hosting again?</b>{' '}
        {canPrompt ? 'Put Once a Liar on your home screen for one-tap game nights.' : <>Tap <ShareGlyph /> then <b>Add to Home Screen</b> for one-tap game nights.</>}
      </span>
      {canPrompt && (
        <button className="btn btn--sm btn--ink" onClick={() => void promptInstall().then(close)}>
          Add
        </button>
      )}
      <button className="hintbar__x" aria-label="Dismiss" onClick={close}>
        <Icon name="close" size={16} />
      </button>
    </div>
  );
}

const ShareGlyph = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-label="Share" role="img" style={{ verticalAlign: '-2px' }}>
    <path d="M12 3v12M7.5 7.5 12 3l4.5 4.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M6 11H5v10h14V11h-1" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
  </svg>
);
