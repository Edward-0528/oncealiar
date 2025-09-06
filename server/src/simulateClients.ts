import { io as Client, Socket } from 'socket.io-client';
import { ClientToServerEvents, ServerToClientEvents, GameState } from '@oncealiar/shared';

interface SimClient {
  socket: Socket<ServerToClientEvents, ClientToServerEvents>;
  name: string;
  id?: string;
}

const count = Number(process.argv[2] || 4);
const baseUrl = process.env.SIM_URL || 'http://localhost:3001';

(async () => {
  console.log(`Spawning ${count} simulated clients...`);
  const clients: SimClient[] = [];
  let roomCode: string | null = null;

  for (let i = 0; i < count; i++) {
    const c: SimClient = { socket: Client(baseUrl), name: `Bot${i + 1}` };
    c.socket.on('connect', () => {
      if (i === 0) {
        c.socket.emit('room:create');
      } else if (roomCode) {
        c.socket.emit('room:join', roomCode);
      }
    });

    c.socket.on('room:created', (code) => {
      roomCode = code;
      console.log(`Room created: ${code}`);
      c.socket.emit('player', c.name, '🤖');
    });

    c.socket.on('room:joined', (code) => {
      roomCode = code;
      c.socket.emit('player', c.name, '🤖');
    });

    c.socket.on('game:update', (game: GameState, you) => {
      c.id = you;
      if (!roomCode) roomCode = game.code;
      // Auto start once all bots joined (host only)
      if (i === 0 && Object.keys(game.players).length === count && game.round.phase === 'lobby') {
        console.log('All bots joined, starting round...');
        c.socket.emit('start');
      }
    });

    clients.push(c);
    // small stagger
    await new Promise(r => setTimeout(r, 150));
  }

  // Voting simulation after some time
  setInterval(() => {
    clients.forEach(cl => {
      if (!cl.id) return;
      const others = clients.filter(o => o.id && o.id !== cl.id);
      const target = others[Math.floor(Math.random() * others.length)];
      if (target?.id) cl.socket.emit('vote', target.id);
    });
  }, 10_000);
})();
