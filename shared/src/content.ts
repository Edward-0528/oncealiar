/**
 * Cosmetic + reaction ids shared by client and server.
 * The client maps ids to artwork; the server only validates ids.
 * (Word packs live server-side in server/src/packs/ so premium words never ship to clients.)
 */

/* ---------------------------------------------------------------- avatars
 * Character ids ("Tabloid Spy" cast, art in client/src/components/avatars/).
 * AVATARS = the free cast: safe for random picks, bots and the default picker.
 * PREMIUM_AVATARS = paid packs, only valid in premium rooms.
 * ALL_AVATARS = every id the client can draw. See docs/characters.md.
 */
export const AVATARS = [
  'chancla', 'duck', 'cow', 'goldfish', 'agent', 'pigeon', 'paparazzi', 'cat', 'gnome', 'ghost', 'pina', 'nopal'
] as const;
export const PREMIUM_AVATARS = [
  // La Familia
  'abuela', 'tio', 'tia', 'villana', 'primo',
  // Masters of Disguise
  'penguin', 'raccoon', 'bear', 'flamingo', 'giraffe', 'shoephone', 'magnifier'
] as const;
export const ALL_AVATARS = [...AVATARS, ...PREMIUM_AVATARS] as const;
export type FreeAvatarId = (typeof AVATARS)[number];
export type PremiumAvatarId = (typeof PREMIUM_AVATARS)[number];
export type AvatarId = FreeAvatarId | PremiumAvatarId;
export type AvatarPack = 'free' | 'la-familia' | 'disguise';

/** Premium packs in display order. */
export const AVATAR_PACKS: { id: Exclude<AvatarPack, 'free'>; name: string }[] = [
  { id: 'disguise', name: 'Masters of Disguise' },
  { id: 'la-familia', name: 'La Familia' }
];

export const AVATAR_INFO: Record<AvatarId, { name: string; line: string; pack: AvatarPack; premium: boolean }> = {
  chancla: { name: 'La Chancla', line: 'Thrown with love. Never misses. Ask your primos.', pack: 'free', premium: false },
  agent: { name: 'Agent Fedora', line: 'Sunglasses indoors. Trusts no one.', pack: 'free', premium: false },
  pigeon: { name: 'The Pigeon', line: 'Hears everything. Coos for crumbs.', pack: 'free', premium: false },
  duck: { name: 'Duck Disguise', line: 'Definitely not a duck. Look at the mustache.', pack: 'free', premium: false },
  cow: { name: 'Totally a Cow', line: 'Moo. Definitely moo.', pack: 'free', premium: false },
  goldfish: { name: 'Agent Bubbles', line: 'Three-second memory. Perfect alibi.', pack: 'free', premium: false },
  paparazzi: { name: 'Paparazzi', line: 'Saw that. Already posted it.', pack: 'free', premium: false },
  cat: { name: 'Cat Burglar', line: 'Steals hearts and codewords.', pack: 'free', premium: false },
  gnome: { name: 'Gnome Knows', line: 'Shh. Knows your secret.', pack: 'free', premium: false },
  ghost: { name: 'Ghosted', line: 'Left the chat. Still watching.', pack: 'free', premium: false },
  pina: { name: 'Undercover Piña', line: 'Tropical, mysterious, prickly.', pack: 'free', premium: false },
  nopal: { name: 'Don Nopal', line: 'That mustache is evidence.', pack: 'free', premium: false },

  abuela: { name: 'La Abuela', line: 'Already took off the chancla. Just in case.', pack: 'la-familia', premium: true },
  tio: { name: 'El Tío', line: 'Says he is not cooking. Is cooking.', pack: 'la-familia', premium: true },
  tia: { name: 'La Tía Chismosa', line: 'Heard it first. Told everyone second.', pack: 'la-familia', premium: true },
  villana: { name: 'La Villana', line: 'Gasps on cue. Has a secret twin.', pack: 'la-familia', premium: true },
  primo: { name: 'El Primo', line: 'Knows a guy. The guy is also a primo.', pack: 'la-familia', premium: true },

  penguin: { name: 'Le Waiter', line: 'Your table is ready. Ze special is: no questions.', pack: 'disguise', premium: true },
  raccoon: { name: 'Staff Only', line: 'I work here. Please ignore the bins.', pack: 'disguise', premium: true },
  bear: { name: 'The Tourist', line: 'Just visiting. Love your... honey.', pack: 'disguise', premium: true },
  flamingo: { name: 'Just a Lamp', line: 'Pink? Lamps can be pink.', pack: 'disguise', premium: true },
  giraffe: { name: 'Tall Stranger', line: 'Normal guy. Normal height. Nothing up here.', pack: 'disguise', premium: true },
  shoephone: { name: 'Shoe Phone', line: 'Missed call from your left foot.', pack: 'disguise', premium: true },
  magnifier: { name: 'Inspector Lupa', line: 'Sees the clue. Strokes the mustache.', pack: 'disguise', premium: true }
};

export const isAvatarId = (id: unknown): id is AvatarId =>
  typeof id === 'string' && (ALL_AVATARS as readonly string[]).includes(id);

export const PLAYER_COLORS = [
  'coral', 'tangerine', 'sun', 'lime', 'mint', 'sky', 'iris', 'orchid', 'rose', 'slate'
] as const;
export type PlayerColorId = (typeof PLAYER_COLORS)[number];

export const REACTIONS = ['😂', '🤨', '😱', '👀', '🔥', '🤥'] as const;

/** Scoring (also shown in the How to Play screen). */
export const SCORING = {
  liarEscapes: 3, // liar not caught
  liarGuessesWord: 2, // liar caught but guesses the word
  truthTellerCatchesLiar: 2, // each truth-teller who voted for a liar, when the liar is caught and fails the guess
  truthTellerTeamWin: 1 // every truth-teller when the team wins
} as const;
