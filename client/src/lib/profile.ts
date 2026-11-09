import { AVATARS, AVATAR_INFO, PLAYER_COLORS, isAvatarId, type AvatarId, type PlayerProfile } from '@oncealiar/shared';
import { KEYS, loadJSON, saveJSON } from './storage';

const pick = <T,>(arr: readonly T[]) => arr[Math.floor(Math.random() * arr.length)];
const NAME_MAX = 16;

export function randomProfile(name = ''): PlayerProfile {
  return { name, avatar: pick(AVATARS), color: pick(PLAYER_COLORS) };
}

export function sanitizeProfile(p: Partial<PlayerProfile> | null | undefined): PlayerProfile {
  const base = randomProfile();
  return {
    name: typeof p?.name === 'string' ? p.name.slice(0, NAME_MAX) : '',
    // any known character (premium ones are kept for premium rooms); old ids like 'fox' re-randomize
    avatar: isAvatarId(p?.avatar) ? p.avatar : base.avatar,
    color: p?.color && (PLAYER_COLORS as readonly string[]).includes(p.color) ? p.color : base.color
  };
}

export const loadProfile = () => sanitizeProfile(loadJSON<Partial<PlayerProfile> | null>(KEYS.profile, null));
export const saveProfile = (p: PlayerProfile) => saveJSON(KEYS.profile, p);

export function colorVar(id: string | undefined): string {
  return `var(--pc-${id && (PLAYER_COLORS as readonly string[]).includes(id) ? id : 'slate'})`;
}

// ───────────────────────── codenames ─────────────────────────

const ADJECTIVES = [
  'Sneaky', 'Shady', 'Sly', 'Silent', 'Cunning', 'Fishy', 'Slick', 'Secret', 'Crafty', 'Mystery',
  'Velvet', 'Midnight', 'Undercover', 'Suspicious', 'Smooth', 'Shifty', 'Masked', 'Rogue', 'Double',
  'Agent', 'Captain', 'Sir', 'Lady', 'Dodgy', 'Innocent', 'Totally Real', 'Cheeky', 'Sus'
];
const AVATAR_NOUN: Record<AvatarId, string> = {
  chancla: 'Chancla', duck: 'Duck', cow: 'Cow', goldfish: 'Bubbles', agent: 'Fedora', pigeon: 'Pigeon',
  paparazzi: 'Paparazzi', cat: 'Cat', gnome: 'Gnome', ghost: 'Ghost', pina: 'Piña', nopal: 'Nopal',
  abuela: 'Abuela', tio: 'Tío', tia: 'Tía', villana: 'Villana', primo: 'Primo',
  penguin: 'Waiter', raccoon: 'Raccoon', bear: 'Tourist', flamingo: 'Lamp', giraffe: 'Stranger',
  shoephone: 'Shoe', magnifier: 'Lupa'
};
const NOUNS = new Set<string>([...Object.values(AVATAR_NOUN), 'Spy']);

/** the one-word stage name for a character ("Chancla", "Bubbles"…), used in codenames and CTAs */
export const avatarNoun = (avatar: string): string => (isAvatarId(avatar) ? AVATAR_NOUN[avatar] : 'Spy');

export const isPremiumAvatar = (id: string) => isAvatarId(id) && AVATAR_INFO[id].premium;

/** premium characters only work in premium rooms: swap for a free one (not already taken) otherwise */
export function freeAvatarFallback(p: PlayerProfile, takenAvatars: string[] = [], rng: () => number = Math.random): PlayerProfile {
  if (!isPremiumAvatar(p.avatar)) return p;
  return { ...p, avatar: pickFree(AVATARS, takenAvatars, undefined, rng) };
}

const norm = (s: string) => s.trim().toLowerCase();

/** "Sneaky Fox" — a fun codename that matches the avatar, ≤16 chars, not in `taken`. */
export function codename(avatar: string, taken: Iterable<string> = [], rng: () => number = Math.random): string {
  const used = new Set([...taken].map(norm));
  const noun = avatarNoun(avatar);
  const options = ADJECTIVES.map((a) => `${a} ${noun}`).filter((n) => n.length <= NAME_MAX && !used.has(norm(n)));
  if (options.length) return options[Math.floor(rng() * options.length)];
  return dedupeName(`Agent ${noun}`, used);
}

/** true for names `codename()` produces ("Sneaky Duck", "Agent Spy"), false for anything a person typed */
export function isCodename(name: string): boolean {
  const n = name.trim();
  return ADJECTIVES.some((a) => n.startsWith(`${a} `) && NOUNS.has(n.slice(a.length + 1)));
}

/**
 * Keep a generated codename in step with the character: "Sneaky Duck" → "Sneaky Cow".
 * Names the player typed are left alone; empty names stay empty.
 */
export function retargetCodename(name: string, avatar: string, taken: Iterable<string> = [], rng: () => number = Math.random): string {
  if (!isCodename(name)) return name;
  const used = new Set([...taken].map(norm));
  const adj = ADJECTIVES.find((a) => name.trim().startsWith(`${a} `))!;
  const next = `${adj} ${avatarNoun(avatar)}`;
  return next.length <= NAME_MAX && !used.has(norm(next)) ? next : codename(avatar, taken, rng);
}

/** "Sam" → "Sam 2" (→ "Sam 3"…) when the name is already used in the room. Case-insensitive. */
export function dedupeName(name: string, taken: Iterable<string>): string {
  const used = new Set([...taken].map(norm));
  const base = name.trim().slice(0, NAME_MAX);
  if (!used.has(norm(base))) return base;
  for (let n = 2; n < 100; n++) {
    const suffix = ` ${n}`;
    const candidate = `${base.slice(0, NAME_MAX - suffix.length).trimEnd()}${suffix}`;
    if (!used.has(norm(candidate))) return candidate;
  }
  return base;
}

export interface TakenLooks {
  names: string[];
  avatars: string[];
  colors: string[];
}

function pickFree<T extends string>(all: readonly T[], taken: string[], preferred?: string, rng = Math.random): T {
  if (preferred && (all as readonly string[]).includes(preferred) && !taken.includes(preferred)) return preferred as T;
  const free = all.filter((x) => !taken.includes(x));
  const pool = free.length ? free : all;
  return pool[Math.floor(rng() * pool.length)];
}

/**
 * The profile to join a room with, with zero typing:
 * - returning visitors keep their saved look (name de-duplicated against the room);
 * - first-timers get a random character not already in the room and a matching codename.
 */
export function profileForRoom(
  saved: PlayerProfile,
  taken: TakenLooks,
  rng: () => number = Math.random,
  roomPremium = false
): { profile: PlayerProfile; generated: boolean } {
  if (saved.name.trim()) {
    const look = roomPremium ? saved : freeAvatarFallback(saved, taken.avatars, rng);
    return { profile: { ...look, name: dedupeName(saved.name, taken.names) }, generated: false };
  }
  const avatar = pickFree(AVATARS, taken.avatars, undefined, rng);
  const color = pickFree(PLAYER_COLORS, taken.colors, undefined, rng);
  return { profile: { name: codename(avatar, taken.names, rng), avatar, color }, generated: true };
}
