import React from 'react';
import {
  Brows,
  Burst,
  CHARCOAL,
  Cheeks,
  Eye,
  Eyes,
  Glint,
  form,
  GOLD,
  INK,
  L,
  MoodFx,
  Mouth,
  O,
  PAPER,
  RED,
  S,
  SHINE,
  Shout,
  T,
  YELLOW,
  type CharacterArt
} from './kit';

/** Gadget characters (Shoe Phone, Inspector Lupa), sold in the Masters of Disguise pack. Player colour = `c`. */

const STEEL = '#CFD3D8';

/* ---------------------------------------------------------- SHOE PHONE */

const shoephone: CharacterArt = {
  alt: 'Shoe Phone, a dress shoe with an antenna',
  anim: 'bounce',
  mask: { x: 67, y: 82, s: 0.6 },
  draw: ({ c, mood, uid }) => (
    <>
      <g className="av-part-signal">
        {mood === 'caught' ? (
          <Shout x={42} y={18} size={11} fill={RED} rot={-8}>
            RING!
          </Shout>
        ) : (
          <path d="M30 18 Q34 22 30 26 M36 13 Q43 22 36 31 M14 18 Q10 22 14 26 M8 13 Q1 22 8 31" {...O} strokeWidth={2.8} />
        )}
      </g>
      <path d="M24 60 L22 24" stroke={INK} strokeWidth={4} strokeLinecap="round" />
      <circle cx={22} cy={22} r={5} fill={RED} {...T} />
      <path d="M10 101 L108 101 Q112 108 104 111 L16 111 Q8 108 10 101 Z" fill={INK} {...S} />
      <rect x={14} y={95} width={24} height={14} rx={3} fill={CHARCOAL} {...S} />
      {form(uid, 's', <path d="M15 98 Q12 62 30 54 Q43 49 49 61 Q57 72 78 73 Q106 76 108 98 Z" />, c)}
      <Glint d="M22 64 Q19 76 20 88" w={3.5} />
      <path d="M40 54 L54 70 M46 54 L36 64 M52 60 L42 70" {...L} />
      <path d="M44 62 l-6 -8 M48 64 l2 -10" stroke={PAPER} strokeWidth={2} strokeLinecap="round" />
      {/* keypad on the heel */}
      {[0, 1, 2].map((r) =>
        [0, 1].map((k) => <circle key={`${r}${k}`} cx={24 + k * 7} cy={70 + r * 7} r={2.2} fill={PAPER} {...T} strokeWidth={1.5} />)
      )}
      <Eyes x1={64} x2={82} y={84} r={5.4} mood={mood} look={1} lid={c} />
      <Brows x1={64} x2={82} y={75} mood={mood} w={4.5} width={3} />
      <Mouth x={73} y={93} w={5} mood={mood} idle="tiny" />
      <Cheeks x1={56} x2={92} y={90} r={3.5} />
      <MoodFx mood={mood} x={98} y={52} />
    </>
  )
};

/* ------------------------------------------------------ INSPECTOR LUPA */

const GLASS = '#DDEFFC';

const magnifier: CharacterArt = {
  alt: 'Inspector Lupa, a magnifying glass with one huge eye and a mustache',
  anim: 'wiggle',
  mask: { x: 50, y: 45, s: 0.75 },
  draw: ({ c, mood, uid }) => {
    const brow =
      mood === 'sus'
        ? 'M36 26 Q48 30 64 28'
        : mood === 'caught'
          ? 'M36 22 Q50 12 64 20'
          : mood === 'win'
            ? 'M36 24 Q50 14 64 24'
            : 'M36 26 Q50 20 64 26';
    return (
      <>
        <g transform="rotate(-45 90 92)">
          {form(uid, 'h', <rect x={83} y={70} width={14} height={46} rx={7} />, c, undefined, 3.5, -3, -3)}
          <Glint d="M88 78 V104" w={2.5} />
          <rect x={81} y={66} width={18} height={9} rx={2} fill={GOLD} {...T} />
        </g>
        <circle cx={50} cy={46} r={33} fill={GLASS} stroke={INK} strokeWidth={12} />
        <circle cx={50} cy={46} r={33} fill="none" stroke={CHARCOAL} strokeWidth={6} />
        <path d="M28 34 Q32 22 44 18" fill="none" stroke={PAPER} strokeWidth={4} strokeLinecap="round" />
        <Eye x={50} y={46} r={15} mood={mood} look={1} lid={GLASS} />
        <path d={brow} fill="none" stroke={INK} strokeWidth={6} strokeLinecap="round" />
        {/* big handlebar mustache across the rim */}
        <path
          d="M50 80 Q42 73 32 77 Q22 83 14 74 Q15 90 32 88 Q44 87 50 82 Q56 87 68 88 Q85 90 86 74 Q78 83 68 77 Q58 73 50 80 Z"
          fill={INK}
          transform={mood === 'win' ? 'rotate(-4 50 80)' : undefined}
        />
        <Mouth x={50} y={97} w={5.5} mood={mood} idle="none" />
        <MoodFx mood={mood} x={98} y={22} />
      </>
    );
  }
};

export const GADGET_ART = { shoephone, magnifier } satisfies Record<string, CharacterArt>;
