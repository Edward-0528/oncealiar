import React, { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { PlayerProfile } from '@oncealiar/shared';
import { useGame } from '../state/GameProvider';
import { WakeMonitor, fetchProbe, wakeProgress, type WakeSnapshot } from '../lib/wake';
import { healthUrl } from '../lib/serverUrl';
import { roomFromLocation } from '../lib/roomCode';
import { Avatar, type AvatarMood } from './Avatar';
import { HowToPlay } from './HowToPlay';
import { ProfileEditor } from './ProfileEditor';
import { Sheet } from './Sheet';
import { Icon } from './Icon';
import './WakeUp.css';

/** "READY!" stamp moment before the app continues */
export const READY_STAMP_MS = 750;
const READY_STAMP_REDUCED_MS = 450;
/** after the first screen: socket down + /healthz failing this long → compact banner */
export const BANNER_AFTER_MS = 10_000;
const TIP_MS = 6500;

/** true while the compact "waking" banner is up (the generic reconnect pill stays out of its way) */
const WakeBannerContext = createContext(false);
export const useWakeBannerShown = () => useContext(WakeBannerContext);

function useWakeSnapshot(monitor: WakeMonitor | null): WakeSnapshot | null {
  return useSyncExternalStore(
    (cb) => (monitor ? monitor.subscribe(cb) : () => {}),
    () => monitor?.snapshot ?? null
  );
}

/** re-render every `ms` while `on` (elapsed counter + progress bar) */
function useTick(on: boolean, ms = 250) {
  const [, setN] = useState(0);
  useEffect(() => {
    if (!on) return;
    const id = setInterval(() => setN((n) => n + 1), ms);
    return () => clearInterval(id);
  }, [on, ms]);
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

const clock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

// ───────────────────────────── gate ─────────────────────────────

/**
 * Holds the app behind the wake-up screen until the game server answers.
 * Fast answer (< ~800 ms) → nothing visible; slow → full-screen WakeUp; ready → stamp → app.
 * The GameProvider above keeps running underneath, so an invite link (`/ABCD`, `?room=`)
 * auto-joins the moment the socket connects and the lobby is waiting after the stamp.
 */
export function WakeGate({ monitor, children }: { monitor: WakeMonitor | null; children: React.ReactNode }) {
  const { conn } = useGame();
  const snap = useWakeSnapshot(monitor);
  const [stage, setStage] = useState<'gate' | 'stamp' | 'done'>(() => (!monitor || monitor.snapshot.phase === 'ready' ? 'done' : 'gate'));
  const wasShown = useRef(false);
  // don't yank How to play / the profile sheet away mid-read: continue once it's closed
  const [holding, setHolding] = useState(false);
  if (snap && (snap.phase === 'waking' || snap.phase === 'slow')) wasShown.current = true;

  // a connected socket proves the server is up (unless we're simulating for review)
  useEffect(() => {
    if (monitor && !monitor.simulated && conn === 'connected') monitor.markHealthy();
  }, [conn, monitor]);

  useEffect(() => {
    if (stage !== 'gate' || snap?.phase !== 'ready') return;
    setStage(wasShown.current ? 'stamp' : 'done');
  }, [stage, snap?.phase]);

  useEffect(() => {
    if (stage !== 'stamp' || holding) return;
    const t = setTimeout(() => setStage('done'), prefersReducedMotion() ? READY_STAMP_REDUCED_MS : READY_STAMP_MS);
    return () => clearTimeout(t);
  }, [stage, holding]);

  if (stage === 'done' || !monitor || !snap) return <AfterWake>{children}</AfterWake>;
  // quiet first moment: a warm server answers before anyone notices
  if (snap.phase === 'probing') return <main className="screen wake-quiet" aria-busy="true" />;
  return <WakeUpScreen monitor={monitor} snap={snap} ready={stage === 'stamp'} onHold={setHolding} />;
}

/** After the first screen: watch for a sleeping server while on Home / in the lobby. */
function AfterWake({ children }: { children: React.ReactNode }) {
  const { conn, game, transport } = useGame();
  const atRisk = transport.kind === 'live' && conn !== 'connected' && (!game || game.round.phase === 'lobby');
  const [mon, setMon] = useState<WakeMonitor | null>(null);
  useEffect(() => {
    if (!atRisk) return;
    const m = new WakeMonitor(fetchProbe(healthUrl()), { quietMs: BANNER_AFTER_MS }).start();
    setMon(m);
    return () => {
      m.stop();
      setMon(null);
    };
  }, [atRisk]);
  const snap = useWakeSnapshot(mon);
  const show = !!mon && !!snap && atRisk && (snap.phase === 'waking' || snap.phase === 'slow');
  return (
    <WakeBannerContext.Provider value={show}>
      {show && mon && snap && <WakeBanner monitor={mon} snap={snap} />}
      {children}
    </WakeBannerContext.Provider>
  );
}

// ───────────────────────────── tips ─────────────────────────────

interface Tip {
  avatar: string;
  color: string;
  mood: AvatarMood;
  who: string;
  line: string;
}

export const WAKE_TIPS: Tip[] = [
  { avatar: 'chancla', color: 'coral', mood: 'sus', who: 'La Chancla', line: 'Is checking every desk. Nobody naps on her watch — not even the server.' },
  { avatar: 'duck', color: 'sky', mood: 'idle', who: 'Duck Disguise', line: 'Pro tip: give clues sharp enough for friends, vague enough to fool the Spy.' },
  { avatar: 'cow', color: 'lime', mood: 'win', who: 'Totally a Cow', line: 'One phone per player. A TV for the room code is optional. Moo.' },
  { avatar: 'goldfish', color: 'tangerine', mood: 'caught', who: 'Agent Bubbles', line: 'Forgot what we’re waiting for. (It’s the server. It’s waking up.)' },
  { avatar: 'paparazzi', color: 'iris', mood: 'idle', who: 'Paparazzi', line: 'The Spy doesn’t know the word — watch who copies everyone else’s clues.' },
  { avatar: 'ghost', color: 'slate', mood: 'sus', who: 'Ghosted', line: 'Phone locked mid-game? No drama — you’ll slide right back in.' }
];

function TipCard() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % WAKE_TIPS.length), TIP_MS);
    return () => clearInterval(id);
  }, []);
  const tip = WAKE_TIPS[i];
  return (
    <section className="wake__tip card card--manila" aria-label="While you wait">
      <span className="tag tag--ink wake__tip-tag">Overheard in the newsroom</span>
      <div className="wake__tip-body" key={i}>
        <Avatar avatar={tip.avatar} color={tip.color} mood={tip.mood} animated size={72} label={tip.who} />
        <p>
          <b>{tip.who}</b> {tip.line}
        </p>
      </div>
    </section>
  );
}

// ───────────────────────────── screen ─────────────────────────────

function ProgressBar({ monitor, snap, ready, compact }: { monitor: WakeMonitor; snap: WakeSnapshot; ready: boolean; compact?: boolean }) {
  useTick(!ready);
  const p = wakeProgress(monitor.elapsed(), ready || snap.phase === 'ready', monitor.t.expectedMs);
  const pct = Math.round(p * 100);
  return (
    <div
      className={`wake__bar ${compact ? 'wake__bar--compact' : ''} ${ready ? 'is-ready' : ''}`}
      role="progressbar"
      aria-label="Waking up the game server"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct / 10) * 10}
    >
      <span className="wake__fill" style={{ transform: `scaleX(${p})` }} />
    </div>
  );
}

function Elapsed({ monitor, ready }: { monitor: WakeMonitor; ready: boolean }) {
  useTick(!ready, 500);
  return (
    <span className="wake__clock type" aria-hidden="true">
      {clock(monitor.elapsed())}
    </span>
  );
}

export function WakeUpScreen({
  monitor,
  snap,
  ready,
  onHold
}: {
  monitor: WakeMonitor;
  snap: WakeSnapshot;
  ready: boolean;
  /** true while a sheet (How to play / profile) is open: the gate waits for it to close */
  onHold?: (hold: boolean) => void;
}) {
  const { profile, setProfile } = useGame();
  const [help, setHelp] = useState(false);
  const [editing, setEditing] = useState(false);
  useEffect(() => onHold?.(help || editing), [help, editing, onHold]);
  const [draft, setDraft] = useState<PlayerProfile>(profile);
  const slow = snap.phase === 'slow' && !ready;
  const invite = typeof window !== 'undefined' ? roomFromLocation().code : null;
  const hasName = profile.name.trim().length > 0;

  const status = ready
    ? help || editing
      ? 'The server is awake! Close this whenever you’re ready.'
      : 'The server is awake. Here we go!'
    : slow
      ? 'Still waking… this is taking longer than usual.'
      : 'Waking up the game server. This usually takes under a minute.';

  const save = () => {
    const name = draft.name.trim();
    if (!name) return;
    setProfile({ ...draft, name });
    setEditing(false);
  };

  return (
    <main className={`screen wake ${ready ? 'wake--ready' : ''}`} aria-busy={!ready}>
      <header className="masthead wake__masthead">
        <div className="masthead__meta">
          <span>The Daily Fib</span>
          <span>{ready ? 'Final edition' : 'Extra! Extra!'}</span>
        </div>
        <h1 className="masthead__title">{slow ? 'Hold the front page' : 'Stop the presses!'}</h1>
      </header>

      <section className="wake__lead">
        <h2 className="display h3">{slow ? 'Still waking… this is taking longer than usual' : 'The newsroom is waking up'}</h2>
        <p className="wake__explain">
          {slow ? (
            <>Our free server is being extra sleepy. Check your Wi-Fi or mobile data — we’ll keep knocking in the background.</>
          ) : (
            <>Our free server naps when nobody’s playing. The first game takes up to a minute to wake it — after that it’s instant.</>
          )}
        </p>
      </section>

      <section className="wake__progress card" aria-label="Wake-up progress">
        <div className="wake__progress-head">
          <span className="eyebrow">{ready ? 'Ready' : slow ? 'Still trying' : 'Warming the presses'}</span>
          <Elapsed monitor={monitor} ready={ready} />
        </div>
        <ProgressBar monitor={monitor} snap={snap} ready={ready} />
        <p className="wake__status type" role="status" aria-live="polite">
          {status}
        </p>
        {slow && (
          <div className="wake__slow">
            <button className="btn btn--primary btn--sm" onClick={() => monitor.retryNow()} disabled={snap.checking}>
              {snap.checking ? 'Checking…' : 'Retry now'}
            </button>
            <span className="faint wake__slow-note">Tried {snap.attempts}×. Nothing is lost.</span>
          </div>
        )}
        {ready && (
          <span className="stamp stamp--green stamp--lg stamp--slam wake__stamp" aria-hidden="true">
            Ready! <small>Hot off the press</small>
          </span>
        )}
      </section>

      {invite && (
        <p className="wake__invite card card--tight">
          <Icon name="check" size={18} />
          <span>
            Your invite to room <b className="type">{invite}</b> is saved — we’ll take you straight in.
          </span>
        </p>
      )}

      <TipCard />

      <div className="stack wake__actions">
        <button className="btn btn--gold btn--block" onClick={() => setHelp(true)}>
          <Icon name="help" size={20} /> Read how to play while you wait
        </button>
        <button
          className="btn btn--secondary btn--block wake__me"
          onClick={() => {
            setDraft(profile);
            setEditing(true);
          }}
        >
          <Avatar avatar={profile.avatar} color={profile.color} size={30} label="" />
          {hasName ? `Tweak your disguise, ${profile.name}` : 'Pick your look'}
        </button>
      </div>

      <HowToPlay open={help} onClose={() => setHelp(false)} />
      <Sheet
        open={editing}
        onClose={() => setEditing(false)}
        title="Your disguise"
        footer={
          <button className="btn btn--primary btn--block" onClick={save} disabled={!draft.name.trim()}>
            Looks good
          </button>
        }
      >
        <ProfileEditor value={draft} onChange={setDraft} premium={false} />
      </Sheet>
    </main>
  );
}

/** Compact form of the same screen, for a server that dozes off while you sit on Home / in the lobby. */
export function WakeBanner({ monitor, snap }: { monitor: WakeMonitor; snap: WakeSnapshot }) {
  const slow = snap.phase === 'slow';
  return (
    <div className="wake-banner" role="status" aria-live="polite">
      <div className="wake-banner__card">
        <div className="wake-banner__row">
          <b className="display wake-banner__title">{slow ? 'Still waking…' : 'Stop the presses!'}</b>
          <Elapsed monitor={monitor} ready={false} />
        </div>
        <p className="wake-banner__text">
          {slow
            ? 'Taking longer than usual — check your connection. We keep retrying.'
            : 'The game server dozed off. Waking it up (usually under a minute)…'}
        </p>
        <ProgressBar monitor={monitor} snap={snap} ready={false} compact />
        {slow && (
          <button className="btn btn--primary btn--sm wake-banner__retry" onClick={() => monitor.retryNow()} disabled={snap.checking}>
            {snap.checking ? 'Checking…' : 'Retry now'}
          </button>
        )}
      </div>
    </div>
  );
}
