/**
 * Bot players for solo testing.
 *
 *   npm run bots -- ABCD 5          # join 5 bots to room ABCD
 *   BOTS_URL=http://host:3001 npm run bots -- ABCD 3
 *   BOTS_AWAY=1 npm run bots -- ABCD 5   # bots sometimes "answer a text" (tab hidden 5–25s)
 *
 * Bots confirm the briefing (tutorial) after 1–3s, ready up, take their clue turns (spoken: end turn; typed: random word),
 * vote for a random player (only tied players during a sudden-death re-vote),
 * sometimes lock in an early guess as the Spy, and guess a random grid word
 * when they're a caught Spy without a lock-in.
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

const [codeArg, countArg] = process.argv.slice(2);
const code = (codeArg ?? '').toUpperCase();
const count = Math.max(1, Math.min(19, Number(countArg) || 3));
const url = process.env.BOTS_URL ?? `http://localhost:${process.env.PORT ?? 3001}`;

if (!/^[A-Z]{4}$/.test(code)) {
  console.error('Usage: npm run bots -- <ROOM_CODE> [count]');
  process.exit(1);
}

const NAMES = ['Botty', 'Sneaky', 'Gizmo', 'Pixel', 'Widget', 'Sprocket', 'Noodle', 'Biscuit', 'Waffle', 'Pickle'];
const CLUES = ['hmm', 'classic', 'tasty', 'round', 'loud', 'shiny', 'cozy', 'weird', 'big', 'fancy'];
const flaky = process.env.BOTS_AWAY === '1';
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(Math.random() * arr.length)];
const later = (fn: () => void, min = 500, max = 2500) => setTimeout(fn, min + Math.random() * (max - min));

function spawn(i: number) {
  const s: Socket<ServerToClientEvents, ClientToServerEvents> = io(url, { transports: ['websocket'] });
  const name = `${NAMES[i % NAMES.length]}${i >= NAMES.length ? i : ''}`.slice(0, 16);
  let acted = ''; // de-dupe actions per (round, phase, turn, runoff)
  let away = false;

  s.on('connect', () => {
    s.emit('room:join', code, { name, avatar: AVATARS[i % AVATARS.length], color: PLAYER_COLORS[i % PLAYER_COLORS.length] }, (res) => {
      if (!res.ok) {
        console.error(`[${name}] join failed: ${res.error}`);
        process.exitCode = 1;
        s.close();
      } else console.log(`[${name}] joined ${res.code}`);
    });
  });

  s.on('state', (st: PublicGameState, me: PrivateView) => {
    const r = st.round;
    const key = `${r.number}:${r.phase}:${r.currentTurn}:${r.runoff?.join(',') ?? ''}`;
    if (key === acted) return;
    if (away) return; // a phone in a pocket doesn't tap anything
    if (flaky && r.phase !== 'lobby' && Math.random() < 0.04) {
      away = true;
      s.emit('presence', 'hidden');
      console.log(`[${name}] stepped away`);
      later(() => {
        away = false;
        acted = '';
        s.emit('presence', 'visible');
        console.log(`[${name}] is back`);
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
        later(() =>
          st.settings.clueMode === 'typed' ? s.emit('clue:submit', pick(CLUES)) : s.emit('clue:done'), 1500, 4000);
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
        if (r.result) {
          const d = r.result.scoreDeltas[me.playerId] ?? 0;
          if (r.result.liarIds.includes(me.playerId)) console.log(`[${name}] was the Spy: ${r.result.winner} won, +${d}`);
        }
        break;
      case 'game-over':
        acted = key;
        if (st.awards?.length && st.players[0]?.id !== me.playerId && name === NAMES[0])
          console.log(`[${name}] awards: ${st.awards.map((a) => `${a.id}=${a.playerIds.map((id) => st.players.find((p) => p.id === id)?.name).join('+')}`).join(', ')}`);
        break;
      default:
        acted = key;
    }
  });

  s.on('toast', (m) => console.log(`[${name}] toast: ${m}`));
  s.on('kicked', () => {
    console.log(`[${name}] kicked`);
    s.close();
  });
  return s;
}

const bots = Array.from({ length: count }, (_, i) => spawn(i));
console.log(`Spawning ${count} bot(s) into ${code} at ${url} — Ctrl+C to stop`);
process.on('SIGINT', () => {
  for (const b of bots) b.close();
  process.exit(0);
});
