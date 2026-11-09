import React, { useEffect, useId, useRef, useState } from 'react';
import { AVATARS, AVATAR_INFO, AVATAR_PACKS, PLAYER_COLORS, PREMIUM_AVATARS, isAvatarId, type AvatarId, type PlayerProfile } from '@oncealiar/shared';
import { Avatar } from './Avatar';
import { Icon } from './Icon';
import { PremiumModal } from './PremiumModal';
import { avatarNoun, codename, colorVar, retargetCodename } from '../lib/profile';
import { sfx } from '../lib/sound';
import { buzz } from '../lib/haptics';
import { useGameOptional } from '../state/GameProvider';
import './ProfileEditor.css';

/** curtain close time (matches the CSS transition), and the beat with the curtains shut */
export const CURTAIN_MS = 320;
export const CURTAIN_BEAT_MS = 140;
const REVEAL_DELAY_MS = 220;

interface Rack {
  id: string;
  label: string;
  ids: readonly AvatarId[];
  premium: boolean;
}
/** "Case Files" tabs: the free cast, then each premium pack (short label = last word of the pack name) */
const RACKS: readonly Rack[] = [
  { id: 'free', label: 'Suspects', ids: AVATARS, premium: false },
  ...AVATAR_PACKS.map((p) => ({
    id: p.id,
    label: p.name.split(' ').pop() ?? p.name,
    ids: PREMIUM_AVATARS.filter((a) => AVATAR_INFO[a].pack === p.id),
    premium: true
  }))
];
const rackOf = (a: string) => Math.max(0, RACKS.findIndex((r) => (r.ids as readonly string[]).includes(a)));
/** polaroid tilt per grid slot (degrees) */
const TILT = [-2, 1.5, -1, 2, 1, -1.5, 2, -2, -1, 1.5, -2, 1];

const pick = <T,>(arr: readonly T[], rng: () => number) => arr[Math.floor(rng() * arr.length)];

function usePrefersReducedMotion(): boolean {
  const query = '(prefers-reduced-motion: reduce)';
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches);
  useEffect(() => {
    const mq = typeof window !== 'undefined' ? window.matchMedia?.(query) : undefined;
    if (!mq) return;
    const on = () => setReduced(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return reduced;
}

/**
 * Stage curtains: when `target` changes, close (CURTAIN_MS), swap who's shown while hidden,
 * hold a beat, then reopen. A new target mid-sequence restarts it; the latest pick wins.
 * Reduced motion: swap immediately (the CSS crossfades), no timers.
 */
function useCurtain(target: string, reduced: boolean) {
  const [shown, setShown] = useState(target);
  const [closed, setClosed] = useState(!reduced);
  const latest = useRef(target);
  const shownRef = useRef(target);
  const closedRef = useRef(!reduced);
  const running = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  latest.current = target;

  const clear = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  const close = (v: boolean) => {
    closedRef.current = v;
    setClosed(v);
  };

  // opening night: a short reveal on mount
  useEffect(() => {
    if (reduced) {
      close(false);
      return;
    }
    timers.current.push(setTimeout(() => close(false), REVEAL_DELAY_MS));
    return clear;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (reduced) {
      clear();
      running.current = false;
      shownRef.current = target;
      setShown(target);
      close(false);
      return;
    }
    if (target === shownRef.current && !running.current) return;
    clear();
    running.current = true;
    if (!closedRef.current) sfx.curtain();
    close(true);
    timers.current.push(
      setTimeout(() => {
        shownRef.current = latest.current;
        setShown(latest.current);
        timers.current.push(
          setTimeout(() => {
            running.current = false;
            close(false);
          }, CURTAIN_BEAT_MS)
        );
      }, CURTAIN_MS + 20)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, reduced]);

  useEffect(() => clear, []);
  return { shown, closed };
}

export interface ProfileEditorProps {
  value: PlayerProfile;
  onChange: (p: PlayerProfile) => void;
  /** CTA text; a function gets the character's one-word noun ("Chancla") */
  ctaLabel: string | ((noun: string) => string);
  /** called from the CTA with a trimmed, never-empty name (an empty one gets a codename) */
  onSubmit: (p: PlayerProfile) => void;
  /** disables the CTA while a request is in flight */
  busy?: boolean;
  /** open the codename editor on mount */
  autoFocusName?: boolean;
  /** allow premium characters (defaults to the current room's premium flag) */
  premium?: boolean;
  /** the viewer can unlock premium (defaults to "is the room host") */
  host?: boolean;
  /** characters other players already wear: shuffle avoids them (defaults to the room's other players) */
  takenAvatars?: readonly string[];
  /** names already used in the room: generated codenames avoid them */
  takenNames?: readonly string[];
  /** full-screen page (Profile screen) vs inside a Sheet */
  variant?: 'page' | 'sheet';
  /** page variant: a back button on the stage */
  onBack?: () => void;
}

/**
 * "Backstage" character picker: a theater stage starring your character (curtains close/open
 * between picks), a manila "Case Files" grid of the free cast + premium packs, a spotlight color
 * row and the CTA. Premium characters can be tried on stage; they're selectable only in a premium
 * room (the server rejects them otherwise).
 */
export function ProfileEditor({
  value,
  onChange,
  ctaLabel,
  onSubmit,
  busy,
  autoFocusName,
  premium,
  host,
  takenAvatars,
  takenNames,
  variant = 'sheet',
  onBack
}: ProfileEditorProps) {
  const store = useGameOptional();
  const uid = useId();
  const premiumOk = premium ?? !!store?.game?.premium;
  const others = store?.game?.players.filter((p) => p.id !== store.you?.playerId) ?? [];
  const isHost = host ?? !!store?.game?.players.find((p) => p.id === store.you?.playerId)?.isHost;
  const taken = takenAvatars ?? others.map((p) => p.avatar);
  const names = takenNames ?? others.map((p) => p.name);

  const [tab, setTab] = useState(() => rackOf(value.avatar));
  const [peek, setPeek] = useState<AvatarId | null>(null);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const nameInput = useRef<HTMLInputElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const reduced = usePrefersReducedMotion();
  const target = peek ?? value.avatar;
  const { shown, closed } = useCurtain(target, reduced);
  const shownInfo = isAvatarId(shown) ? AVATAR_INFO[shown] : AVATAR_INFO.chancla;

  // always star someone: an empty name gets a fun codename up front
  const valueRef = useRef(value);
  valueRef.current = value;
  useEffect(() => {
    if (!valueRef.current.name.trim()) onChange({ ...valueRef.current, name: codename(valueRef.current.avatar, names) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!autoFocusName) return;
    nameInput.current?.focus();
    nameInput.current?.select();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rack = RACKS[tab];
  const locked = rack.premium && !premiumOk;
  const peeking = peek !== null;
  const noun = avatarNoun(value.avatar);
  const peekPack = peek ? AVATAR_PACKS.find((p) => p.id === AVATAR_INFO[peek].pack)?.name : undefined;

  const wear = (a: AvatarId, color = value.color) => {
    setPeek(null);
    onChange({ ...value, avatar: a, color, name: retargetCodename(value.name, a, names) });
  };

  const pickTile = (a: AvatarId) => {
    buzz(8);
    if (locked) {
      if (peek === a) return;
      sfx.tap();
      setPeek(a);
      return;
    }
    if (a === value.avatar && !peeking) return;
    sfx.tap();
    wear(a);
  };

  const shuffle = () => {
    sfx.pop();
    buzz(12);
    const pool = (premiumOk ? [...AVATARS, ...PREMIUM_AVATARS] : [...AVATARS]) as AvatarId[];
    const fresh = pool.filter((a) => a !== value.avatar && !taken.includes(a));
    const a = pick(fresh.length ? fresh : pool.filter((x) => x !== value.avatar), Math.random);
    const colors = PLAYER_COLORS.filter((c) => c !== value.color);
    setTab(rackOf(a));
    wear(a, pick(colors, Math.random));
  };

  const switchTab = (j: number) => {
    if (j === tab) return;
    sfx.tap();
    setTab(j);
    setPeek(null);
  };
  const onTabKey = (e: React.KeyboardEvent, j: number) => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const n = (j + d + RACKS.length) % RACKS.length;
    switchTab(n);
    tabRefs.current[n]?.focus();
  };

  const finishName = () => {
    if (!value.name.trim()) onChange({ ...value, name: codename(value.avatar, names) });
  };
  const editName = () => {
    nameInput.current?.focus();
    nameInput.current?.select();
  };
  const newCodename = () => {
    sfx.tap();
    onChange({ ...value, name: codename(value.avatar, [...names, value.name]) });
  };

  const submit = () => {
    if (peeking) {
      if (isHost) setUnlockOpen(true);
      else store?.toast(`Only the host can unlock ${peekPack ?? 'premium'} — for the whole room.`, 'info');
      return;
    }
    const name = value.name.trim() || codename(value.avatar, names);
    const p = { ...value, name };
    if (name !== value.name) onChange(p);
    sfx.pop();
    onSubmit(p);
  };

  const label = peeking ? (isHost ? 'Unlock for the room' : 'Ask the host to unlock') : typeof ctaLabel === 'function' ? ctaLabel(noun) : ctaLabel;

  return (
    <div className={`bs bs--${variant} ${reduced ? 'bs--reduced' : ''}`}>
      <div className="bs__layout">
        <section className={`bs__stage ${closed ? 'is-closed' : ''}`} style={{ '--spot': colorVar(value.color) } as React.CSSProperties} aria-label="Stage">
          <div className="bs__marquee">
            <span className="bs__marquee-kicker">TONIGHT STARRING</span>
            <button type="button" className="bs__marquee-name" onClick={editName} aria-label={`Your name: ${value.name.trim() || 'Mystery Guest'}. Tap to change it`}>
              <span>{value.name.trim() || 'Mystery Guest'}</span>
              <Icon name="edit" size={14} />
            </button>
            <span className="bs__marquee-as">as {shownInfo.name}</span>
          </div>

          <div className="bs__pedestal" aria-hidden="true" />
          <div className="bs__actor" key={reduced ? shown : undefined}>
            <Avatar avatar={shown} color={value.color} size="100%" label={`${shownInfo.name} on stage`} animated />
          </div>
          <div className="bs__floor" aria-hidden="true" />

          <div className="bs__curtain bs__curtain--l" aria-hidden="true" />
          <div className="bs__curtain bs__curtain--r" aria-hidden="true" />
          <div className="bs__valance" aria-hidden="true" />

          {onBack && (
            <button type="button" className="bs__stage-btn bs__back" onClick={onBack} aria-label="Back">
              <Icon name="left" size={20} />
            </button>
          )}
          <button type="button" className="bs__stage-btn bs__shuffle" onClick={shuffle} aria-label="Shuffle character and color">
            <Icon name="dice" size={16} />
            SHUFFLE
          </button>
        </section>

        <div className="bs__body">
          <div className="bs__files">
            <div className="bs__tabs" role="tablist" aria-label="Case files">
              {RACKS.map((r, j) => (
                <button
                  key={r.id}
                  ref={(el) => (tabRefs.current[j] = el)}
                  type="button"
                  role="tab"
                  id={`${uid}-tab-${j}`}
                  aria-selected={j === tab}
                  aria-controls={`${uid}-panel`}
                  tabIndex={j === tab ? 0 : -1}
                  className={`bs__tab ${j === tab ? 'is-on' : ''}`}
                  onClick={() => switchTab(j)}
                  onKeyDown={(e) => onTabKey(e, j)}
                >
                  {r.label} <span className="bs__tab-count">{(r.premium && !premiumOk ? 'PRO · ' : '') + r.ids.length}</span>
                </button>
              ))}
            </div>
            <div className="bs__folder" role="tabpanel" id={`${uid}-panel`} aria-labelledby={`${uid}-tab-${tab}`}>
              <div className="bs__grid">
                {rack.ids.map((a, j) => {
                  const on = locked ? peek === a : !peeking && value.avatar === a;
                  const info = AVATAR_INFO[a];
                  return (
                    <button
                      key={a}
                      type="button"
                      className={`bs__tile ${on ? 'is-on' : ''} ${locked && !on ? 'is-locked' : ''}`}
                      style={{ '--tilt': `${TILT[j % TILT.length]}deg` } as React.CSSProperties}
                      aria-pressed={on}
                      aria-label={locked ? `Try on ${info.name} (premium preview)` : `Wear ${info.name}`}
                      title={info.line}
                      onClick={() => pickTile(a)}
                    >
                      <span className="bs__tile-art">
                        <Avatar avatar={a} color={value.color} size="100%" label="" />
                      </span>
                      <span className="bs__tile-name">{info.name}</span>
                      {on && (
                        <span className="bs__tile-check" aria-hidden="true">
                          <Icon name="check" size={12} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {locked && (
                <div className="bs__pro">
                  <span>Tap to try one on stage. The host unlocks the pack for the whole room.</span>
                  {store && (
                    <button type="button" className="bs__pro-btn" onClick={() => setUnlockOpen(true)}>
                      Unlock
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="bs__namefield">
            <label className="bs__namefield-label" htmlFor={`${uid}-name`}>
              Your name
            </label>
            <div className="bs__namefield-row">
              <input
                id={`${uid}-name`}
                ref={nameInput}
                className="bs__name-input"
                value={value.name}
                maxLength={16}
                placeholder="Type your name"
                autoComplete="nickname"
                enterKeyHint="done"
                data-autofocus={autoFocusName ? true : undefined}
                onChange={(e) => onChange({ ...value, name: e.target.value })}
                onBlur={finishName}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.currentTarget.blur();
                  }
                }}
              />
              <button type="button" className="bs__namefield-dice" onClick={newCodename} aria-label="Give me a random codename">
                <Icon name="dice" size={18} />
              </button>
            </div>

          <div className="bs__spot" role="group" aria-labelledby={`${uid}-spot`}>
            <span className="bs__spot-label" id={`${uid}-spot`}>
              Spotlight
            </span>
            <div className="bs__swatches">
              {PLAYER_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`bs__swatch ${c === value.color ? 'is-on' : ''}`}
                  aria-pressed={c === value.color}
                  aria-label={`${c} spotlight`}
                  onClick={() => {
                    if (c === value.color) return;
                    sfx.tap();
                    onChange({ ...value, color: c });
                  }}
                >
                  <span style={{ background: colorVar(c) }} />
                </button>
              ))}
            </div>
          </div>

          <div className="bs__cta-wrap">
            </div>
            <button type="button" className={`bs__cta ${peeking ? 'is-peek' : ''}`} onClick={submit} disabled={busy} aria-busy={busy || undefined}>
              {label}
            </button>
          </div>
        </div>
      </div>
      {store && unlockOpen && <PremiumModal open onClose={() => setUnlockOpen(false)} />}
    </div>
  );
}
