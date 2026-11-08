import React from 'react';
import {
  Brows,
  CHARCOAL,
  Cheeks,
  Eye,
  Eyes,
  GOLD,
  Glint,
  INK,
  L,
  MoodFx,
  Mouth,
  O,
  PAPER,
  RED,
  Shades,
  Shout,
  T,
  YELLOW,
  form,
  type CharacterArt
} from './kit';

/** Premium pack: Masters of Disguise. Animals in hilariously bad disguises. Player colour = `c`. */

const STEEL = '#CFD3D8';
const STEEL_D = '#A4AAB2';
const TRENCH = '#C8A46A';
const TRENCH_D = '#A3814B';
const ORANGE = '#F59A2E';

/* ------------------------------------------------------- LE WAITER */

const PEN = '#2B2D36';

const penguin: CharacterArt = {
  alt: 'Le Waiter, a penguin in a fake curly mustache and bow tie carrying a silver tray',
  anim: 'bob',
  mask: { x: 60, y: 45, s: 0.66 },
  draw: ({ c, mood, uid }) => (
    <>
      <path d="M44 112 h12 M64 112 h12" stroke={INK} strokeWidth={9} strokeLinecap="round" />
      <path d="M44 112 h12 M64 112 h12" stroke={ORANGE} strokeWidth={5} strokeLinecap="round" />
      {/* towel arm */}
      {form(uid, 'a', <path d="M30 62 Q12 78 16 98 Q26 92 32 82 Z" />, PEN)}
      {/* tray arm */}
      {form(uid, 'w', <path d="M88 64 Q104 54 106 40 Q96 42 86 54 Z" />, PEN)}
      {form(uid, 'b', <path d="M60 10 C86 10 96 36 96 66 C96 96 86 113 60 113 C34 113 24 96 24 66 C24 36 34 10 60 10 Z" />, PEN)}
      {form(uid, 'f', <path d="M60 32 C70 24 84 28 84 43 C84 52 79 56 81 66 C85 86 79 107 60 107 C41 107 35 86 39 66 C41 56 36 52 36 43 C36 28 50 24 60 32 Z" />, PAPER, '#E2DCCD')}
      <Glint d="M32 40 Q35 24 46 17" w={3.5} o={0.4} />
      <path d="M14 82 L30 78 L32 96 L18 100 Z" fill={PAPER} {...T} />
      <path d="M18 86 L30 83" {...L} strokeWidth={1.8} stroke={RED} />
      <Eyes x1={49} x2={71} y={44} r={6.6} mood={mood} look={1} lid={PAPER} />
      <Brows x1={49} x2={71} y={34} mood={mood} base="arch" w={5.5} width={3.5} />
      <path d="M53 54 L67 54 L60 62 Z" fill={ORANGE} {...T} />
      {/* the fake waiter mustache */}
      <path
        d="M60 63 Q52 58 43 63 Q37 67 33 61 Q32 70 41 70 Q52 70 60 66 Q68 70 79 70 Q88 70 87 61 Q83 67 77 63 Q68 58 60 63 Z"
        fill={INK}
        transform={mood === 'caught' ? 'rotate(14 60 64) translate(0 4)' : undefined}
      />
      <Mouth x={60} y={76} w={5} mood={mood} idle="none" />
      {/* bow tie = player colour */}
      {form(uid, 't', <path d="M60 86 L46 79 L46 93 Z M60 86 L74 79 L74 93 Z" />, c, undefined, 3)}
      <circle cx={60} cy={86} r={3.6} fill={c} {...T} />
      <circle cx={60} cy={98} r={2} fill={INK} />
      {/* silver tray + cloche */}
      {form(uid, 'c', <path d="M90 33 Q90 17 104 17 Q118 17 118 33 Z" />, STEEL, STEEL_D, 3)}
      <circle cx={104} cy={15} r={2.6} fill={STEEL} {...T} />
      <ellipse cx={104} cy={34} rx={17} ry={4} fill={STEEL} {...T} />
      <Glint d="M95 28 Q96 23 100 21" w={2.5} />
      <MoodFx mood={mood} x={18} y={30} side={-1} />
    </>
  )
};

/* ------------------------------------------------------ STAFF ONLY */

const RACC = '#9C9AA6';
const RACC_D = '#7A7885';

const raccoon: CharacterArt = {
  alt: 'Staff Only, a raccoon in a hi-vis vest and a STAFF badge',
  anim: 'sneak',
  mask: { x: 60, y: 52, s: 0.82 },
  draw: ({ c, mood, uid }) => (
    <>
      {form(uid, 'b', <path d="M14 120 Q16 90 60 87 Q104 90 106 120 Z" />, RACC, RACC_D)}
      {/* hi-vis vest = player colour */}
      {form(uid, 'v', <path d="M28 120 L30 95 Q42 89 51 90 L60 110 L69 90 Q78 89 90 95 L92 120 Z" />, c)}
      <path d="M30 104 H52 M68 104 H90 M29 114 H91" stroke={INK} strokeWidth={7} />
      <path d="M30 104 H52 M68 104 H90 M29 114 H91" stroke={PAPER} strokeWidth={3.5} />
      <path d="M52 92 L56 100 M68 92 L64 100" {...L} strokeWidth={2} />
      <g transform="rotate(-6 46 98)">
        <rect x={36} y={92} width={22} height={11} rx={1.5} fill={PAPER} {...T} />
        <Shout x={47} y={100.6} size={6.6} fill={RED}>
          STAFF
        </Shout>
      </g>
      {/* ears + head with cheek fluff */}
      {form(uid, 'e', <circle cx={33} cy={27} r={11} />, RACC, RACC_D)}
      {form(uid, 'r', <circle cx={87} cy={27} r={11} />, RACC, RACC_D)}
      <circle cx={33} cy={27} r={5} fill={CHARCOAL} />
      <circle cx={87} cy={27} r={5} fill={CHARCOAL} />
      {form(uid, 'h', <path d="M26 50 Q26 20 60 20 Q94 20 94 50 Q106 58 97 66 Q92 84 60 84 Q28 84 23 66 Q14 58 26 50 Z" />, RACC, RACC_D)}
      <Glint d="M32 40 Q36 28 46 24" w={3.5} />
      <path d="M46 36 Q52 30 60 34 Q68 30 74 36 Q66 40 60 38 Q54 40 46 36 Z" fill={PAPER} />
      {/* the natural bandit mask (the real disguise) */}
      <path d="M26 50 Q42 40 60 51 Q78 40 94 50 Q93 66 77 64 Q67 62 60 67 Q53 62 43 64 Q27 66 26 50 Z" fill={CHARCOAL} {...T} />
      <Eyes x1={45} x2={75} y={54} r={6.8} mood={mood} look={-1} lid={CHARCOAL} />
      {form(uid, 'm', <ellipse cx={60} cy={72} rx={15} ry={10} />, PAPER, '#DDD8CC', 3, -3, -3)}
      <path d="M54 66 Q60 63 66 66 Q65 71 60 72 Q55 71 54 66 Z" fill={INK} />
      <Mouth x={60} y={77} w={5} mood={mood} idle="smirk" />
      {/* clipboard */}
      <g transform="rotate(12 100 102)">
        {form(uid, 'k', <rect x={88} y={88} width={24} height={30} rx={2.5} />, '#B98A52', '#94683A', 3, -3, -3)}
        <rect x={92} y={94} width={16} height={20} fill={PAPER} {...T} strokeWidth={1.8} />
        <path d="M95 99 h10 M95 104 h10 M95 109 h6" stroke={INK} strokeWidth={1.6} strokeLinecap="round" />
        <rect x={95} y={86} width={10} height={5} rx={1.5} fill={STEEL} {...T} strokeWidth={1.8} />
      </g>
      <MoodFx mood={mood} x={104} y={22} />
    </>
  )
};

/* ----------------------------------------------------- THE TOURIST */

const BEAR = '#A8693E';
const BEAR_D = '#85502C';
const SHIRT = '#2FB3A3';

const bear: CharacterArt = {
  alt: 'The Tourist, a bear in a bucket hat and flowery shirt with a camera round its neck',
  anim: 'bounce',
  mask: { x: 60, y: 60, s: 0.76 },
  draw: ({ c, mood, uid }) => (
    <>
      {form(uid, 's', <path d="M12 120 Q16 92 60 89 Q104 92 108 120 Z" />, SHIRT, '#1F8C7F')}
      <g fill={YELLOW} stroke={INK} strokeWidth={1.8}>
        <circle cx={26} cy={108} r={4} />
        <circle cx={92} cy={104} r={4} />
        <circle cx={84} cy={118} r={3.5} />
      </g>
      <g fill={RED}>
        <circle cx={26} cy={108} r={1.5} />
        <circle cx={92} cy={104} r={1.5} />
      </g>
      <path d="M44 90 L54 102 L60 92 L66 102 L76 90" fill={PAPER} {...T} />
      {form(uid, 'e', <circle cx={30} cy={40} r={11} />, BEAR, BEAR_D)}
      {form(uid, 'r', <circle cx={90} cy={40} r={11} />, BEAR, BEAR_D)}
      <circle cx={30} cy={40} r={5} fill="#D9A27A" />
      <circle cx={90} cy={40} r={5} fill="#D9A27A" />
      {form(uid, 'h', <ellipse cx={60} cy={62} rx={32} ry={30} />, BEAR, BEAR_D)}
      {form(uid, 'm', <ellipse cx={60} cy={74} rx={15} ry={11} />, '#E2B48A', '#C9966A', 3, -3, -3)}
      <path d="M54 68 Q60 64 66 68 Q65 73 60 74 Q55 73 54 68 Z" fill={INK} />
      <circle cx={57.5} cy={67.5} r={1.3} fill={PAPER} />
      <Eyes x1={47} x2={73} y={56} r={6} mood={mood} look={1} lid={BEAR} />
      <Mouth x={60} y={80} w={5.5} mood={mood} idle="smile" />
      <Cheeks x1={38} x2={82} y={68} />
      {/* bucket hat = player colour */}
      {form(uid, 'c', <path d="M34 40 Q35 14 60 14 Q85 14 86 40 Z" />, c)}
      <Glint d="M42 32 Q43 22 52 19" w={3} />
      {form(uid, 'b', <path d="M20 46 Q60 32 100 46 L95 55 Q60 44 25 55 Z" />, c, undefined, 3.5, -2.5, -3)}
      <path d="M36 36 Q60 30 84 36" {...L} strokeWidth={2} strokeDasharray="2 3" />
      {/* camera on a strap */}
      <path d="M40 90 Q46 100 48 104 M80 90 Q74 100 72 104" fill="none" stroke={INK} strokeWidth={3} />
      {form(uid, 'k', <rect x={44} y={100} width={32} height={20} rx={4} />, CHARCOAL, undefined, 3, -3, -3)}
      <circle cx={60} cy={110} r={7} fill={STEEL} {...T} />
      <circle cx={60} cy={110} r={3.5} fill={INK} />
      <rect x={68} y={102} width={5} height={3} rx={1} fill={YELLOW} />
      <MoodFx mood={mood} x={104} y={24} />
    </>
  )
};

/* ----------------------------------------------------- JUST A LAMP */

const FLAMINGO = '#FF8FB1';
const FLAMINGO_D = '#E0668F';

const flamingo: CharacterArt = {
  alt: 'Just a Lamp, a flamingo hiding behind a lampshade with its long neck, head and legs sticking out',
  anim: 'sway',
  mask: { x: 90, y: 24, s: 0.46 },
  draw: ({ c, mood, uid }) => (
    <>
      {/* long pink legs under the shade (one knee bent) */}
      <path d="M44 80 V112 M60 80 L66 96 L58 104 M38 113 H50" fill="none" stroke={INK} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M44 80 V112 M60 80 L66 96 L58 104 M38 113 H50" fill="none" stroke={FLAMINGO} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
      {/* tail feathers poking out the back */}
      {form(uid, 't', <path d="M18 62 Q2 60 2 72 Q8 70 12 74 Q8 78 14 82 L22 74 Z" />, FLAMINGO, FLAMINGO_D, 3)}
      {/* neck curls out from behind the shade */}
      <path d="M66 52 Q100 56 98 38 Q96 30 90 28" fill="none" stroke={INK} strokeWidth={13} strokeLinecap="round" />
      <path d="M66 52 Q100 56 98 38 Q96 30 90 28" fill="none" stroke={FLAMINGO} strokeWidth={7.5} strokeLinecap="round" />
      {form(uid, 'h', <circle cx={88} cy={22} r={15} />, FLAMINGO, FLAMINGO_D)}
      <path d="M100 16 Q114 14 118 24 Q118 34 112 38 Q110 28 100 27 Z" fill={PAPER} {...T} />
      <path d="M112 38 Q118 34 118 26 Q119 34 115 40 Z" fill={INK} stroke={INK} strokeWidth={2} strokeLinejoin="round" />
      <Eye x={90} y={20} r={6.5} mood={mood} look={-1} lid={FLAMINGO} />
      {mood !== 'idle' && <path d={mood === 'sus' ? 'M83 11 L97 10' : mood === 'caught' ? 'M83 9 L96 5' : 'M83 11 Q90 6 97 10'} {...O} strokeWidth={3} />}
      <Cheeks x1={80} x2={80} y={30} r={3.5} />
      <Glint d="M77 14 Q79 9 84 8" w={2.5} />
      {/* lampshade = player colour */}
      {form(uid, 's', <path d="M28 34 L74 34 L92 80 L10 80 Z" />, c)}
      <path d="M38 34 L26 80 M51 34 V80 M64 34 L76 80" {...L} strokeWidth={1.8} opacity={0.3} />
      <Glint d="M32 42 L24 70" w={3.5} o={0.6} />
      <path d="M10 80 H92" stroke={GOLD} strokeWidth={4.5} />
      <path d="M10 80 H92" stroke={INK} strokeWidth={1.5} />
      <g stroke={INK} strokeWidth={2} fill={GOLD}>
        <circle cx={18} cy={85} r={2.4} />
        <circle cx={32} cy={85} r={2.4} />
        <circle cx={72} cy={85} r={2.4} />
        <circle cx={86} cy={85} r={2.4} />
      </g>
      <path d="M80 80 V94" stroke={INK} strokeWidth={1.8} strokeDasharray="1.5 2" />
      <circle cx={80} cy={96} r={2.4} fill={GOLD} {...T} strokeWidth={1.6} />
      {mood === 'win' && (
        <Shout x={30} y={22} size={10} fill={RED} rot={-10}>
          CLICK
        </Shout>
      )}
      <MoodFx mood={mood === 'win' ? 'idle' : mood} x={20} y={20} side={-1} />
    </>
  )
};

/* --------------------------------------------------- TALL STRANGER */

const GIR = '#F2C14E';
const GIR_D = '#D9A030';
const SPOT = '#B86A2C';

const giraffe: CharacterArt = {
  alt: 'Tall Stranger, a giraffe in a long trench coat and fedora with its horns poking through',
  anim: 'sway',
  mask: { x: 60, y: 36, s: 0.66 },
  draw: ({ c, mood, uid }) => (
    <>
      {/* the long coat */}
      {form(uid, 'c', <path d="M42 60 L78 60 L96 120 L24 120 Z" />, TRENCH, TRENCH_D)}
      <path d="M60 72 V120 M36 104 H84" {...L} />
      <circle cx={54} cy={84} r={2} fill={INK} />
      <circle cx={54} cy={94} r={2} fill={INK} />
      <rect x={56} y={100} width={8} height={8} rx={1.5} fill={GOLD} {...T} strokeWidth={2} />
      {/* long neck in the popped collar */}
      {form(uid, 'n', <rect x={50} y={44} width={20} height={30} />, GIR, GIR_D, 3)}
      <path d="M54 58 q5 -4 8 1 q-3 5 -8 -1 Z M62 66 q4 -2 5 2 q-3 3 -5 -2 Z" fill={SPOT} />
      {form(uid, 'l', <path d="M38 80 L42 54 L58 76 Z" />, TRENCH, TRENCH_D, 3)}
      {form(uid, 'r', <path d="M82 80 L78 54 L62 76 Z" />, TRENCH, TRENCH_D, 3)}
      {/* head */}
      {form(uid, 'e', <ellipse cx={33} cy={32} rx={10} ry={5} transform="rotate(-20 33 32)" />, GIR, GIR_D, 3)}
      {form(uid, 'f', <ellipse cx={87} cy={32} rx={10} ry={5} transform="rotate(20 87 32)" />, GIR, GIR_D, 3)}
      {form(uid, 'h', <ellipse cx={60} cy={34} rx={22} ry={19} />, GIR, GIR_D)}
      <path d="M41 38 q4 -4 8 0 q-2 5 -8 0 Z M74 22 q5 -2 6 3 q-4 3 -6 -3 Z M76 42 q3 -2 4 2 q-3 2 -4 -2 Z" fill={SPOT} />
      {form(uid, 'm', <ellipse cx={60} cy={48} rx={15} ry={10} />, '#F7DDA0', '#E2BE78', 3, -3, -3)}
      <path d="M54.5 45 v2.5 M65.5 45 v2.5" stroke={INK} strokeWidth={2.8} strokeLinecap="round" />
      <Shades x1={51} x2={69} y={32} w={16} h={10} mood={mood} lid={GIR} />
      <Mouth x={60} y={54} w={4.5} mood={mood} idle="smirk" />
      {/* fedora (player colour) with horns poking through */}
      <path d="M52 12 V3 M68 12 V3" stroke={INK} strokeWidth={6.5} strokeLinecap="round" />
      <path d="M52 12 V3 M68 12 V3" stroke={GIR} strokeWidth={3} strokeLinecap="round" />
      <circle cx={52} cy={3} r={3.4} fill={SPOT} {...T} strokeWidth={2} />
      <circle cx={68} cy={3} r={3.4} fill={SPOT} {...T} strokeWidth={2} />
      {form(uid, 'a', <path d="M45 19 Q45 8 60 8 Q75 8 75 19 Z" />, c, undefined, 3)}
      <path d="M45.5 15 H74.5 V18.5 H45.5 Z" fill={CHARCOAL} />
      <path d="M32 20 Q60 13 88 20 Q83 25 60 23.5 Q37 25 32 20 Z" fill={c} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
      <MoodFx mood={mood} x={102} y={40} />
    </>
  )
};

export const DISGUISE_ART = { penguin, raccoon, bear, flamingo, giraffe } satisfies Record<string, CharacterArt>;
