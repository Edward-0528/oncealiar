/**
 * Once a Liar — shared client/server contract (v1).
 *
 * The server is authoritative. Clients receive a PublicGameState (same for
 * everyone) plus a PrivateView (only theirs) on every change via `state`.
 * Secret information (who the liar is, the secret word) NEVER appears in
 * PublicGameState until the `results` phase.
 */

export type PlayerID = string;

/** Round flow. `lobby` → (`briefing`, first game only) → `role-reveal` → `clues` → `discussion` → `voting`
 *  (→ a 10s sudden-death re-vote inside `voting` when tied, see PublicRound.runoff)
 *  → (`liar-guess` if the liar was caught and hasn't locked a guess) → `results`
 *  → next round or `game-over`. Rules live in shared/src/rules.ts. */
export type Phase =
  | 'lobby'
  /** first game in a room only (settings.briefing): animated tutorial on every phone;
   *  advances to role-reveal once every non-offline player has sent `briefing:ready`.
   *  No timer and no host skip, so nobody gets left behind. */
  | 'briefing'
  | 'role-reveal'
  | 'clues'
  | 'discussion'
  | 'voting'
  | 'liar-guess'
  | 'results'
  | 'game-over';

export type Presence = 'online' | 'away' | 'offline';

/** How long an away player keeps their seat, vote and turn before being treated as offline. */
export const AWAY_GRACE_MS = 120_000;

export type Role = 'liar' | 'truth-teller';

export interface PlayerProfile {
  name: string; // 1–16 chars, trimmed server-side
  avatar: string; // avatar id from AVATARS (see content.ts)
  color: string; // color id from PLAYER_COLORS
}

export interface Player extends PlayerProfile {
  id: PlayerID; // stable id (NOT the socket id)
  /** a test bot the host added from the lobby (plays randomly, knows nothing extra) */
  isBot?: boolean;
  score: number;
  connected: boolean;
  /** online: here and looking at the app. away: app in background or socket briefly
   *  dropped (texting someone, phone locked) and still in the round for up to
   *  AWAY_GRACE_MS. offline: gone longer than that. `connected` stays true while away. */
  presence: Presence;
  isHost: boolean;
  /** true once the player tapped "Got it" on their role card */
  ready: boolean;
  /** true once the player locked a vote this round (target stays hidden until results) */
  hasVoted: boolean;
}

export interface GameSettings {
  minPlayers: number; // default 3
  maxPlayers: number; // default 12 (free); premium rooms may go higher
  liarCount: 1 | 2; // 2 only allowed with >= 7 players
  /** spoken: players say clues out loud, the app only shows whose turn it is.
   *  typed: players type a one-word clue that is shown to everyone. */
  clueMode: 'spoken' | 'typed';
  clueSeconds: number; // per player turn, default 30
  discussionSeconds: number; // default 90
  votingSeconds: number; // default 45
  guessSeconds: number; // liar's final guess, default 30
  roundsPerGame: number; // default 5
  packIds: string[]; // enabled word packs
  /** the liar sees the category/topic name (classic) */
  liarSeesTopic: boolean;
  familyFriendly: boolean; // filters packs flagged `mature`
  /** the very first round played in a room is a practice round: 1.5× timers
   *  (WARMUP_FACTOR) and its points don't count (shown, then discarded) */
  warmupRound: boolean;
  /** play the animated group tutorial before the first game in a room */
  briefing: boolean;
}

export const DEFAULT_SETTINGS: GameSettings = {
  minPlayers: 3,
  maxPlayers: 12,
  liarCount: 1,
  clueMode: 'spoken',
  clueSeconds: 30,
  discussionSeconds: 90,
  votingSeconds: 45,
  guessSeconds: 30,
  roundsPerGame: 5,
  packIds: ['starter'],
  liarSeesTopic: true,
  familyFriendly: true,
  warmupRound: true,
  briefing: true
};

/** A topic card: 16 related words. Everyone sees the grid; truth-tellers also
 *  know which one is secret. The liar must guess it from the grid. */
export interface Topic {
  id: string;
  name: string; // e.g. "Pizza Toppings"
  emoji: string;
  words: string[]; // exactly 16
}

export interface WordPack {
  id: string;
  name: string;
  tagline: string;
  emoji: string;
  premium: boolean;
  mature?: boolean;
  topics: Topic[];
}

/** Lightweight pack listing sent to clients (no words). */
export interface PackSummary {
  id: string;
  name: string;
  tagline: string;
  emoji: string;
  premium: boolean;
  mature?: boolean;
  topicCount: number;
}

export interface Clue {
  playerId: PlayerID;
  text?: string; // present in typed mode
  at: number;
}

/** Ids of the scoring rules (points + one-sentence copy in rules.ts SCORE_RULES). */
export type ScoreRuleId =
  | 'spy-escapes'
  | 'spy-cracks-codeword'
  | 'spy-early-lock'
  | 'agent-spotted-spy'
  | 'agent-team-win';

export interface ScoreLine {
  rule: ScoreRuleId;
  points: number;
}

/** Game-over awards (titles/copy in rules.ts AWARDS). */
export type AwardId = 'sharpest-eye' | 'smoothest-spy' | 'codebreaker' | 'usual-suspect';

export interface Award {
  id: AwardId;
  /** usually one player; several on an exact tie */
  playerIds: PlayerID[];
  /** the stat that earned it (e.g. 4 = spotted the Spy 4 times) */
  value: number;
}

export interface RoundResult {
  liarIds: PlayerID[];
  secretWord: string;
  /** player with the most votes, or null on a tie / no votes */
  accusedId: PlayerID | null;
  liarCaught: boolean;
  liarGuess?: string;
  liarGuessCorrect?: boolean;
  winner: 'liar' | 'truth-tellers';
  /** voterId → targetId, revealed only at results (first vote, before any re-vote) */
  votes: Record<PlayerID, PlayerID>;
  scoreDeltas: Record<PlayerID, number>;
  /** players in the sudden-death re-vote, if the first vote tied */
  runoff?: PlayerID[];
  /** voterId → targetId in the sudden-death re-vote */
  runoffVotes?: Record<PlayerID, PlayerID>;
  /** true when the caught Spy's final answer was their early lock-in */
  guessLocked?: boolean;
  /** Spies who locked in an early guess, and what they locked (revealed at results) */
  lockedGuesses?: Record<PlayerID, string>;
  /** why each player scored: every non-zero line, in order (sums to scoreDeltas) */
  scoreBreakdown?: Record<PlayerID, ScoreLine[]>;
}

export interface PublicRound {
  number: number; // 1-based; 0 in lobby
  phase: Phase;
  /** epoch ms when the current timed phase auto-advances; null if untimed */
  phaseEndsAt: number | null;
  /** server Date.now() at emit time, so clients can correct clock skew */
  serverNow: number;
  topic: Pick<Topic, 'id' | 'name' | 'emoji' | 'words'> | null;
  turnOrder: PlayerID[];
  currentTurn: number; // index into turnOrder during `clues`
  clues: Clue[];
  result: RoundResult | null; // only during results / game-over
  /** during `voting`: non-null while the 10s sudden-death re-vote between these tied players runs */
  runoff?: PlayerID[] | null;
  /** true during the practice round (warm-up): points are shown but not added to scores */
  practice?: boolean;
  /** true during the room's warm-up round (longer timers; show coach tips) */
  warmup?: boolean;
}

export interface PublicGameState {
  code: string;
  players: Player[]; // join order
  settings: GameSettings;
  round: PublicRound;
  packs: PackSummary[];
  /** set at game-over */
  winners?: PlayerID[];
  /** true when the room has premium unlocked (premium packs, more players) */
  premium?: boolean;
  /** set at game-over */
  awards?: Award[];
}

export interface PrivateView {
  playerId: PlayerID;
  role: Role | null; // null in lobby
  secretWord: string | null; // null for liar / lobby
  /** whom you voted for this round */
  myVote: PlayerID | null;
  /** your session token, for rejoining after refresh / disconnect */
  token: string;
  /** The topic as YOU may see it. Equals round.topic normally; when
   *  settings.liarSeesTopic is false, round.topic stays null until liar-guess
   *  and only truth-tellers get the topic here (liar gets null). */
  topic?: PublicRound['topic'];
  /** Spy only: the codeword guess you locked in early this round (null if none) */
  lockedGuess?: string | null;
}

export type Ack<T = {}> = (res: ({ ok: true } & T) | { ok: false; error: string }) => void;

export interface JoinResult {
  code: string;
  playerId: PlayerID;
  token: string;
}

export interface Reaction {
  playerId: PlayerID;
  emoji: string; // one of REACTIONS
  at: number;
}

/** Read-only public room snapshot (`room:peek`): codename de-dupe before joining + TV view. */
export interface RoomPeekInfo {
  code: string;
  phase: Phase;
  round: number;
  phaseEndsAt: number | null;
  serverNow: number;
  maxPlayers: number;
  premium: boolean;
  settings: Pick<GameSettings, 'roundsPerGame' | 'clueMode'>;
  players: Pick<Player, 'id' | 'name' | 'avatar' | 'color' | 'isHost' | 'score' | 'connected' | 'presence'>[];
}

export interface ServerToClientEvents {
  state: (state: PublicGameState, you: PrivateView) => void;
  reaction: (reaction: Reaction) => void;
  toast: (message: string) => void;
  kicked: () => void;
}

export interface ClientToServerEvents {
  'room:create': (profile: PlayerProfile, ack: Ack<JoinResult>) => void;
  'room:join': (code: string, profile: PlayerProfile, ack: Ack<JoinResult>) => void;
  'room:rejoin': (code: string, token: string, ack: Ack<JoinResult>) => void;
  'room:leave': () => void;
  'profile:update': (profile: PlayerProfile) => void;
  'settings:update': (patch: Partial<GameSettings>, ack?: Ack) => void; // host only, lobby only
  'player:kick': (playerId: PlayerID) => void; // host only
  /** host only, lobby only: add a bot player (for testing with fewer phones) */
  'room:addBot': (ack?: Ack) => void;
  'game:start': (ack?: Ack) => void; // host only
  'role:ready': () => void; // during role-reveal
  'briefing:ready': () => void; // during briefing: "I get it" (uses Player.ready)
  'clue:submit': (text: string) => void; // typed mode, current turn only
  'clue:done': () => void; // spoken mode: current player (or host) ends their turn
  'phase:skip': () => void; // host only: end the current timed phase now
  'vote:cast': (targetId: PlayerID) => void; // changeable until voting ends
  /** liar only. During clues/discussion/voting: lock in an early guess (once per round,
   *  +1 if right, and it becomes your final answer if you're caught). During liar-guess: final guess. */
  'guess:submit': (word: string) => void;
  'round:next': () => void; // host only, from results
  'game:restart': () => void; // host only, from game-over → lobby, scores reset
  reaction: (emoji: string) => void;
  /** client reports page visibility (document.visibilitychange / pagehide) */
  presence: (state: 'visible' | 'hidden') => void;
  /** liveness probe (client checks the link after resuming from background) */
  'net:ping': (ack: (res: { ok: true; t: number }) => void) => void;
  /** public room snapshot without joining */
  'room:peek': (code: string, ack: (res: { ok: true; room: RoomPeekInfo } | { ok: false; error: string }) => void) => void;
  /** host only: unlock premium for this room with an unlock code */
  'room:unlock': (code: string, ack?: Ack) => void;
}
