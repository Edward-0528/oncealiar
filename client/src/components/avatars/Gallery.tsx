import React, { useState } from 'react';
import { ALL_AVATARS, AVATAR_INFO, PLAYER_COLORS, type AvatarId, type AvatarPack } from '@oncealiar/shared';
import { Avatar } from '../Avatar';
import { MOODS, type Mood } from './kit';

/**
 * Dev-only character sheet: every character x every mood, colour tints and
 * size ladder. Rendered at ?mock=characters.
 */

const PACKS: { id: AvatarPack; title: string; kicker: string }[] = [
  { id: 'free', title: 'The Usual Suspects', kicker: 'Free cast' },
  { id: 'disguise', title: 'Masters of Disguise', kicker: 'Premium pack' },
  { id: 'la-familia', title: 'La Familia', kicker: 'Premium pack' }
];

const MOOD_LABEL: Record<Mood, string> = { idle: 'Idle', sus: 'Sus', caught: 'Caught', win: 'Win' };

const css = {
  page: {
    minHeight: '100vh',
    background: '#FFE14D radial-gradient(rgba(17,17,17,0.13) 1.2px, transparent 1.4px) 0 0 / 9px 9px',
    color: '#111',
    fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
    padding: '24px 16px 64px'
  } as React.CSSProperties,
  head: { fontFamily: "Anton, Impact, sans-serif", textTransform: 'uppercase', lineHeight: 1, margin: 0, fontWeight: 400 } as React.CSSProperties,
  card: {
    background: '#FFFDF5',
    border: '3px solid #111',
    boxShadow: '5px 5px 0 #111',
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 8
  } as React.CSSProperties,
  tag: {
    fontFamily: "'Special Elite', 'Courier New', monospace",
    fontSize: 11,
    background: '#E8322A',
    color: '#FFFDF5',
    padding: '2px 6px',
    alignSelf: 'flex-start',
    transform: 'rotate(-2deg)'
  } as React.CSSProperties,
  control: { display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 14 } as React.CSSProperties
};

export function CharacterGallery() {
  const [color, setColor] = useState<string>('sky');
  const [animated, setAnimated] = useState(true);
  const [masked, setMasked] = useState(false);
  const [sticker, setSticker] = useState(false);
  const [focus, setFocus] = useState<AvatarId>('chancla');
  const [focusMood, setFocusMood] = useState<Mood>('idle');

  return (
    <div style={css.page}>
      <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 28 }}>
        <header style={{ borderBottom: '4px solid #111', paddingBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' }}>The Daily Fib · Dev lineup</div>
          <h1 style={{ ...css.head, fontSize: 'clamp(40px, 9vw, 72px)' }}>Character sheet</h1>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 12 }}>
            <label style={css.control}>
              Color
              <select value={color} onChange={(e) => setColor(e.target.value)}>
                {PLAYER_COLORS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <label style={css.control}>
              <input type="checkbox" checked={animated} onChange={(e) => setAnimated(e.target.checked)} /> Animated
            </label>
            <label style={css.control}>
              <input type="checkbox" checked={masked} onChange={(e) => setMasked(e.target.checked)} /> Masked
            </label>
            <label style={css.control}>
              <input type="checkbox" checked={sticker} onChange={(e) => setSticker(e.target.checked)} /> Sticker
            </label>
          </div>
        </header>

        {/* hero: big view + size ladder + colour row */}
        <section style={{ ...css.card, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 20 }}>
          <Avatar avatar={focus} color={color} size={240} mood={focusMood} animated={animated} masked={masked} sticker={sticker} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: '1 1 280px', minWidth: 0 }}>
            <span style={css.tag}>{AVATAR_INFO[focus].premium ? 'PREMIUM' : 'COVER STAR'}</span>
            <h2 style={{ ...css.head, fontSize: 40 }}>{AVATAR_INFO[focus].name}</h2>
            <p style={{ margin: 0, fontFamily: "'Special Elite', 'Courier New', monospace" }}>{AVATAR_INFO[focus].line}</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {MOODS.map((m) => (
                <button key={m} type="button" onClick={() => setFocusMood(m)} style={{ border: '2px solid #111', background: m === focusMood ? '#111' : '#FFFDF5', color: m === focusMood ? '#FFFDF5' : '#111', padding: '4px 10px', fontWeight: 700 }}>
                  {MOOD_LABEL[m]}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
              {[16, 24, 32, 48, 64, 96].map((s) => (
                <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: 10 }}>
                  <Avatar avatar={focus} color={color} size={s} mood={focusMood} label="" />
                  {s}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {PLAYER_COLORS.map((p) => (
                <Avatar key={p} avatar={focus} color={p} size={40} mood={focusMood} label={`${AVATAR_INFO[focus].name} in ${p}`} />
              ))}
            </div>
          </div>
        </section>

        {PACKS.map((pack) => (
          <section key={pack.id} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' }}>{pack.kicker}</div>
              <h2 style={{ ...css.head, fontSize: 36 }}>{pack.title}</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
              {ALL_AVATARS.filter((a) => AVATAR_INFO[a].pack === pack.id).map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => {
                    setFocus(a);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  style={{ ...css.card, cursor: 'pointer', textAlign: 'left', font: 'inherit', color: 'inherit', outline: a === focus ? '3px solid #E8322A' : undefined }}
                  aria-label={`Show ${AVATAR_INFO[a].name}`}
                >
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ ...css.head, fontSize: 22 }}>{AVATAR_INFO[a].name}</span>
                    <code style={{ fontSize: 11 }}>{a}</code>
                  </div>
                  <span style={{ fontSize: 12, lineHeight: 1.3 }}>{AVATAR_INFO[a].line}</span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, background: '#F1E3C2', border: '2px solid #111', padding: 4 }}>
                    {MOODS.map((m) => (
                      <div key={m} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>
                        <Avatar avatar={a} color={color} size="100%" mood={m} animated={animated && m === 'idle'} masked={masked} sticker={sticker} label={`${AVATAR_INFO[a].name}, ${m}`} />
                        {MOOD_LABEL[m]}
                      </div>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

export default CharacterGallery;
