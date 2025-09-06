export type PlayerID = string;

export interface Player {
  id: PlayerID;
  name: string;
  avatar: string; // avatar id / url
  score: number;
  connected: boolean;
  isSpy?: boolean; // only known server-side until reveal
  vote?: PlayerID; // who they currently accuse
}

export interface RoundState {
  roundNumber: number;
  category: string;
  secretWord?: string; // omitted from spy
  phase: 'lobby' | 'in-progress' | 'voting' | 'reveal' | 'ended';
  startedAt?: number; // epoch ms
  endsAt?: number; // epoch ms
  spyRevealed?: boolean;
  finalGuess?: string; // spy's guess at secret word
  winner?: 'spy' | 'team';
}

export interface GameState {
  code: string; // room code
  hostId: PlayerID;
  players: Record<PlayerID, Player>;
  round: RoundState;
  settings: GameSettings;
  createdAt: number;
}

export interface GameSettings {
  maxPlayers: number;
  allowLateJoin: boolean;
  roundTimePerPlayerSeconds: number; // 72 default? (1.2 * 60)
  minVotePercentage: number; // e.g. 0.6
}

export interface ClientVisibleRound extends Omit<RoundState, 'secretWord'> {
  youAreSpy: boolean;
  secretWord?: string; // present only if not spy
}

export interface ServerToClientEvents {
  'game:update': (state: GameState, you: PlayerID) => void;
  round: (round: ClientVisibleRound) => void;
  lobby: (state: GameState) => void;
  error: (message: string) => void;
  'room:created': (code: string) => void;
  'room:joined': (code: string) => void;
}

export interface ClientToServerEvents {
  player: (name: string, avatar: string) => void;
  vote: (playerId: PlayerID) => void;
  start: () => void;
  finalGuess: (guess: string) => void;
  ping: () => void;
  'room:create': () => void;
  'room:join': (code: string) => void;
}
