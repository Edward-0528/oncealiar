import { AVATARS, ALL_AVATARS, PLAYER_COLORS, REACTIONS, type PlayerProfile } from '@oncealiar/shared';

export const NAME_MAX = 16;
/** Room code alphabet: letters only, no I or O (and no digits, so no 0/1). */
export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
export const CODE_LENGTH = 4;

/**
 * Validate a player profile. Free avatars are always allowed; premium-pack
 * avatars (PREMIUM_AVATARS) only when `opts.premium` is true.
 * TODO(rooms): pass `{ premium: room.game.premium }` from rooms.ts join/update
 * handlers so premium rooms accept La Familia / Spy Gadgets avatars.
 */
export function sanitizeProfile(input: unknown, opts: { premium?: boolean } = {}): PlayerProfile | null {
  if (!input || typeof input !== 'object') return null;
  const { name, avatar, color } = input as Record<string, unknown>;
  if (typeof name !== 'string' || typeof avatar !== 'string' || typeof color !== 'string') return null;
  // strip control chars, collapse whitespace
  const clean = name.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim();
  const len = Array.from(clean).length;
  if (len < 1 || len > NAME_MAX) return null;
  const allowed: readonly string[] = opts.premium ? ALL_AVATARS : AVATARS;
  if (!allowed.includes(avatar)) return null;
  if (!(PLAYER_COLORS as readonly string[]).includes(color)) return null;
  return { name: clean, avatar, color };
}

export function isReaction(emoji: unknown): emoji is string {
  return typeof emoji === 'string' && (REACTIONS as readonly string[]).includes(emoji);
}

export function normalizeCode(code: unknown): string | null {
  if (typeof code !== 'string') return null;
  const c = code.trim().toUpperCase();
  if (c.length !== CODE_LENGTH) return null;
  for (const ch of c) if (!CODE_ALPHABET.includes(ch)) return null;
  return c;
}

export function randomCode(rng: () => number = Math.random): string {
  let s = '';
  for (let i = 0; i < CODE_LENGTH; i++) s += CODE_ALPHABET[Math.floor(rng() * CODE_ALPHABET.length)];
  return s;
}

/** Sliding-window rate limiter: allows `limit` hits per `windowMs`. */
export class RateLimiter {
  private hits = new Map<string, number[]>();
  constructor(private limit: number, private windowMs: number) {}
  allow(key: string, now: number): boolean {
    const arr = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
    if (arr.length >= this.limit) {
      this.hits.set(key, arr);
      return false;
    }
    arr.push(now);
    this.hits.set(key, arr);
    return true;
  }
  forget(key: string): void {
    this.hits.delete(key);
  }
}
