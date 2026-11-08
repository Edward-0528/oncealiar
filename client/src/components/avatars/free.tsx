import React from 'react';
import {
  Brows,
  Burst,
  CHARCOAL,
  Cheeks,
  Eye,
  Eyes,
  Glint,
  INK,
  L,
  MoodFx,
  Mouth,
  O,
  PAPER,
  RED,
  SKIN,
  Shades,
  Shout,
  Sparkle,
  SweatDrop,
  T,
  YELLOW,
  form,
  type CharacterArt
} from './kit';

/** The 11 free characters ("The Usual Suspects"). Player colour = `c`. */

/* ---------------------------------------------------------- LA CHANCLA */

const SOLE =
  'M60 16 C78 16 87 30 86 48 C85 62 79 70 78 82 C77 98 72 110 60 110 C48 110 43 98 42 82 C41 70 35 62 34 48 C33 30 42 16 60 16 Z';

const chancla: CharacterArt = {
  alt: 'La Chancla, a flying sandal mid-swing with furious eyebrows',
  anim: 'swing',
  mask: { x: 56, y: 75, rot: 28, s: 0.62 },
  draw: ({ c, mood, uid }) => {
    const shout = mood === 'sus' ? 'HMM' : mood === 'caught' ? '¡AY!' : '¡PUM!';
    return (
      <>
        <g className="av-part-burst">
          <Burst x={103} y={17} r={mood === 'win' ? 19 : 16} points={mood === 'sus' ? 8 : 11} fill={mood === 'win' ? YELLOW : mood === 'sus' ? PAPER : RED}>
            <Shout x={103} y={20.5} size={mood === 'win' ? 9.5 : 8.5} fill={mood === 'idle' || mood === 'caught' ? PAPER : RED} rot={12}>
              {shout}
            </Shout>
          </Burst>
        </g>
        <g className="av-part-whoosh">
          <path d="M7 101 L17 83 M19 115 L27 100 M4 78 L10 67" {...O} />
          <path d="M30 46 Q17 62 15 84" {...L} strokeDasharray="0.5 6" strokeWidth={3.5} />
        </g>
        <g className="av-part-sole">
          <g transform="translate(-4 3) rotate(28 60 64)">
            {/* sole thickness = hard offset ink */}
            <path d={SOLE} transform="translate(3.5 5)" fill={INK} stroke={INK} strokeWidth={3.5} strokeLinejoin="round" />
            {form(uid, 's', <path d={SOLE} />, c)}
            <Glint d="M44 40 Q44 26 56 22" w={4} />
            <path d="M50 104 l3 -4 M60 106 v-4 M70 104 l-3 -4" {...L} strokeWidth={2.2} />
            {/* thong strap */}
            <path d="M60 33 L39 64 M60 33 L81 64" stroke={INK} strokeWidth={12} strokeLinecap="round" />
            <path d="M60 33 L39 64 M60 33 L81 64" stroke={RED} strokeWidth={7} strokeLinecap="round" />
            <path d="M62 37 L79 62" stroke="#B3201A" strokeWidth={3} strokeLinecap="round" />
            <path d="M58 37 L45 56" stroke={PAPER} strokeWidth={2} strokeLinecap="round" />
            <circle cx={60} cy={33} r={5.5} fill={INK} />
            <Eyes x1={50} x2={70} y={78} r={7.6} mood={mood} look={1} lid={c} />
            <Brows x1={50} x2={70} y={67} mood={mood} base="angry" w={7.5} width={5} />
            <Mouth x={60} y={95} w={8} mood={mood} idle="grit" />
            {mood === 'win' && <Cheeks x1={42} x2={78} y={88} />}
          </g>
        </g>
        {mood === 'caught' && <SweatDrop x={24} y={36} />}
        {mood === 'win' && <Sparkle x={20} y={30} r={7} />}
      </>
    );
  }
};

/* -------------------------------------------------------- AGENT FEDORA */

const TRENCH = '#C8A46A';
const TRENCH_D = '#A3814B';
const HAT = '#2B2B2B';

const agent: CharacterArt = {
  alt: 'Agent Fedora, a spy in a fedora, sunglasses and a popped trench coat collar',
  anim: 'sneak',
  mask: { x: 60, y: 64, s: 0.74 },
  draw: ({ c, mood, uid }) => (
    <>
      {form(uid, 'b', <path d="M12 120 L20 102 Q30 90 60 90 Q90 90 100 102 L108 120 Z" />, TRENCH, TRENCH_D)}
      <path d="M48 91 L60 113 L72 91 Z" fill={PAPER} {...T} />
      <path d="M56 95 L64 95 L62.5 99.5 L66 114 L60 120 L54 114 L57.5 99.5 Z" fill={c} {...T} />
      <path d="M30 104 v14 M90 104 v14" {...L} />
      <circle cx={33} cy={66} r={6} fill={SKIN.light} stroke={INK} strokeWidth={3.5} />
      <circle cx={87} cy={66} r={6} fill={SKIN.light} stroke={INK} strokeWidth={3.5} />
      {form(uid, 'h', <circle cx={60} cy={64} r={28} />, SKIN.light, '#DDAE82')}
      {/* popped collar */}
      {form(uid, 'l', <path d="M36 98 L44 80 L56 98 Z" />, TRENCH, TRENCH_D)}
      {form(uid, 'r', <path d="M84 98 L76 80 L64 98 Z" />, TRENCH, TRENCH_D)}
      <Shades x1={48} x2={72} y={64} w={21} h={13} mood={mood} lid={SKIN.light} />
      <Mouth x={60} y={82} w={6.5} mood={mood} idle="smirk" />
      <MoodFx mood={mood} x={100} y={62} />
      {/* fedora */}
      {form(uid, 'f', <path d="M33 46 Q32 15 60 14 Q88 15 87 46 Z" />, HAT)}
      <path d="M46 19 Q60 28 74 19" {...L} stroke="#555" />
      <path d="M33.5 35 H86.5 V45 H33.5 Z" fill={c} {...T} />
      {form(uid, 'w', <path d="M10 47 Q60 33 110 47 Q104 57 60 53 Q16 57 10 47 Z" />, HAT)}
      <Glint d="M40 32 Q41 22 50 18" w={3} o={0.5} />
    </>
  )
};

/* ------------------------------------------------------------ PIGEON */

const PIDGE = '#9AA3B5';
const PIDGE_D = '#7A8398';
const BEAK = '#F0A64B';

const pigeon: CharacterArt = {
  alt: 'The Pigeon, a shifty grey informant in a tiny top hat',
  anim: 'peck',
  mask: { x: 69, y: 39, s: 0.5 },
  draw: ({ c, mood, uid }) => (
    <>
      <path d="M50 104 v10 M68 104 v10 M45 114 h10 M63 114 h10" stroke={INK} strokeWidth={7.5} strokeLinecap="round" />
      <path d="M50 104 v10 M68 104 v10 M45 114 h10 M63 114 h10" stroke={BEAK} strokeWidth={3.5} strokeLinecap="round" />
      {form(uid, 't', <path d="M34 80 L8 88 L12 100 L36 96 Z" />, PIDGE_D, '#5F677A')}
      {form(uid, 'b', <ellipse cx={60} cy={84} rx={32} ry={26} />, PIDGE, PIDGE_D)}
      <path d="M40 80 Q58 72 76 86 Q63 104 43 100 Q34 92 40 80 Z" fill={PIDGE_D} {...T} />
      <path d="M48 91 L62 93 M46 85 L60 86" {...L} />
      {/* iridescent neck = player colour */}
      {form(uid, 'n', <path d="M42 72 Q44 52 63 52 Q82 52 84 72 Q63 81 42 72 Z" />, c)}
      <Glint d="M50 64 Q58 58 70 60" w={3} />
      <g className="av-part-head">
        {form(uid, 'h', <circle cx={64} cy={40} r={21} />, PIDGE, PIDGE_D)}
        <Glint d="M50 32 Q53 24 61 22" w={3} />
        {mood === 'caught' || mood === 'win' ? (
          <>
            <path d="M82 35 Q95 36 98 40 L83 42 Z" fill={BEAK} {...T} />
            <path d="M83 45 L97 49 Q90 54 83 51 Z" fill={BEAK} {...T} />
            <path d="M84 42.5 L92 45" stroke={RED} strokeWidth={2.5} strokeLinecap="round" />
          </>
        ) : (
          <path d="M82 37 Q96 39 98 43 Q91 47 82 47 Z" fill={BEAK} {...T} />
        )}
        <Eye x={70} y={37} r={7.5} mood={mood} look={-1} lid={PIDGE} />
        {mood !== 'idle' && <path d={mood === 'sus' ? 'M62 27 L77 24' : mood === 'caught' ? 'M62 26 L76 21' : 'M62 28 Q70 22 78 27'} {...O} />}
        <Cheeks x1={78} x2={78} y={48} r={3.5} />
        <g transform="rotate(-14 58 22)">
          <rect x={43} y={19} width={30} height={5} rx={1.5} fill={INK} />
          <rect x={49} y={4} width={18} height={16} rx={2} fill={CHARCOAL} {...T} />
          <rect x={49} y={13} width={18} height={4.5} fill={RED} />
        </g>
      </g>
      <MoodFx mood={mood} x={28} y={38} side={-1} />
    </>
  )
};

/* -------------------------------------------------------------- DUCK */

const DUCK = '#FFD43B';
const DUCK_D = '#EAAE12';
const DUCK_BEAK = '#F28A2E';
const DUCK_BEAK_D = '#CF6A16';

/** Huge handlebar mustache, the star of the card. */
const STACHE =
  'M60 61 C66 56 77 56 85 60 C92 63 96 59 97 53 C97 49 94 46.5 91.5 48.5 C96 45 104 49 104 56 C104 67 95 75 82 74 C72 73 64 71 60 68 C56 71 48 73 38 74 C25 75 16 67 16 56 C16 49 24 45 28.5 48.5 C26 46.5 23 49 23 53 C24 59 28 63 35 60 C43 56 54 56 60 61 Z';

const duck: CharacterArt = {
  alt: 'Duck Disguise, a rubber duck in a tiny bowler hat and a gigantic handlebar mustache',
  anim: 'bounce',
  mask: { x: 60, y: 47, s: 0.72 },
  draw: ({ c, mood, uid }) => {
    const open = mood === 'caught' || mood === 'win';
    const stache = mood === 'caught' ? 'rotate(-16 30 58) translate(-2 10)' : mood === 'win' ? 'translate(0 -2) scale(1.04) translate(-2.3 -2)' : undefined;
    return (
      <>
        {/* tail flick + body */}
        {form(uid, 't', <path d="M28 92 Q10 86 10 66 Q22 76 38 78 Z" />, DUCK, DUCK_D)}
        {form(uid, 'b', <path d="M20 96 Q20 80 38 78 L82 78 Q100 80 100 96 Q98 116 60 116 Q22 116 20 96 Z" />, DUCK, DUCK_D)}
        <path d="M80 92 Q92 92 94 102 Q86 106 80 100" fill={DUCK_D} {...T} />
        {form(uid, 'h', <circle cx={60} cy={50} r={30} />, DUCK, DUCK_D)}
        <Glint d="M36 40 Q38 28 48 23" w={4} />
        <path d="M48 22 Q42 14 47 10" {...L} strokeWidth={3.2} />
        {/* bill (peeks out under the mustache) */}
        {open ? (
          <>
            <path d="M60 97 Q43 97 43 87 Q48 81 60 83 Q72 81 77 87 Q77 97 60 97 Z" fill={DUCK_BEAK_D} {...T} />
            <path d="M51 89 Q60 93 69 89" stroke={RED} strokeWidth={4} strokeLinecap="round" fill="none" />
          </>
        ) : (
          <path d="M49 86 Q60 92 71 86" fill="none" stroke={DUCK_BEAK_D} strokeWidth={4} strokeLinecap="round" />
        )}
        {form(uid, 'k', <path d="M60 64 C77 64 83 71 82 78 C81 85 72 86 60 84 C48 86 39 85 38 78 C37 71 43 64 60 64 Z" />, DUCK_BEAK, DUCK_BEAK_D, 3, -3, -3.5)}
        {/* the mustache */}
        <g transform={stache}>
          <path d={STACHE} fill={INK} stroke={INK} strokeWidth={2} strokeLinejoin="round" />
          <path d="M40 62 Q48 59 55 61 M80 62 Q72 59 65 61" fill="none" stroke="#555" strokeWidth={2.4} strokeLinecap="round" />
        </g>
        <Eyes x1={47} x2={73} y={45} r={7.6} mood={mood} look={1} lid={DUCK} />
        <Brows x1={47} x2={73} y={32} mood={mood} base="arch" w={6.5} width={4.5} />
        <Cheeks x1={36} x2={84} y={56} r={4} />
        {/* jaunty little bowler = player colour */}
        <g transform={`rotate(${mood === 'caught' ? 24 : 12} 68 22) translate(0 ${mood === 'caught' ? -8 : 0})`}>
          {form(uid, 'c', <path d="M54 23 Q54 6 68 6 Q82 6 82 23 Z" />, c, undefined, 3.2)}
          <path d="M54.5 18 H81.5 V22.5 H54.5 Z" fill={INK} />
          <path d="M46 24 Q68 18 90 24 Q86 30 68 28 Q50 30 46 24 Z" fill={c} stroke={INK} strokeWidth={3.2} strokeLinejoin="round" />
          <Glint d="M59 16 Q60 11 64 9" w={2.5} />
        </g>
        <MoodFx mood={mood} x={102} y={26} />
      </>
    );
  }
};

/* --------------------------------------------------------- PAPARAZZI */

const CAM = '#2E2E33';

const paparazzi: CharacterArt = {
  alt: 'Paparazzi, a camera whose lens is one big nosy eye',
  anim: 'flash',
  mask: { x: 60, y: 66, s: 0.82 },
  draw: ({ c, mood, uid }) => {
    const firing = mood === 'win' || mood === 'caught';
    return (
      <>
        <path d="M18 62 Q4 90 22 114 M102 62 Q116 90 98 114" stroke={INK} strokeWidth={8.5} fill="none" strokeLinecap="round" />
        <path d="M18 62 Q4 90 22 114 M102 62 Q116 90 98 114" stroke={c} strokeWidth={4.5} fill="none" strokeLinecap="round" />
        <g className="av-part-flash">
          {firing ? <Burst x={86} y={20} r={18} points={9} fill={YELLOW} /> : <path d="M80 12 L77 4 M92 10 L97 3 M100 20 L108 17" {...O} />}
        </g>
        {form(uid, 'p', <rect x={34} y={24} width={32} height={18} rx={4} />, CAM)}
        {form(uid, 'f', <rect x={75} y={16} width={23} height={16} rx={3} />, '#E6E6E6', '#B9B9B9')}
        <rect x={79} y={20} width={15} height={8} rx={1.5} fill={firing ? PAPER : YELLOW} {...T} />
        <ellipse cx={24} cy={34} rx={6.5} ry={3.2} fill={RED} {...T} />
        {form(uid, 'b', <rect x={11} y={36} width={98} height={72} rx={13} />, CAM)}
        <Glint d="M20 48 V64" w={3} o={0.35} />
        <path d="M27 48 v48" stroke="#4A4A50" strokeWidth={2.5} strokeLinecap="round" />
        {/* lens ring = player colour, the eye lives inside */}
        {form(uid, 'l', <circle cx={60} cy={67} r={26} />, c)}
        <circle cx={60} cy={67} r={26} fill="none" stroke={INK} strokeWidth={2} strokeDasharray="2 5" transform="rotate(10 60 67)" opacity={0.4} />
        <circle cx={60} cy={67} r={18.5} fill={INK} />
        <Eye x={60} y={67} r={14} mood={mood} look={-1} lid={CAM} arc={PAPER} />
        <Glint d="M44 56 Q47 50 53 47" w={3.5} />
        <Mouth x={60} y={99} w={7} mood={mood} idle="smirk" color={PAPER} />
        {mood === 'caught' && <SweatDrop x={8} y={28} />}
        {mood === 'win' && <Sparkle x={14} y={22} r={7} />}
      </>
    );
  }
};

/* ------------------------------------------------------- CAT BURGLAR */

const CAT = '#2F2F36';
const PINK = '#F4A3B4';

const cat: CharacterArt = {
  alt: 'Cat Burglar, a black cat in a bandit eye mask',
  anim: 'sneak',
  mask: { x: 60, y: 63, s: 0.86 },
  draw: ({ c, mood, uid }) => (
    <>
      <path d="M86 100 Q114 98 108 70 Q105 60 97 64" stroke={INK} strokeWidth={10.5} fill="none" strokeLinecap="round" />
      <path d="M86 100 Q114 98 108 70 Q105 60 97 64" stroke={CAT} strokeWidth={4.5} fill="none" strokeLinecap="round" />
      {form(uid, 'e', <path d="M25 56 L27 11 L58 36 Z" />, CAT)}
      {form(uid, 'f', <path d="M95 56 L93 11 L62 36 Z" />, CAT)}
      <path d="M32 44 L33 24 L47 35 Z M88 44 L87 24 L73 35 Z" fill={PINK} />
      {form(uid, 'h', <ellipse cx={60} cy={70} rx={38} ry={35} />, CAT)}
      <Glint d="M32 54 Q36 42 48 37" w={3.5} o={0.45} />
      {/* bandit mask = player colour */}
      <path d="M22 62 L6 53 L10 68 Z M22 68 L6 76 L15 82 Z" fill={c} {...T} />
      {form(uid, 'm', <path d="M20 58 Q60 44 100 58 L99 76 Q60 64 21 76 Z" />, c)}
      <Eyes x1={44} x2={76} y={64} r={7.2} mood={mood} look={1} lid={c} sclera={YELLOW} pupil="slit" />
      <path d="M55.5 82 h9 l-4.5 5 z" fill={PINK} stroke={INK} strokeWidth={2} strokeLinejoin="round" />
      <path d="M30 86 H14 M30 92 L15 98 M90 86 H106 M90 92 L105 98" stroke={PAPER} strokeWidth={2.2} strokeLinecap="round" />
      {mood === 'idle' ? (
        <path d="M60 87 Q57 93 52 90 M60 87 Q63 93 68 90" fill="none" stroke={PAPER} strokeWidth={2.6} strokeLinecap="round" />
      ) : (
        <Mouth x={60} y={93} w={6} mood={mood} color={PAPER} />
      )}
      <MoodFx mood={mood} x={100} y={28} />
    </>
  )
};

/* -------------------------------------------------------- GNOME KNOWS */

const NOSE = '#F09A8A';
const BEARD_D = '#E4D7B8';

const gnome: CharacterArt = {
  alt: 'Gnome Knows, a garden gnome with a big white beard and a knowing smirk',
  anim: 'wiggle',
  mask: { x: 60, y: 67, s: 0.62 },
  draw: ({ c, mood, uid }) => {
    return (
      <>
        {form(uid, 'b', <path d="M29 66 Q29 113 60 117 Q91 113 91 66 Q81 80 60 80 Q39 80 29 66 Z" />, PAPER, BEARD_D)}
        <path d="M42 92 q3 6 0 12 M78 92 q-3 6 0 12 M52 104 q2 4 0 8 M68 104 q-2 4 0 8" {...L} />
        {form(uid, 'f', <ellipse cx={60} cy={68} rx={22} ry={14} />, SKIN.light, '#DDAE82', 3.5, -3, -4)}
        <Eyes x1={50} x2={70} y={66} r={5} mood={mood} look={-1} lid={SKIN.light} />
        <Cheeks x1={43} x2={77} y={74} r={4} />
        {form(uid, 'n', <circle cx={60} cy={75} r={7} />, NOSE, '#D97A6A', 2.5, -2, -2.5)}
        <circle cx={57.5} cy={72.5} r={1.6} fill={PAPER} />
        <path d="M60 82 q-6 -4 -14 0 q-4 2 -8 0 q4 8 14 6 q6 -1 8 -6 q2 5 8 6 q10 2 14 -6 q-4 2 -8 0 q-8 -4 -14 0 z" fill={PAPER} {...T} />
        <Mouth x={60} y={94} w={6} mood={mood} idle="smirk" />
        {/* pointy hat = player colour */}
        {form(uid, 'h', <path d="M28 59 Q40 35 52 17 Q60 5 74 5 Q88 7 90 19 Q80 12 71 17 Q81 37 92 59 Z" />, c)}
        <Glint d="M53 22 Q46 34 41 46" w={3.5} />
        {form(uid, 'r', <path d="M25 57 Q60 45 95 57 Q96 66 90 66 Q60 56 30 66 Q24 66 25 57 Z" />, c, undefined, 3.5, -3, -3)}
        <g>
          <Brows x1={50} x2={70} y={60} mood={mood} base="calm" w={5.5} width={7} color={INK} />
          <Brows x1={50} x2={70} y={60} mood={mood} base="calm" w={5.5} width={3.5} color={PAPER} />
        </g>
        <MoodFx mood={mood} x={102} y={40} />
      </>
    );
  }
};

/* ------------------------------------------------------------ GHOSTED */

const GHOST_D = '#E2DACA';

const ghost: CharacterArt = {
  alt: 'Ghosted, a little ghost in a tiny fedora',
  anim: 'float',
  mask: { x: 60, y: 64, s: 0.74 },
  draw: ({ c, mood, uid }) => (
    <>
      <ellipse cx={60} cy={116} rx={22} ry={3} fill={INK} opacity={0.15} className="av-part-shadow" />
      {form(uid, 'l', <path d="M29 76 Q14 75 11 61 Q21 66 29 66 Z" />, PAPER, GHOST_D)}
      {form(uid, 'r', <path d="M91 72 Q104 70 109 55 Q98 60 91 62 Z" />, PAPER, GHOST_D)}
      {form(uid, 'b', <path d="M27 108 V62 a33 33 0 0 1 66 0 V108 l-11 -8 -11 8 -11 -8 -11 8 -11 -8 z" />, PAPER, GHOST_D)}
      <Glint d="M36 54 Q38 42 48 35" w={4} o={1} />
      <path d="M36 54 Q38 42 48 35" fill="none" stroke="#fff" strokeWidth={1} />
      <Eyes x1={48} x2={72} y={64} r={7.2} mood={mood} look={1} lid={PAPER} />
      <Brows x1={48} x2={72} y={52} mood={mood} w={5} />
      <Cheeks x1={39} x2={81} y={76} />
      <Mouth x={60} y={80} w={5.5} mood={mood} idle="tiny" />
      <MoodFx mood={mood} x={100} y={40} />
      <g transform="rotate(-9 60 28)">
        {form(uid, 'f', <path d="M44 32 Q43 12 60 12 Q77 12 76 32 Z" />, CHARCOAL)}
        <path d="M44.5 24 H75.5 V31 H44.5 Z" fill={c} {...T} />
        {form(uid, 'w', <path d="M30 33 Q60 25 90 33 Q86 39 60 37 Q34 39 30 33 Z" />, CHARCOAL, undefined, 3.5, -2, -2)}
      </g>
    </>
  )
};

/* --------------------------------------------------- UNDERCOVER PIÑA */

const PINA = '#F6B73C';
const PINA_D = '#D9912A';
const LEAF = '#4CAF50';
const LEAF_D = '#2E8B3A';

const pina: CharacterArt = {
  alt: 'Undercover Piña, a pineapple in sunglasses',
  anim: 'sway',
  mask: { x: 60, y: 72, s: 0.74 },
  draw: ({ c, mood, uid }) => (
    <>
      {form(uid, 'l', <path d="M60 50 Q38 32 36 10 Q51 20 57 34 Q55 14 61 0 Q68 16 64 34 Q72 20 87 12 Q82 34 60 50 Z" />, LEAF, LEAF_D)}
      <path d="M60 46 V14 M58 42 L44 22 M62 42 L78 22" {...L} stroke="#1F6B2A" strokeWidth={2} />
      <clipPath id={`${uid}pc`}>
        <ellipse cx={60} cy={80} rx={32} ry={35} />
      </clipPath>
      {form(uid, 'b', <ellipse cx={60} cy={80} rx={32} ry={35} />, PINA, PINA_D, 0)}
      <g clipPath={`url(#${uid}pc)`} stroke="#B9781A" strokeWidth={2.2} fill="none">
        <path d="M20 54 L100 134 M20 34 L100 114 M20 74 L100 154 M20 14 L100 94 M100 54 L20 134 M100 34 L20 114 M100 74 L20 154 M100 14 L20 94" />
      </g>
      <ellipse cx={60} cy={80} rx={32} ry={35} {...O} />
      <Glint d="M36 66 Q38 54 46 48" w={4} />
      <Cheeks x1={38} x2={82} y={88} />
      <Shades x1={48} x2={72} y={72} w={21} h={13} mood={mood} frame={c} lid={PINA} />
      <Mouth x={60} y={94} w={7} mood={mood} />
      <MoodFx mood={mood} x={100} y={50} />
    </>
  )
};

/* ----------------------------------------------------------- DON NOPAL */

const NOPAL = '#5FAE5A';
const NOPAL_D = '#3E8A3C';

function Flower({ x, y, r, c }: { x: number; y: number; r: number; c: string }) {
  return (
    <g>
      {[0, 72, 144, 216, 288].map((a) => {
        const rad = ((a - 90) * Math.PI) / 180;
        return <circle key={a} cx={Math.round((x + Math.cos(rad) * r * 0.75) * 10) / 10} cy={Math.round((y + Math.sin(rad) * r * 0.75) * 10) / 10} r={r * 0.62} fill={c} {...T} />;
      })}
      <circle cx={x} cy={y} r={r * 0.42} fill={YELLOW} {...T} />
    </g>
  );
}

const SPINES: [number, number][] = [[42, 50], [80, 54], [38, 98], [80, 100], [60, 110], [22, 72], [98, 66]];

const nopal: CharacterArt = {
  alt: 'Don Nopal, a prickly pear cactus with a grand mustache',
  anim: 'sway',
  mask: { x: 60, y: 64, s: 0.74 },
  draw: ({ c, mood, uid }) => (
    <>
      {form(uid, 'l', <ellipse cx={24} cy={68} rx={12} ry={18} transform="rotate(-32 24 68)" />, NOPAL, NOPAL_D)}
      {form(uid, 'r', <ellipse cx={96} cy={64} rx={12} ry={18} transform="rotate(32 96 64)" />, NOPAL, NOPAL_D)}
      <circle cx={16} cy={51} r={5.5} fill={c} {...T} />
      {form(uid, 'b', <ellipse cx={60} cy={78} rx={33} ry={39} />, NOPAL, NOPAL_D)}
      <Glint d="M36 62 Q35 52 42 44" w={4} />
      {SPINES.map(([x, y]) => (
        <path key={x * 1000 + y} d={`M${x} ${y} l-3 -4 M${x} ${y} l3.5 -3.5`} stroke={INK} strokeWidth={1.8} strokeLinecap="round" />
      ))}
      <Flower x={60} y={37} r={10} c={c} />
      <Eyes x1={48} x2={72} y={64} r={6.2} mood={mood} look={1} lid={NOPAL} />
      <Brows x1={48} x2={72} y={53} mood={mood} base="calm" w={6} width={4.5} />
      <Cheeks x1={37} x2={83} y={76} />
      <Mouth x={60} y={93} w={5.5} mood={mood} idle="none" />
      <path
        d="M60 78 Q52 71 43 75 Q34 82 26 74 Q28 89 43 87 Q54 86 60 81 Q66 86 77 87 Q92 89 94 74 Q86 82 77 75 Q68 71 60 78 Z"
        fill={INK}
        transform={mood === 'win' ? 'rotate(-5 60 79)' : undefined}
      />
      <MoodFx mood={mood} x={102} y={34} />
    </>
  )
};

/* ----------------------------------------------------- TOTALLY A COW */

const DOG = '#C98B52';
const DOG_D = '#A86C38';
const EAR = '#8A5427';
const COW_D = '#E3DCCB';
const HORN = '#F3E6C4';
const UDDER = '#F5A9B8';

const totallyCow: CharacterArt = {
  alt: 'Totally a Cow, a dog in a cow-print onesie with little horns and its tongue out',
  anim: 'bounce',
  mask: { x: 60, y: 60, s: 0.7 },
  draw: ({ c, mood, uid }) => {
    const tongue = mood === 'idle' || mood === 'win';
    return (
      <>
        {/* onesie body + tasteful udder */}
        {form(uid, 'b', <path d="M22 120 Q22 94 60 92 Q98 94 98 120 Z" />, PAPER, COW_D)}
        <path d="M28 106 q6 -6 12 0 q2 8 -6 9 q-8 -1 -6 -9 Z M80 102 q8 -2 10 6 q-4 6 -10 2 Z" fill={INK} />
        {/* horns + cow ears on the hood */}
        {form(uid, 'x', <path d="M38 30 Q30 16 36 6 Q42 18 48 26 Z" />, HORN, '#D9C79A', 3)}
        {form(uid, 'y', <path d="M82 30 Q90 16 84 6 Q78 18 72 26 Z" />, HORN, '#D9C79A', 3)}
        {form(uid, 'p', <ellipse cx={18} cy={44} rx={12} ry={6} transform="rotate(-20 18 44)" />, PAPER, COW_D, 3)}
        {form(uid, 'q', <ellipse cx={102} cy={44} rx={12} ry={6} transform="rotate(20 102 44)" />, PAPER, COW_D, 3)}
        <ellipse cx={16} cy={45} rx={6} ry={2.5} transform="rotate(-20 16 45)" fill={UDDER} />
        <ellipse cx={104} cy={45} rx={6} ry={2.5} transform="rotate(20 104 45)" fill={UDDER} />
        {/* hood */}
        {form(uid, 'h', <ellipse cx={60} cy={60} rx={40} ry={38} />, PAPER, COW_D)}
        <path d="M30 34 q8 -10 18 -4 q4 8 -6 12 q-10 2 -12 -8 Z M78 26 q10 -2 12 8 q-2 6 -10 4 q-6 -4 -2 -12 Z M88 70 q8 2 8 10 q-6 6 -10 -2 Z" fill={INK} />
        <Glint d="M28 48 Q30 36 38 30" w={3.5} />
        {/* the dog's face peeking out */}
        {form(uid, 'f', <ellipse cx={60} cy={66} rx={26} ry={24} />, DOG, DOG_D)}
        {/* floppy dog ears escaping the hood */}
        {form(uid, 'e', <path d="M36 54 Q22 60 24 84 Q28 92 36 86 Q40 70 42 60 Z" />, EAR, '#6B3E19')}
        {form(uid, 'g', <path d="M84 54 Q98 60 96 84 Q92 92 84 86 Q80 70 78 60 Z" />, EAR, '#6B3E19')}
        <ellipse cx={60} cy={77} rx={14} ry={10} fill="#E7B98A" {...T} />
        <Eyes x1={49} x2={71} y={60} r={6.4} mood={mood} look={1} lid={DOG} />
        <Brows x1={49} x2={71} y={50} mood={mood} w={5} />
        <path d="M54 70 Q60 66 66 70 Q66 75 60 76 Q54 75 54 70 Z" fill={INK} />
        <circle cx={57} cy={70} r={1.4} fill={PAPER} />
        {tongue ? (
          <g>
            <path d="M54 80 Q60 84 66 80" {...L} />
            <path d="M58 81 Q57 95 64 96 Q71 95 69 81 Z" fill={UDDER} {...T} />
            <path d="M63.5 84 V91" stroke="#D9778A" strokeWidth={2} strokeLinecap="round" />
          </g>
        ) : (
          <Mouth x={60} y={82} w={5} mood={mood} />
        )}
        {/* collar + cowbell = player colour */}
        <path d="M34 94 Q60 102 86 94" stroke={INK} strokeWidth={9} fill="none" strokeLinecap="round" />
        <path d="M34 94 Q60 102 86 94" stroke={c} strokeWidth={5} fill="none" strokeLinecap="round" />
        {form(uid, 'k', <path d="M51 98 L69 98 L73 116 L47 116 Z" />, c, undefined, 3)}
        <path d="M51 104 H69" stroke={INK} strokeWidth={2} opacity={0.35} />
        <circle cx={60} cy={117} r={3} fill={INK} />
        {mood === 'win' && (
          <Shout x={100} y={18} size={11} fill={RED} rot={10}>
            MOO!
          </Shout>
        )}
        <MoodFx mood={mood === 'win' ? 'idle' : mood} x={104} y={24} />
      </>
    );
  }
};

/* --------------------------------------------------- AGENT BUBBLES */

const FISH = '#FF8A2A';
const FISH_D = '#DE6513';
const GLASS = '#EAF6FF';

const goldfish: CharacterArt = {
  alt: 'Agent Bubbles, a goldfish in a tiny trench coat and fedora inside its bowl',
  anim: 'bob',
  mask: { x: 74, y: 70, s: 0.42 },
  draw: ({ c, mood, uid }) => (
    <>
      <path d="M36 110 Q60 118 84 110 L80 116 Q60 121 40 116 Z" fill={CHARCOAL} {...T} />
      <path d="M30 36 Q10 54 13 78 Q18 111 60 113 Q102 111 107 78 Q110 54 90 36 Z" fill={GLASS} />
      {/* water = player colour */}
      <path d="M17 52 Q12 62 13 78 Q18 111 60 113 Q102 111 107 78 Q108 62 103 52 Q82 58 60 54 Q38 50 17 52 Z" fill={c} opacity={0.55} />
      <path d="M17 52 Q38 50 60 54 Q82 58 103 52" {...L} strokeWidth={2} opacity={0.5} />
      <path d="M24 100 Q30 94 36 100 Q42 94 48 100 Q54 94 60 100 Q66 94 72 100 Q78 94 84 100 Q90 94 96 100 Q90 110 60 112 Q30 110 24 100 Z" fill="#B9A27E" {...T} strokeWidth={2} />
      {/* the fish */}
      {form(uid, 't', <path d="M42 76 L22 62 Q28 76 22 92 Z" />, FISH, FISH_D, 3)}
      {form(uid, 'b', <ellipse cx={62} cy={76} rx={23} ry={17} />, FISH, FISH_D, 3)}
      {/* tiny trench coat */}
      {form(uid, 'c', <path d="M44 66 Q56 60 66 64 L70 92 Q56 96 42 88 Z" />, TRENCH, TRENCH_D, 2.8)}
      <path d="M56 62 L60 76 L66 64 M44 80 Q56 84 69 82" {...L} strokeWidth={2} />
      <circle cx={63} cy={86} r={1.4} fill={INK} />
      <Eye x={75} y={72} r={6} mood={mood} look={1} lid={FISH} />
      <Mouth x={82} y={83} w={3.5} mood={mood} idle="tiny" />
      <Cheeks x1={74} x2={74} y={82} r={3} />
      {/* tiny fedora */}
      <g transform="rotate(-10 72 58)">
        {form(uid, 'f', <path d="M63 59 Q63 48 72 48 Q81 48 81 59 Z" />, CHARCOAL, undefined, 2.8)}
        <path d="M63.5 55 H80.5 V58.5 H63.5 Z" fill={RED} />
        <path d="M56 60 Q72 55 88 60 Q84 63 72 62 Q60 63 56 60 Z" fill={CHARCOAL} stroke={INK} strokeWidth={2.8} strokeLinejoin="round" />
      </g>
      <g fill={GLASS} stroke={INK} strokeWidth={2}>
        <circle cx={90} cy={60} r={3} />
        <circle cx={96} cy={48} r={2.2} />
        <circle cx={92} cy={22} r={4} />
      </g>
      {/* glass */}
      <path d="M30 36 Q10 54 13 78 Q18 111 60 113 Q102 111 107 78 Q110 54 90 36" {...O} />
      <ellipse cx={60} cy={35} rx={32} ry={6} fill="none" stroke={INK} strokeWidth={4} />
      <ellipse cx={60} cy={35} rx={32} ry={6} fill="none" stroke={GLASS} strokeWidth={1.5} />
      <Glint d="M22 64 Q22 52 30 44" w={4} />
      <Glint d="M22 74 v4" w={4} />
      <MoodFx mood={mood} x={20} y={22} side={-1} />
    </>
  )
};

export const FREE_ART = { chancla, agent, pigeon, duck, paparazzi, cat, gnome, ghost, pina, nopal, cow: totallyCow, goldfish } satisfies Record<string, CharacterArt>;
