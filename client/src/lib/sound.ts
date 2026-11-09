/**
 * Tiny WebAudio synth — every sound effect is generated, no audio files.
 */
import { KEYS, loadJSON, saveJSON } from './storage';

type Wave = OscillatorType;
let ctx: AudioContext | null = null;
let muted = loadJSON<boolean>(KEYS.muted, false);
const listeners = new Set<(m: boolean) => void>();

export const isMuted = () => muted;
export function setMuted(m: boolean) {
  muted = m;
  saveJSON(KEYS.muted, m);
  listeners.forEach((l) => l(m));
}
export function onMutedChange(fn: (m: boolean) => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    try {
      ctx = new C();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
  return ctx;
}

/** Call from a user gesture once so iOS lets us play later. */
export function unlockAudio() {
  audio();
}

interface ToneOpts {
  freq: number;
  to?: number;
  dur?: number;
  type?: Wave;
  gain?: number;
  delay?: number;
}

function tone({ freq, to, dur = 0.14, type = 'sine', gain = 0.12, delay = 0 }: ToneOpts) {
  if (muted) return;
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function noise(dur = 0.3, gain = 0.08, from = 400, to = 3000, type: BiquadFilterType = 'bandpass', delay = 0) {
  if (muted) return;
  const ac = audio();
  if (!ac) return;
  const len = Math.floor(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ac.createBufferSource();
  src.buffer = buf;
  const filter = ac.createBiquadFilter();
  filter.type = type;
  filter.Q.value = 1.2;
  const t = ac.currentTime + delay;
  filter.frequency.setValueAtTime(from, t);
  filter.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = ac.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filter).connect(g).connect(ac.destination);
  src.start(t);
}

const arp = (notes: number[], step = 0.09, type: Wave = 'triangle', gain = 0.11) =>
  notes.forEach((f, i) => tone({ freq: f, dur: 0.22, type, gain, delay: i * step }));

export const sfx = {
  tap: () => tone({ freq: 520, to: 680, dur: 0.06, type: 'triangle', gain: 0.07 }),
  pop: () => tone({ freq: 380, to: 920, dur: 0.12, type: 'sine', gain: 0.14 }),
  join: () => arp([523, 784], 0.07, 'triangle', 0.1),
  tick: () => tone({ freq: 1100, dur: 0.04, type: 'square', gain: 0.03 }),
  tickUrgent: () => tone({ freq: 1500, dur: 0.06, type: 'square', gain: 0.05 }),
  whoosh: () => noise(0.35, 0.09, 300, 3200),
  flip: () => noise(0.12, 0.08, 1800, 600),
  /** Velvet curtain: a soft low swish, then a tiny drumroll-and-ting as it reopens. */
  curtain: () => {
    noise(0.3, 0.06, 1600, 260, 'lowpass');
    for (let i = 0; i < 5; i++) tone({ freq: 190, to: 150, dur: 0.05, type: 'triangle', gain: 0.035, delay: 0.3 + i * 0.035 });
    tone({ freq: 1320, dur: 0.18, type: 'sine', gain: 0.045, delay: 0.5 });
  },
  yourTurn: () => arp([659, 880, 1175], 0.08),
  vote: () => tone({ freq: 300, to: 180, dur: 0.12, type: 'square', gain: 0.06 }),
  reveal: () => {
    noise(0.5, 0.06, 200, 1200);
    arp([196, 247, 294, 392], 0.12, 'sawtooth', 0.05);
  },
  liar: () => {
    tone({ freq: 110, to: 82, dur: 0.9, type: 'sawtooth', gain: 0.08 });
    tone({ freq: 165, to: 123, dur: 0.9, type: 'sawtooth', gain: 0.05, delay: 0.05 });
  },
  win: () => arp([523, 659, 784, 1047, 1319], 0.08, 'triangle', 0.12),
  lose: () => arp([392, 330, 262, 196], 0.14, 'sine', 0.1),
  toast: () => tone({ freq: 880, dur: 0.08, type: 'sine', gain: 0.05 }),
  /** Rubber stamp: low body thump + short papery slap. */
  stamp: () => {
    tone({ freq: 150, to: 48, dur: 0.16, type: 'sine', gain: 0.32 });
    tone({ freq: 90, to: 40, dur: 0.12, type: 'triangle', gain: 0.18 });
    noise(0.07, 0.16, 2400, 500, 'lowpass');
  },
  /** One typewriter key strike (call repeatedly for typing). */
  type: () => {
    noise(0.03, 0.12, 3800, 2200, 'highpass');
    tone({ freq: 210 + Math.random() * 60, dur: 0.025, type: 'square', gain: 0.025 });
  },
  /** Carriage-return ding. */
  ding: () => tone({ freq: 2093, dur: 0.5, type: 'sine', gain: 0.06 }),
  /** Paper sliding across a desk. */
  paper: () => noise(0.32, 0.07, 900, 4200, 'highpass'),
  /** Camera flash: rising whine + shutter click. */
  flash: () => {
    tone({ freq: 1800, to: 5200, dur: 0.22, type: 'sine', gain: 0.025 });
    noise(0.05, 0.2, 5000, 1500, 'bandpass', 0.24);
    tone({ freq: 120, to: 60, dur: 0.06, type: 'square', gain: 0.06, delay: 0.24 });
  }
};
