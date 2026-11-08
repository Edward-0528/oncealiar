import React from 'react';
import {
  Brows,
  Cheeks,
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
  SKIN,
  Shades,
  Shout,
  T,
  type CharacterArt,
  type Mood
} from './kit';

/** Premium pack: La Familia. Affectionate, never mean. Player colour = `c`. */

/** Draw a set of circles as one merged blob (outline pass, then fill pass). */
function Blob({ circles, fill }: { circles: [number, number, number][]; fill: string }) {
  return (
    <g>
      {circles.map(([x, y, r], i) => (
        <circle key={`o${i}`} cx={x} cy={y} r={r} fill={fill} {...S} />
      ))}
      {circles.map(([x, y, r], i) => (
        <circle key={`f${i}`} cx={x} cy={y} r={r - 1.75} fill={fill} />
      ))}
    </g>
  );
}

const Lashes = ({ x1, x2, y, mood }: { x1: number; x2: number; y: number; mood: Mood }) =>
  mood === 'win' ? null : (
    <path d={`M${x1 - 5} ${y - 4} l-3.5 -2.5 M${x2 + 5} ${y - 4} l3.5 -2.5`} {...L} strokeWidth={2.2} />
  );

/* ---------------------------------------------------------- LA ABUELA */

const LAVENDER = '#B9A3D9';
const GREY_HAIR = '#D5D3DA';

const abuela: CharacterArt = {
  alt: 'La Abuela, a grandma in hair rollers with a chancla ready',
  anim: 'wiggle',
  mask: { x: 60, y: 61, s: 0.72 },
  draw: ({ c, mood, uid }) => (
    <>
      {form(uid, 'b', <path d="M18 120 Q20 96 60 94 Q100 96 102 120 Z" />, LAVENDER, '#9481B8')}
      <path d="M44 96 Q48 104 52 97 Q56 104 60 97 Q64 104 68 97 Q72 104 76 96" fill={PAPER} {...T} />
      <circle cx={60} cy={110} r={2.5} fill={PAPER} {...T} />
      <Blob circles={[[36, 50, 15], [60, 40, 20], [84, 50, 15], [34, 68, 11], [86, 68, 11]]} fill={GREY_HAIR} />
      {/* rollers = player colour */}
      {[
        [30, 30, -24],
        [51, 21, -8],
        [70, 21, 8],
        [90, 30, 24]
      ].map(([x, y, r]) => (
        <g key={x} transform={`rotate(${r} ${x} ${y})`}>
          <rect x={x - 8} y={y - 6} width={16} height={12} rx={5} fill={c} {...S} />
          <path d={`M${x - 3} ${y - 6} v12 M${x + 3} ${y - 6} v12`} {...L} strokeWidth={1.8} opacity={0.6} />
        </g>
      ))}
      {form(uid, 'h', <circle cx={60} cy={64} r={25} />, SKIN.tan, '#C48C5E')}
      <Glint d="M41 56 Q43 46 51 42" w={3} o={0.6} />
      <circle cx={37} cy={74} r={2.6} fill={PAPER} {...T} />
      <circle cx={83} cy={74} r={2.6} fill={PAPER} {...T} />
      <Eyes x1={50} x2={70} y={62} r={6} mood={mood} look={1} lid={SKIN.tan} />
      <circle cx={50} cy={62} r={9} fill="none" stroke={INK} strokeWidth={3} />
      <circle cx={70} cy={62} r={9} fill="none" stroke={INK} strokeWidth={3} />
      <path d="M59 61 Q60 59 61 61" {...L} strokeWidth={3} />
      <path d="M41 63 Q36 80 42 94 M79 63 Q84 80 78 94" fill="none" stroke={GOLD} strokeWidth={1.8} strokeDasharray="2 2" />
      <Brows x1={50} x2={70} y={48} mood={mood} base="calm" w={6} color="#8A8790" />
      <Cheeks x1={41} x2={79} y={74} />
      <Mouth x={60} y={78} w={6.5} mood={mood} />
      {/* chancla at the ready */}
      <g className="av-part-chancla" transform={mood === 'win' ? 'rotate(-14 98 62)' : undefined}>
        <path d="M88 82 Q94 70 96 62" stroke={INK} strokeWidth={9} strokeLinecap="round" fill="none" />
        <path d="M88 82 Q94 70 96 62" stroke={LAVENDER} strokeWidth={4.5} strokeLinecap="round" fill="none" />
        <g transform="rotate(18 102 38)">
          {form(uid, 'c', <ellipse cx={102} cy={38} rx={9} ry={19} />, '#2F7DE1', '#1F5CB0', 3.5, -3, -3)}
          <path d="M102 28 L95 40 M102 28 L109 40" stroke={INK} strokeWidth={6} strokeLinecap="round" />
          <path d="M102 28 L95 40 M102 28 L109 40" stroke={RED} strokeWidth={3} strokeLinecap="round" />
        </g>
        <circle cx={96} cy={60} r={6.5} fill={SKIN.tan} {...S} />
        {mood !== 'caught' && <path d="M112 20 l5 -4 M114 30 l6 -1 M108 12 l2 -6" {...O} strokeWidth={2.8} />}
      </g>
      <MoodFx mood={mood} x={20} y={36} side={-1} />
    </>
  )
};

/* ------------------------------------------------------------- EL TÍO */

const SAUSAGE = '#C0533A';
const STEEL = '#CFD3D8';

const tio: CharacterArt = {
  alt: 'El Tío, an uncle in sunglasses and a guayabera with BBQ tongs',
  anim: 'sway',
  mask: { x: 60, y: 60, s: 0.72 },
  draw: ({ c, mood, uid }) => (
    <>
      <path d="M16 50 q-4 -6 0 -12 q4 -6 0 -12 M26 48 q-3 -5 0 -10 q3 -5 0 -10" fill="none" stroke="#999" strokeWidth={2.5} strokeLinecap="round" className="av-part-smoke" />
      {form(uid, 'b', <path d="M14 120 L20 101 Q30 90 60 90 Q90 90 100 101 L106 120 Z" />, c)}
      <path d="M48 91 L60 106 L72 91 Z" fill={PAPER} {...T} />
      <path d="M36 98 V120 M84 98 V120 M42 96 V120 M78 96 V120" {...L} strokeWidth={2} opacity={0.55} />
      <path d="M46 90 L54 102 L44 100 Z M74 90 L66 102 L76 100 Z" fill={c} {...T} />
      <circle cx={35} cy={62} r={5.5} fill={SKIN.brown} {...S} />
      <circle cx={85} cy={62} r={5.5} fill={SKIN.brown} {...S} />
      {form(uid, 'h', <circle cx={60} cy={63} r={26} />, SKIN.brown, '#8A5535')}
      <path d="M35 56 Q34 34 60 33 Q86 34 85 56 Q78 42 60 43 Q42 42 35 56 Z" fill={INK} {...S} />
      <path d="M48 38 Q58 35 68 37" fill="none" stroke="#555" strokeWidth={2.5} strokeLinecap="round" />
      <Shades x1={49} x2={71} y={60} w={18} h={11} mood={mood} lid={SKIN.brown} />
      <Mouth x={60} y={83} w={6} mood={mood} />
      <path d="M43 75 Q52 69 60 72 Q68 69 77 75 Q71 80 60 77 Q49 80 43 75 Z" fill={INK} />
      {/* tongs + a sausage */}
      <g className="av-part-tongs">
        <path d="M28 100 L14 70 M28 100 L24 68" stroke={INK} strokeWidth={6.5} strokeLinecap="round" />
        <path d="M28 100 L14 70 M28 100 L24 68" stroke={STEEL} strokeWidth={3} strokeLinecap="round" />
        <rect x={6} y={58} width={26} height={11} rx={5.5} transform="rotate(-8 19 63)" fill={SAUSAGE} {...S} />
        <path d="M12 61 l2 4 M18 60 l2 4 M24 59 l2 4" stroke="#7A2E1E" strokeWidth={1.8} strokeLinecap="round" />
        <circle cx={28} cy={100} r={7} fill={SKIN.brown} {...S} />
      </g>
      <MoodFx mood={mood} x={98} y={40} />
    </>
  )
};

/* ---------------------------------------------------- LA TÍA CHISMOSA */

const HAIR_D = '#3B2620';
const BLOUSE = '#E86A92';
const LIPS = '#C2185B';

const tia: CharacterArt = {
  alt: 'La Tía Chismosa, an aunt with big curls on the phone with the latest gossip',
  anim: 'bob',
  mask: { x: 60, y: 61, s: 0.68 },
  draw: ({ c, mood, uid }) => {
    const bubble = mood === 'sus' ? '¿Y?' : mood === 'caught' ? '¡AY!' : mood === 'win' ? '¡JA!' : 'PSST';
    return (
      <>
        {form(uid, 'b', <path d="M16 120 Q20 98 60 96 Q100 98 104 120 Z" />, BLOUSE, '#C24E74')}
        <circle cx={40} cy={110} r={2.5} fill={PAPER} />
        <circle cx={60} cy={106} r={2.5} fill={PAPER} />
        <circle cx={80} cy={112} r={2.5} fill={PAPER} />
        <Blob
          circles={[
            [36, 48, 13],
            [46, 32, 13],
            [62, 26, 14],
            [78, 32, 13],
            [88, 48, 12],
            [32, 66, 11],
            [90, 66, 10],
            [36, 84, 9],
            [86, 84, 9]
          ]}
          fill={HAIR_D}
        />
        {form(uid, 'h', <circle cx={60} cy={63} r={24} />, SKIN.tan, '#C48C5E')}
        <path d="M40 52 Q46 38 60 40 Q74 38 80 52 Q72 44 60 46 Q48 44 40 52 Z" fill={HAIR_D} />
        <circle cx={37} cy={78} r={6} fill="none" stroke={INK} strokeWidth={5.5} />
        <circle cx={37} cy={78} r={6} fill="none" stroke={GOLD} strokeWidth={2.5} />
        <Eyes x1={50} x2={70} y={61} r={5.6} mood={mood} look={-1} lid={SKIN.tan} />
        <Lashes x1={50} x2={70} y={61} mood={mood} />
        <Brows x1={50} x2={70} y={51} mood={mood} base="arch" w={5} width={3} />
        <Cheeks x1={42} x2={78} y={71} />
        <Mouth x={60} y={76} w={6} mood={mood} idle="smirk" color={LIPS} />
        {/* phone = player colour */}
        <g transform="rotate(14 92 60)">
          {form(uid, 'p', <rect x={83} y={44} width={18} height={30} rx={4.5} />, c, undefined, 3.5, -3, -3)}
          <rect x={86.5} y={48} width={11} height={19} rx={2} fill={INK} />
          <path d="M88 52 h7 M88 56 h5" stroke={PAPER} strokeWidth={1.6} strokeLinecap="round" opacity={0.7} />
        </g>
        <ellipse cx={90} cy={78} rx={7} ry={6.5} fill={SKIN.tan} {...S} />
        {/* gossip bubble */}
        <g className="av-part-bubble">
          <path d="M4 6 H40 Q44 6 44 10 V22 Q44 26 40 26 H22 L14 33 L15 26 H8 Q4 26 4 22 V10 Q4 6 8 6 Z" fill={PAPER} {...T} />
          <Shout x={24} y={20.5} size={9.5} fill={INK}>
            {bubble}
          </Shout>
        </g>
        <MoodFx mood={mood} x={106} y={26} />
      </>
    );
  }
};

/* -------------------------------------------------------- LA VILLANA */

const villana: CharacterArt = {
  alt: 'La Villana, a telenovela villain with one dramatic eyebrow',
  anim: 'sway',
  mask: { x: 60, y: 63, s: 0.66 },
  draw: ({ c, mood, uid }) => {
    // her resting face is already one cocked eyebrow
    const browMood: Mood = mood === 'idle' ? 'sus' : mood;
    return (
      <>
        <path d="M28 72 Q20 30 60 22 Q100 30 92 72 Q92 92 80 98 L40 98 Q28 92 28 72 Z" fill={INK} {...S} />
        {form(uid, 'b', <path d="M14 120 Q18 94 60 93 Q102 94 106 120 Z" />, c)}
        <path d="M36 98 L24 72 L50 92 Z M84 98 L96 72 L70 92 Z" fill={c} {...S} />
        <path d="M30 104 Q60 112 90 104" fill="none" stroke={PAPER} strokeWidth={3} strokeLinecap="round" opacity={0.4} />
        {form(uid, 'h', <circle cx={60} cy={64} r={23} />, SKIN.light, '#DDAE82')}
        <path d="M37 60 Q38 36 62 35 Q84 37 84 58 Q76 44 60 46 Q46 48 37 60 Z" fill={INK} />
        <path d="M58 37 Q72 40 77 52" fill="none" stroke={PAPER} strokeWidth={3.2} strokeLinecap="round" />
        <path d="M38 80 v6 M82 80 v6" stroke={INK} strokeWidth={5} strokeLinecap="round" />
        <circle cx={38} cy={88} r={3} fill={GOLD} {...T} />
        <circle cx={82} cy={88} r={3} fill={GOLD} {...T} />
        <Eyes x1={51} x2={69} y={63} r={5.4} mood={mood} look={-1} lid="#B48AC8" />
        <Lashes x1={51} x2={69} y={63} mood={mood} />
        <Brows x1={51} x2={69} y={53} mood={browMood} base="angry" w={5.5} width={3.2} />
        <circle cx={71} cy={74} r={1.5} fill={INK} />
        <Mouth x={60} y={78} w={mood === 'caught' ? 8 : 6} mood={mood} idle="smirk" color={RED} />
        {mood === 'caught' && (
          <g>
            <ellipse cx={34} cy={84} rx={7} ry={9} fill={SKIN.light} {...S} transform="rotate(-20 34 84)" />
            <path d="M28 76 l-4 -4 M33 72 l-1 -6" {...L} />
          </g>
        )}
        {mood === 'win' && (
          <Shout x={96} y={26} size={11} fill={RED} rot={14}>
            JA JA
          </Shout>
        )}
        <MoodFx mood={mood === 'win' ? 'idle' : mood} x={98} y={40} />
      </>
    );
  }
};

/* ------------------------------------------------------------ EL PRIMO */

const HOODIE = '#8C8C99';

const primo: CharacterArt = {
  alt: 'El Primo, a cousin in a backwards cap with a big grin',
  anim: 'bounce',
  mask: { x: 60, y: 64, s: 0.72 },
  draw: ({ c, mood, uid }) => (
    <>
      {form(uid, 'b', <path d="M14 120 Q18 94 60 92 Q102 94 106 120 Z" />, HOODIE, '#6E6E7A')}
      <path d="M40 96 Q60 104 80 96" fill="none" {...T} />
      <path d="M52 100 v12 M68 100 v12" stroke={PAPER} strokeWidth={2.5} strokeLinecap="round" />
      <circle cx={35} cy={66} r={5.5} fill={SKIN.warm} {...S} />
      <circle cx={85} cy={66} r={5.5} fill={SKIN.warm} {...S} />
      {form(uid, 'h', <circle cx={60} cy={66} r={26} />, SKIN.warm, '#A8704A')}
      {/* backwards cap = player colour; brim pokes out behind */}
      <path d="M38 40 Q20 26 12 34 Q14 46 36 50 Z" fill={c} {...S} />
      {form(uid, 'c', <path d="M34 58 Q33 28 60 28 Q87 28 86 58 Q74 52 60 52 Q46 52 34 58 Z" />, c)}
      <path d="M60 28 V52" {...L} opacity={0.4} />
      <path d="M44 34 Q40 42 40 50" fill="none" stroke={PAPER} strokeWidth={3} strokeLinecap="round" opacity={0.4} />
      <circle cx={60} cy={28} r={3} fill={c} {...T} />
      <path d="M52 55 Q52 46 60 46 Q68 46 68 55 Z" fill={INK} />
      <path d="M55 55 q2 -5 5 -1 q3 -4 5 1" fill={INK} stroke={INK} strokeWidth={2} />
      <Eyes x1={50} x2={70} y={65} r={5.6} mood={mood} look={1} lid={SKIN.warm} />
      <Brows x1={50} x2={70} y={56} mood={mood} base="calm" w={6} width={4} />
      <path d="M51 78 h18" stroke={INK} strokeWidth={2} strokeDasharray="1.5 2.5" strokeLinecap="round" opacity={0.45} />
      <Mouth x={60} y={82} w={7.5} mood={mood} idle="smirk" />
      <MoodFx mood={mood} x={98} y={40} />
    </>
  )
};

export const FAMILIA_ART = { abuela, tio, tia, villana, primo } satisfies Record<string, CharacterArt>;

