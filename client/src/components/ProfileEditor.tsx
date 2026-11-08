import React, { useEffect, useRef } from 'react';
import { AVATARS, AVATAR_INFO, AVATAR_PACKS, PLAYER_COLORS, PREMIUM_AVATARS, isAvatarId, type AvatarId, type PlayerProfile } from '@oncealiar/shared';
import { Avatar } from './Avatar';
import { Icon } from './Icon';
import { randomProfile } from '../lib/profile';
import { sfx } from '../lib/sound';
import { useGameOptional } from '../state/GameProvider';
import './ProfileEditor.css';

// La Chancla, Duck Disguise, Totally a Cow and Agent Bubbles lead the free cast
const LEADS: readonly AvatarId[] = ['chancla', 'duck', 'cow', 'goldfish'];
const FREE: readonly AvatarId[] = [...LEADS, ...AVATARS.filter((a) => !LEADS.includes(a))];
// premium characters grouped by pack, in pack display order
const PACKS = AVATAR_PACKS.map((p) => ({ ...p, ids: PREMIUM_AVATARS.filter((a) => AVATAR_INFO[a].pack === p.id) }));
const PREMIUM_ORDER: readonly AvatarId[] = PACKS.flatMap((p) => p.ids);

/**
 * Character + name + color picker. Free cast with names and one-liners; premium packs are
 * shown locked and become selectable only in a premium room (the server rejects them otherwise).
 */
export function ProfileEditor({
  value,
  onChange,
  autoFocusName,
  premium
}: {
  value: PlayerProfile;
  onChange: (p: PlayerProfile) => void;
  autoFocusName?: boolean;
  /** allow premium characters (defaults to the current room's premium flag) */
  premium?: boolean;
}) {
  const store = useGameOptional();
  const premiumOk = premium ?? !!store?.game?.premium;
  const strip = useRef<HTMLDivElement>(null);
  useEffect(() => {
    strip.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.scrollIntoView?.({ block: 'nearest', inline: 'center' });
  }, [value.avatar]);

  const selectable: readonly AvatarId[] = premiumOk ? [...FREE, ...PREMIUM_ORDER] : FREE;
  const idx = selectable.indexOf(value.avatar as AvatarId);
  const step = (d: number) => {
    sfx.tap();
    onChange({ ...value, avatar: selectable[(Math.max(0, idx) + d + selectable.length) % selectable.length] });
  };
  const info = isAvatarId(value.avatar) ? AVATAR_INFO[value.avatar] : null;

  const tile = (a: AvatarId, locked: boolean) => (
    <button
      key={a}
      type="button"
      role="radio"
      aria-checked={a === value.avatar}
      aria-label={`${AVATAR_INFO[a].name}${locked ? ' (premium, locked)' : ''}`}
      aria-disabled={locked || undefined}
      title={locked ? 'Premium character — unlock premium for this room' : AVATAR_INFO[a].line}
      className={`pe__av ${a === value.avatar ? 'is-on' : ''} ${locked ? 'is-locked' : ''}`}
      onClick={() => {
        if (locked) return;
        sfx.tap();
        onChange({ ...value, avatar: a });
      }}
    >
      <Avatar avatar={a} color={value.color} size="100%" label="" />
      {locked && (
        <span className="pe__lock" aria-hidden="true">
          <Icon name="lock" size={14} />
        </span>
      )}
      <span className="pe__av-name">{AVATAR_INFO[a].name}</span>
    </button>
  );

  return (
    <div className="pe">
      <div className="pe__hero">
        <button type="button" className="icon-btn" onClick={() => step(-1)} aria-label="Previous character">
          <Icon name="left" />
        </button>
        <div className="pe__preview" key={value.avatar + value.color}>
          <Avatar avatar={value.avatar} color={value.color} size="100%" label={`Your character: ${info?.name ?? value.avatar}`} animated />
        </div>
        <button type="button" className="icon-btn" onClick={() => step(1)} aria-label="Next character">
          <Icon name="right" />
        </button>
      </div>
      {info && (
        <p className="pe__bio" aria-live="polite">
          <b className="display">{info.name}</b>
          <span>{info.line}</span>
        </p>
      )}

      <label className="field">
        <span className="field__label">Your name</span>
        <div className="row">
          <input
            className="input"
            value={value.name}
            maxLength={16}
            placeholder="e.g. Sneaky Sam"
            autoComplete="nickname"
            autoFocus={autoFocusName}
            data-autofocus={autoFocusName ? true : undefined}
            onChange={(e) => onChange({ ...value, name: e.target.value })}
            enterKeyHint="done"
          />
          <button
            className="icon-btn pe__dice"
            type="button"
            aria-label="Randomize character and color"
            onClick={() => {
              sfx.pop();
              onChange({ ...randomProfile(value.name) });
            }}
          >
            <Icon name="dice" />
          </button>
        </div>
      </label>

      <div className="field">
        <span className="field__label" id="pe-avatars">
          Character
        </span>
        <div className="pe__strip" role="radiogroup" aria-labelledby="pe-avatars" ref={strip}>
          {FREE.map((a) => tile(a, false))}
        </div>
        {PACKS.map(({ id: pack, name, ids }) => (
          <div key={pack} className="pe__pack">
            <span className="pe__pack-label">
              {name} {!premiumOk && <span className="chip chip--gold">Premium</span>}
            </span>
            <div className="pe__strip" role="radiogroup" aria-label={name}>
              {ids.map((a) => tile(a, !premiumOk))}
            </div>
          </div>
        ))}
      </div>

      <div className="field">
        <span className="field__label" id="pe-colors">
          Color
        </span>
        <div className="pe__colors" role="radiogroup" aria-labelledby="pe-colors">
          {PLAYER_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={c === value.color}
              aria-label={c}
              className={`pe__color ${c === value.color ? 'is-on' : ''}`}
              style={{ background: `var(--pc-${c})` }}
              onClick={() => {
                sfx.tap();
                onChange({ ...value, color: c });
              }}
            >
              {c === value.color && <Icon name="check" size={18} />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
