import type { PlayerProfile, Topic, WordPack } from '@oncealiar/shared';

const words = (prefix: string) => Array.from({ length: 16 }, (_, i) => `${prefix}${i + 1}`);
const topic = (id: string): Topic => ({ id, name: `Topic ${id}`, emoji: '🍕', words: words(id.toUpperCase()) });

export const FIXTURE_PACKS: WordPack[] = [
  { id: 'starter', name: 'Starter', tagline: 't', emoji: '⭐', premium: false, topics: [topic('a'), topic('b'), topic('c')] },
  { id: 'spicy', name: 'Spicy', tagline: 't', emoji: '🌶', premium: false, mature: true, topics: [topic('m')] },
  { id: 'gold', name: 'Gold', tagline: 't', emoji: '💎', premium: true, topics: [topic('g')] }
];

export const profile = (name: string): PlayerProfile => ({ name, avatar: 'fox', color: 'coral' });

/** deterministic PRNG (mulberry32) */
export function seeded(seed = 1): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
