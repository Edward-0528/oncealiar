import type { ClientToServerEvents, GameSettings, Phase, Player, PrivateView, PublicGameState, Reaction } from '@oncealiar/shared';

export type ConnStatus = 'connecting' | 'connected' | 'reconnecting';

export type TransportEvent =
  | { type: 'state'; state: PublicGameState; you: PrivateView }
  | { type: 'reaction'; reaction: Reaction }
  | { type: 'toast'; message: string }
  | { type: 'kicked' }
  | { type: 'conn'; status: ConnStatus }
  /** live only: the stored session could not be resumed (room gone / token expired) */
  | { type: 'session-invalid'; code: string; error: string }
  /** live only: an automatic rejoin after a drop succeeded */
  | { type: 'rejoined'; code: string; afterMs: number };

export type EmitArgs<E extends keyof ClientToServerEvents> = Parameters<ClientToServerEvents[E]>;

/** Public, read-only room snapshot used before joining (codename de-dupe) and by the TV view. */
export interface RoomPeek {
  code: string;
  phase: Phase;
  round: number;
  phaseEndsAt: number | null;
  serverNow: number;
  maxPlayers: number;
  /** premium rooms allow premium characters */
  premium?: boolean;
  players: Pick<Player, 'id' | 'name' | 'avatar' | 'color' | 'isHost' | 'score' | 'connected' | 'presence'>[];
  settings?: Pick<GameSettings, 'roundsPerGame' | 'clueMode'>;
}

/** Abstracts socket.io so the UI can run against a fake server (mock mode). */
export interface Transport {
  kind: 'live' | 'mock';
  emit<E extends keyof ClientToServerEvents>(event: E, ...args: EmitArgs<E>): void;
  subscribe(fn: (e: TransportEvent) => void): () => void;
  status(): ConnStatus;
  /** live only: public room snapshot without joining (null = no such room / unreachable) */
  peek?(code: string): Promise<RoomPeek | null>;
  /** live only: verify the connection is alive right now (after resume), reconnect if not */
  check?(): void;
  /** live only: a stored session will be resumed automatically once connected */
  willRejoin?(): boolean;
  /** mock only: what to show before a room exists */
  initialView?: 'home' | 'profile';
  /** mock only: dev controls */
  mock?: { phase: Phase | 'home' | 'profile'; params: URLSearchParams };
}
