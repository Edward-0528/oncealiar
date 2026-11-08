import React from 'react';

/**
 * Shared drawing kit for the "Tabloid Spy" cast.
 * Everything is drawn in a 120x120 viewBox with a 3.5px ink outline,
 * flat fills and one consistent eye/mouth/brow vocabulary so moods work
 * the same way on every character.
 */

export type Mood = 'idle' | 'sus' | 'caught' | 'win';
export const MOODS: readonly Mood[] = ['idle', 'sus', 'caught', 'win'];

// Tabloid palette (fixed, so characters look the same in any theme)
export const INK = '#111';
export const RED = '#E8322A';
export const YELLOW = '#FFE14D';
export const MANILA = '#F1E3C2';
export const PAPER = '#FFFDF5';
export const CHARCOAL = '#2B2B2B';
export const GOLD = '#F6B73C';
export const SWEAT = '#8FD3FF';
export const BLUSH = '#F28C8C';
export const SKIN = {
  light: '#F2C9A0',
  tan: '#E0A878',
  warm: '#C98B5E',
  brown: '#A86B45',
  deep: '#7E4E32'
} as const;

/** Main outline */
export const S = { stroke: INK, strokeWidth: 3.5, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
/** Interior detail line */
export const T = { stroke: INK, strokeWidth: 2.5, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
/** Detail line, no fill */
export const L = { ...T, fill: 'none' };
/** Outline, no fill */
export const O = { ...S, fill: 'none' };

/* ------------------------------------------------------------ forms */

/** Cel-shade tone used when a form has no hand-picked shadow colour (works on any player colour). */
export const SHADE_INK = 0.2;

/**
 * A filled form with a flat cel shadow on the lower-right and the 3.5px ink outline.
 * `el` is a bare shape (no fill / stroke); `k` must be unique inside the character
 * (it is prefixed with the per-render uid). `shade` = hand-picked darker tone, else a
 * translucent ink overlay so it also works on the player colour.
 */
export function form(uid: string, k: string, el: React.ReactElement, fill: string, shade?: string, sw = 3.5, dx = -5, dy = -5.5) {
  const id = `${uid}${k}`;
  const h = `#${id}`;
  return (
    <g>
      <defs>
        {React.cloneElement(el, { id })}
        <mask id={`${id}m`}>
          <use href={h} fill="#fff" />
          <use href={h} fill="#000" transform={`translate(${dx} ${dy})`} />
        </mask>
      </defs>
      <use href={h} fill={fill} />
      <use href={h} fill={shade ?? INK} fillOpacity={shade ? 1 : SHADE_INK} mask={`url(#${id}m)`} />
      {sw > 0 && <use href={h} fill="none" stroke={INK} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" />}
    </g>
  );
}

/** Small crisp white highlight stroke (top-left light). */
export function Glint({ d, w = 3.5, o = 0.9 }: { d: string; w?: number; o?: number }) {
  return <path d={d} fill="none" stroke={PAPER} strokeWidth={w} strokeLinecap="round" opacity={o} />;
}

export interface DrawProps {
  /** player color as a CSS color (usually var(--pc-*)) */
  c: string;
  mood: Mood;
  /** unique id prefix for clipPaths etc. */
  uid: string;
}

export interface CharacterArt {
  draw: (p: DrawProps) => React.ReactNode;
  /** where the spy mask sits (120 space) */
  mask: { x: number; y: number; rot?: number; s?: number };
  /** idle animation flavour (see avatars.css) */
  anim: 'swing' | 'float' | 'bob' | 'peck' | 'bounce' | 'wiggle' | 'sway' | 'flash' | 'sneak' | 'fizz';
  /** short visual description for screen readers */
  alt: string;
}

const f = (n: number) => Math.round(n * 100) / 100;

/* ------------------------------------------------------------------ eyes */

interface EyeProps {
  x: number;
  y: number;
  r?: number;
  mood: Mood;
  /** direction pupils drift in sus mood (1 = right, -1 = left) */
  look?: 1 | -1;
  /** fill for the eyelid in sus mood (match the face) */
  lid?: string;
  sclera?: string;
  pupil?: 'round' | 'slit';
  /** colour for the happy arc in win mood (for dark faces) */
  arc?: string;
}

/** One eye. Moods: idle = glinting pupil, sus = heavy lid + side-eye, caught = pinprick, win = ^ arc. */
export function Eye({ x, y, r = 6, mood, look = 1, lid = PAPER, sclera = PAPER, pupil = 'round', arc = INK }: EyeProps) {
  if (mood === 'win') {
    return (
      <path
        d={`M${f(x - r * 0.85)} ${f(y + r * 0.35)} Q${x} ${f(y - r * 1.05)} ${f(x + r * 0.85)} ${f(y + r * 0.35)}`}
        fill="none"
        stroke={arc}
        strokeWidth={3.5}
        strokeLinecap="round"
      />
    );
  }
  const R = mood === 'caught' ? r * 1.18 : r;
  const pr = mood === 'caught' ? r * 0.3 : r * 0.52;
  const px = mood === 'sus' ? x + look * r * 0.42 : x + r * 0.08;
  const py = mood === 'sus' ? y + r * 0.22 : y + r * 0.06;
  // eyelid: circle segment above a chord just over centre
  const ly = y - r * 0.08;
  const hw = Math.sqrt(R * R - (y - ly) * (y - ly));
  return (
    <g>
      <circle cx={x} cy={y} r={f(R)} fill={sclera} {...T} />
      {pupil === 'slit' && mood !== 'caught' ? (
        <ellipse cx={f(px)} cy={f(py)} rx={f(pr * 0.45)} ry={f(r * 0.78)} fill={INK} />
      ) : (
        <circle cx={f(px)} cy={f(py)} r={f(pr)} fill={INK} />
      )}
      {mood !== 'caught' && <circle cx={f(px - pr * 0.35)} cy={f(py - pr * 0.4)} r={f(pr * 0.34)} fill={PAPER} />}
      {mood === 'sus' && (
        <path d={`M${f(x - hw)} ${f(ly)} A${f(R)} ${f(R)} 0 0 1 ${f(x + hw)} ${f(ly)} Z`} fill={lid} {...T} />
      )}
    </g>
  );
}

/** A pair of eyes. */
export function Eyes({ x1, x2, ...rest }: Omit<EyeProps, 'x'> & { x1: number; x2: number }) {
  return (
    <g>
      <Eye x={x1} {...rest} />
      <Eye x={x2} {...rest} />
    </g>
  );
}

/* ---------------------------------------------------------------- brows */

interface BrowProps {
  x1: number;
  x2: number;
  y: number;
  mood: Mood;
  w?: number;
  /** angry = always furrowed (La Chancla); none = only shown when the mood needs it */
  base?: 'none' | 'calm' | 'angry' | 'arch';
  width?: number;
  color?: string;
}

export function Brows({ x1, x2, y, mood, w = 6, base = 'none', width = 3.5, color = INK }: BrowProps) {
  const line = (ax: number, ay: number, bx: number, by: number, cy?: number) =>
    cy === undefined
      ? `M${f(ax)} ${f(ay)} L${f(bx)} ${f(by)}`
      : `M${f(ax)} ${f(ay)} Q${f((ax + bx) / 2)} ${f(cy)} ${f(bx)} ${f(by)}`;
  let d = '';
  if (mood === 'idle') {
    if (base === 'none') return null;
    if (base === 'angry') d = line(x1 - w, y - 3, x1 + w, y + 2.5) + line(x2 + w, y - 3, x2 - w, y + 2.5);
    if (base === 'calm') d = line(x1 - w, y, x1 + w, y, y - 2) + line(x2 - w, y, x2 + w, y, y - 2);
    if (base === 'arch') d = line(x1 - w, y + 1, x1 + w, y + 1, y - 5) + line(x2 - w, y + 1, x2 + w, y + 1, y - 5);
  } else if (mood === 'sus') {
    // one low and flat, one cocked up
    d = line(x1 - w, y + 1.5, x1 + w, y + 2.5) + line(x2 - w, y - 3, x2 + w, y - 1, y - 7);
  } else if (mood === 'caught') {
    d = line(x1 - w, y - 3, x1 + w, y - 7) + line(x2 + w, y - 3, x2 - w, y - 7);
  } else {
    d =
      base === 'angry'
        ? line(x1 - w, y - 4, x1 + w, y + 0.5) + line(x2 + w, y - 4, x2 - w, y + 0.5)
        : line(x1 - w, y - 3, x1 + w, y - 3, y - 8) + line(x2 - w, y - 3, x2 + w, y - 3, y - 8);
  }
  return <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" />;
}

/* ---------------------------------------------------------------- mouth */

interface MouthProps {
  x: number;
  y: number;
  w?: number;
  mood: Mood;
  /** idle shape */
  idle?: 'smile' | 'flat' | 'smirk' | 'grit' | 'none' | 'tiny';
  color?: string;
}

export function Mouth({ x, y, w = 7, mood, idle = 'smile', color = INK }: MouthProps) {
  const ln = { fill: 'none', stroke: color, strokeWidth: 3.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (mood === 'caught') {
    return (
      <g>
        <ellipse cx={x} cy={f(y + 1)} rx={f(w * 0.5)} ry={f(w * 0.68)} fill={INK} stroke={color} strokeWidth={2} />
        <ellipse cx={x} cy={f(y + w * 0.38)} rx={f(w * 0.3)} ry={f(w * 0.2)} fill={RED} />
      </g>
    );
  }
  if (mood === 'win') {
    return (
      <g>
        <path
          d={`M${f(x - w)} ${f(y - 1.5)} Q${x} ${f(y - 0.5)} ${f(x + w)} ${f(y - 1.5)} Q${f(x + w * 0.8)} ${f(y + w * 1.3)} ${x} ${f(y + w * 1.25)} Q${f(x - w * 0.8)} ${f(y + w * 1.3)} ${f(x - w)} ${f(y - 1.5)} Z`}
          fill={INK}
          stroke={color}
          strokeWidth={2.4}
          strokeLinejoin="round"
        />
        <path d={`M${f(x - w * 0.72)} ${f(y)} L${f(x + w * 0.72)} ${f(y)} L${f(x + w * 0.6)} ${f(y + w * 0.3)} L${f(x - w * 0.6)} ${f(y + w * 0.3)} Z`} fill={PAPER} />
        <ellipse cx={x} cy={f(y + w * 0.92)} rx={f(w * 0.45)} ry={f(w * 0.24)} fill={RED} />
      </g>
    );
  }
  if (mood === 'sus') {
    return <path d={`M${f(x - w * 0.8)} ${f(y + 1.5)} Q${f(x)} ${f(y + 2.5)} ${f(x + w * 0.8)} ${f(y - 2.5)}`} {...ln} />;
  }
  switch (idle) {
    case 'none':
      return null;
    case 'flat':
      return <path d={`M${f(x - w * 0.7)} ${y} L${f(x + w * 0.7)} ${y}`} {...ln} />;
    case 'smirk':
      return <path d={`M${f(x - w * 0.8)} ${f(y)} Q${f(x + w * 0.2)} ${f(y + w * 0.6)} ${f(x + w * 0.9)} ${f(y - w * 0.3)}`} {...ln} />;
    case 'tiny':
      return <path d={`M${f(x - w * 0.45)} ${y} Q${x} ${f(y + w * 0.5)} ${f(x + w * 0.45)} ${y}`} {...ln} />;
    case 'grit':
      return (
        <g>
          <rect x={f(x - w)} y={f(y - w * 0.35)} width={f(w * 2)} height={f(w * 0.8)} rx={f(w * 0.3)} fill={PAPER} {...T} stroke={color} />
          <path d={`M${f(x - w * 0.33)} ${f(y - w * 0.35)} v${f(w * 0.8)} M${f(x + w * 0.33)} ${f(y - w * 0.35)} v${f(w * 0.8)}`} {...ln} strokeWidth={2} />
        </g>
      );
    default:
      return <path d={`M${f(x - w)} ${f(y - 1)} Q${x} ${f(y + w * 0.85)} ${f(x + w)} ${f(y - 1)}`} {...ln} />;
  }
}

/* --------------------------------------------------------------- shades */

interface ShadesProps {
  x1: number;
  x2: number;
  y: number;
  w?: number;
  h?: number;
  mood: Mood;
  frame?: string;
  lid?: string;
}

/**
 * Spy sunglasses that react to the mood: sus = slide down so eyes side-eye
 * over the top, caught = pop up off the face, win = star glint.
 */
export function Shades({ x1, x2, y, w = 19, h = 12, mood, frame = INK, lid = SKIN.light }: ShadesProps) {
  const dy = mood === 'sus' ? 5 : mood === 'caught' ? -13 : 0;
  const rot = mood === 'caught' ? -8 : 0;
  const cx = (x1 + x2) / 2;
  const lens = (x: number) => (
    <path
      d={`M${f(x - w / 2)} ${f(y - h / 2)} H${f(x + w / 2)} V${f(y)} Q${f(x + w / 2)} ${f(y + h / 2)} ${x} ${f(y + h / 2)} Q${f(x - w / 2)} ${f(y + h / 2)} ${f(x - w / 2)} ${f(y)} Z`}
      fill={INK}
      stroke={frame === INK ? INK : frame}
      strokeWidth={frame === INK ? 2.5 : 3}
      strokeLinejoin="round"
    />
  );
  return (
    <g>
      {mood === 'sus' && <Eyes x1={x1} x2={x2} y={y - 5} r={4.2} mood="sus" lid={lid} />}
      {mood === 'caught' && <Eyes x1={x1} x2={x2} y={y + 1} r={5} mood="caught" />}
      <g transform={`translate(0 ${dy}) rotate(${rot} ${cx} ${y})`}>
        {frame !== INK && (
          <g>
            <rect x={f(x1 - w / 2 - 2)} y={f(y - h / 2 - 2)} width={f(w + 4)} height={f(h + 4)} rx={4} fill={INK} />
            <rect x={f(x2 - w / 2 - 2)} y={f(y - h / 2 - 2)} width={f(w + 4)} height={f(h + 4)} rx={4} fill={INK} />
          </g>
        )}
        {lens(x1)}
        {lens(x2)}
        <path d={`M${f(x1 + w / 2)} ${f(y - h / 2 + 2)} L${f(x2 - w / 2)} ${f(y - h / 2 + 2)}`} stroke={frame} strokeWidth={3} />
        <path d={`M${f(x1 - w / 2 + 3)} ${f(y - h / 2 + 3)} l4 0 M${f(x2 - w / 2 + 3)} ${f(y - h / 2 + 3)} l4 0`} stroke={PAPER} strokeWidth={2} strokeLinecap="round" opacity={0.85} />
        {mood === 'win' && <Sparkle x={x2 + w / 2 - 3} y={y - h / 2 + 1} r={6} fill={PAPER} />}
      </g>
    </g>
  );
}

/* ------------------------------------------------------------ effects */

export function Sparkle({ x, y, r = 7, fill = YELLOW }: { x: number; y: number; r?: number; fill?: string }) {
  const k = r * 0.28;
  return (
    <path
      d={`M${x} ${f(y - r)} Q${f(x + k)} ${f(y - k)} ${f(x + r)} ${y} Q${f(x + k)} ${f(y + k)} ${x} ${f(y + r)} Q${f(x - k)} ${f(y + k)} ${f(x - r)} ${y} Q${f(x - k)} ${f(y - k)} ${x} ${f(y - r)} Z`}
      fill={fill}
      stroke={INK}
      strokeWidth={2}
      strokeLinejoin="round"
    />
  );
}

export function SweatDrop({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <path
      d={`M${x} ${f(y - 8 * s)} Q${f(x + 6 * s)} ${f(y + 1 * s)} ${f(x + 4.5 * s)} ${f(y + 4 * s)} Q${x} ${f(y + 8.5 * s)} ${f(x - 4.5 * s)} ${f(y + 4 * s)} Q${f(x - 6 * s)} ${f(y + 1 * s)} ${x} ${f(y - 8 * s)} Z`}
      fill={SWEAT}
      stroke={INK}
      strokeWidth={2.2}
      strokeLinejoin="round"
    />
  );
}

/** Per-mood garnish: caught = sweat drop + shock lines, win = sparkles. */
export function MoodFx({ mood, x, y, side = 1 }: { mood: Mood; x: number; y: number; side?: 1 | -1 }) {
  if (mood === 'caught') {
    return (
      <g>
        <SweatDrop x={x} y={y} />
        <path
          d={`M${x - side * 14} ${y - 14} l${-side * 5} -6 M${x - side * 6} ${y - 18} l${-side * 1} -8 M${x + side * 3} ${y - 16} l${side * 3} -7`}
          {...L}
          strokeWidth={2.8}
        />
      </g>
    );
  }
  if (mood === 'win') {
    return (
      <g>
        <Sparkle x={x} y={y - 4} r={8} />
        <Sparkle x={x - side * 12} y={y + 10} r={4.5} fill={PAPER} />
      </g>
    );
  }
  return null;
}

/** Comic starburst (¡PUM!, ¡AY!, flash). */
export function Burst({ x, y, r = 16, points = 10, fill = RED, children }: { x: number; y: number; r?: number; points?: number; fill?: string; children?: React.ReactNode }) {
  const pts: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const a = (Math.PI * i) / points - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.62;
    pts.push(`${f(x + Math.cos(a) * rr)} ${f(y + Math.sin(a) * rr)}`);
  }
  return (
    <g>
      <path d={`M${pts.join(' L')} Z`} fill={fill} stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
      {children}
    </g>
  );
}

/** Headline-style label for bursts. Hidden from AT (the svg has its own label). */
export function Shout({ x, y, size = 9, fill = PAPER, rot = 0, children }: { x: number; y: number; size?: number; fill?: string; rot?: number; children: string }) {
  return (
    <text
      x={x}
      y={y}
      fontFamily="Anton, Impact, 'Arial Narrow', sans-serif"
      fontSize={size}
      fill={fill}
      textAnchor="middle"
      transform={rot ? `rotate(${rot} ${x} ${y})` : undefined}
      aria-hidden="true"
      style={{ letterSpacing: '0.02em' }}
    >
      {children}
    </text>
  );
}

export function Cheeks({ x1, x2, y, r = 4.5, color = BLUSH }: { x1: number; x2: number; y: number; r?: number; color?: string }) {
  return (
    <g fill={color} opacity={0.75}>
      <ellipse cx={x1} cy={y} rx={r} ry={f(r * 0.62)} />
      <ellipse cx={x2} cy={y} rx={r} ry={f(r * 0.62)} />
    </g>
  );
}

/** Translucent white highlight used for flat "sheen" on tinted parts. */
export const SHINE = { fill: PAPER, opacity: 0.38 } as const;
