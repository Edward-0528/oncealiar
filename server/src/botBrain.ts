/**
 * A bot player: a real Socket.IO client that joins a room and plays like a
 * clueless guest. Used by the `npm run bots` CLI and by the host's in-lobby
 * "Add a bot" button (the server spawns these against itself).
 *
 * Bots never peek at anyone else's role: they vote for a random player
 * (only tied players during a sudden-death re-vote), give a random vague clue
 * in typed mode, and as the Spy guess a random grid word.
 */
import { io, type Socket } from 'socket.io-client';
import {
  AVATARS,
  PLAYER_COLORS,
  REACTIONS,
  type ClientToServerEvents,
  type PrivateView,
  type PublicGameState,
  type ServerToClientEvents
} from '@oncealiar/shared';

export const BOT_NAMES = ['Botty', 'Sneaky', 'Gizmo', 'Pixel', 'Widget', 'Sprocket', 'Noodle', 'Biscuit', 'Waffle', 'Pickle'];
const CLUES = ['hmm', 'classic', 'tasty', 'round', 'loud', 'shiny', 'cozy', 'weird', 'big', 'fancy'];
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(Math.random() * arr.length)];

export interface BotOptions {
  url: string;
  code: string;
  index: number;
  /** server-side secret that marks this player as a bot (in-lobby bots) */
  botKey?: string;
  /** sometimes "answer a text" (tab hidden 5–25 s) */
  flaky?: boolean;
  /** leave when no human is connected for this long (ms); 0 = never */
  leaveWhenAloneMs?: number;
  log?: (msg: string) => void;
}

export function spawnBot(opts: BotOptions): Socket<ServerToClientEvents, ClientToServerEvents> {
  const { url, code, index: i, botKey, flaky = false, leaveWhenAloneMs = 0, log = () => {} } = opts;
  const s: Socket<ServerToClientEvents, ClientToServerEvents> = io(url, {
    transports: ['websocket'],
    auth: botKey ? { botKey } : undefined,
    reconnectionAttempts: 5
  });
  const name = `${BOT_NAMES[i % BOT_NAMES.length]}${i >= BOT_NAMES.length ? i : ''}`.slice(0, 16);
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const later = (fn: () => void, min = 500, max = 2500) => {
    const t = setTimeout(() => {
      timers.delete(t);
      fn();
    }, min + Math.random() * (max - min));
    timers.add(t);
  };
  let acted = ''; // de-dupe actions per (round, phase, turn, runoff)
  let away = false;
  let aloneSince: number | null = null;
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    for (const t of timers) clearTimeout(t);
    timers.clear();
    s.emit('room:leave');
    s.close();
  };

  s.on('connect', () => {
    if (closed) return;
    s.emit('room:join', code, { name, avatar: AVATARS[(i + 3) % AVATARS.length], color: PLAYER_COLORS[(i + 5) % PLAYER_COLORS.length] }, (res) => {
      if (!res.ok) {
        log(`[${name}] join failed: ${res.error}`);
        close();
      } else log(`[${name}] joined ${res.code}`);
    });
  });

  s.on('state', (st: PublicGameState, me: PrivateView) => {
    if (closed) return;
    // the host ended the session: nothing left to play
    if (st.sessionEnded) return close();
    // in-lobby bots leave once the humans are gone, so they never keep a room alive
    if (leaveWhenAloneMs > 0) {
      const humans = st.players.some((p) => !p.isBot && p.connected);
      if (humans) aloneSince = null;
      else if (aloneSince === null) aloneSince = Date.now();
      else if (Date.now() - aloneSince > leaveWhenAloneMs) return close();
    }
    const r = st.round;
    const key = `${r.number}:${r.phase}:${r.currentTurn}:${r.runoff?.join(',') ?? ''}`;
    if (key === acted) return;
    if (away) return; // a phone in a pocket doesn't tap anything
    if (flaky && r.phase !== 'lobby' && Math.random() < 0.04) {
      away = true;
      s.emit('presence', 'hidden');
      log(`[${name}] stepped away`);
      later(() => {
        away = false;
        acted = '';
        s.emit('presence', 'visible');
        log(`[${name}] is back`);
      }, 5000, 25000);
      return;
    }
    switch (r.phase) {
      case 'briefing':
        acted = key;
        later(() => s.emit('briefing:ready'), 1000, 3000);
        break;
      case 'role-reveal':
        acted = key;
        later(() => s.emit('role:ready'));
        break;
      case 'clues':
        if (r.turnOrder[r.currentTurn] !== me.playerId) return;
        acted = key;
        later(() => (st.settings.clueMode === 'typed' ? s.emit('clue:submit', pick(CLUES)) : s.emit('clue:done')), 1500, 4000);
        break;
      case 'discussion':
        acted = key;
        // the Spy sometimes locks in an early guess (+1 if right, final answer if caught)
        if (me.role === 'liar' && !me.lockedGuess && Math.random() < 0.4) {
          const words = me.topic?.words ?? r.topic?.words;
          if (words) later(() => s.emit('guess:submit', pick(words)), 2000, 8000);
        }
        break;
      case 'voting': {
        acted = key;
        const pool = r.runoff?.length ? r.runoff : r.turnOrder;
        const targets = pool.filter((id) => id !== me.playerId);
        if (targets.length) later(() => s.emit('vote:cast', pick(targets)), 1000, r.runoff ? 4000 : 5000);
        if (Math.random() < 0.3) later(() => s.emit('reaction', pick(REACTIONS)));
        break;
      }
      case 'liar-guess':
        acted = key;
        if (me.role === 'liar' && r.topic) later(() => s.emit('guess:submit', pick(r.topic!.words)), 1000, 4000);
        break;
      case 'results':
        acted = key;
        if (r.result?.liarIds.includes(me.playerId)) log(`[${name}] was the Spy: ${r.result.winner} won, +${r.result.scoreDeltas[me.playerId] ?? 0}`);
        break;
      default:
        acted = key;
    }
  });

  s.on('toast', (m) => log(`[${name}] toast: ${m}`));
  s.on('kicked', () => {
    log(`[${name}] kicked`);
    close();
  });
  s.on('room:ended', () => close());
  s.on('connect_error', (e) => log(`[${name}] connect error: ${e.message}`));
  return s;
}
