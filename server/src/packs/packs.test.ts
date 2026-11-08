import { describe, it, expect } from 'vitest';
import { PACKS } from './index.js';

const MAX_WORD_LEN = 18;
const allTopics = PACKS.flatMap((p) => p.topics.map((t) => ({ pack: p.id, topic: t })));

describe('word packs', () => {
  it('has a free starter pack', () => {
    const starter = PACKS.find((p) => p.id === 'starter');
    expect(starter).toBeDefined();
    expect(starter!.premium).toBe(false);
    expect(starter!.mature).toBeFalsy();
  });

  it('has at least two free packs', () => {
    expect(PACKS.filter((p) => !p.premium).length).toBeGreaterThanOrEqual(2);
  });

  it('has unique pack ids', () => {
    const ids = PACKS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has pack metadata (name, emoji, tagline <= 60 chars, topics)', () => {
    for (const p of PACKS) {
      expect(p.name.trim(), p.id).not.toBe('');
      expect(p.emoji.trim(), p.id).not.toBe('');
      expect(p.tagline.length, p.id).toBeGreaterThan(0);
      expect(p.tagline.length, p.id).toBeLessThanOrEqual(60);
      expect(p.topics.length, p.id).toBeGreaterThan(0);
    }
  });

  it('has globally unique, kebab-case, pack-prefixed topic ids', () => {
    const ids = allTopics.map(({ topic }) => topic.id);
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(dupes).toEqual([]);
    for (const { pack, topic } of allTopics) {
      expect(topic.id, topic.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      const prefix = pack === 'pop-culture' ? 'pop' : pack === 'around-the-world' ? 'world' : pack === 'family-night' ? 'family' : pack;
      expect(topic.id.startsWith(prefix), `${topic.id} should start with ${prefix}`).toBe(true);
    }
  });

  it.each(allTopics.map(({ topic }) => [topic.id, topic] as const))('%s has 16 unique, short, Title Case words', (_id, topic) => {
    expect(topic.name.trim()).not.toBe('');
    expect(topic.emoji.trim()).not.toBe('');
    expect(topic.words).toHaveLength(16);
    const normalized = topic.words.map((w) => w.trim().toLowerCase());
    expect(new Set(normalized).size).toBe(16);
    for (const w of topic.words) {
      expect(w, w).toBe(w.trim());
      expect(w.length, w).toBeGreaterThan(0);
      expect(w.length, w).toBeLessThanOrEqual(MAX_WORD_LEN);
      expect(w.split(/\s+/).length, w).toBeLessThanOrEqual(4);
      expect(w[0], `${w} should start with a capital or digit`).toMatch(/[A-Z0-9]/);
    }
  });

  it('meets per-pack topic counts', () => {
    const counts = Object.fromEntries(PACKS.map((p) => [p.id, p.topics.length]));
    expect(counts).toMatchObject({
      starter: 30,
      party: 15,
      'pop-culture': 20,
      'around-the-world': 20,
      throwback: 15,
      'after-dark': 15,
      'family-night': 15,
      office: 15
    });
    expect(PACKS.find((p) => p.id === 'after-dark')!.mature).toBe(true);
  });
});
