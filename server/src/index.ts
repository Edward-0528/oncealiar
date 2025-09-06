import express, { Request, Response } from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import { nanoid } from 'nanoid';
import { GameState, Player, PlayerID, ClientToServerEvents, ServerToClientEvents } from '@oncealiar/shared';

const app = express();
app.use(cors());
app.get('/', (_req: Request, res: Response) => {
  res.send('Once A Liar server running');
});

const server = http.createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: { origin: '*' }
});

interface RoomData {
  game: GameState;
}

const rooms = new Map<string, RoomData>();

function createRoom(): RoomData {
  const code = nanoid(6).toUpperCase();
  const game: GameState = {
    code,
    hostId: '',
    players: {},
    round: {
      roundNumber: 0,
      category: '',
      phase: 'lobby'
    },
    settings: {
      maxPlayers: 18,
      allowLateJoin: true,
      roundTimePerPlayerSeconds: 72,
      minVotePercentage: 0.6
    },
    createdAt: Date.now()
  };
  const data: RoomData = { game };
  rooms.set(code, data);
  return data;
}

io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
  let currentRoom: RoomData | null = null;
  let playerId: PlayerID | null = null;
  let roomCode: string | null = null;

  socket.on('ping', () => {
    // heartbeat
  });

  socket.on('room:create', () => {
    if (currentRoom) return; // already in one
    currentRoom = createRoom();
    roomCode = currentRoom.game.code;
    socket.emit('room:created', roomCode);
  });

  socket.on('room:join', (code: string) => {
    if (currentRoom) return; // already set
    const found = rooms.get(code.toUpperCase());
    if (!found) {
      socket.emit('error', 'Room not found');
      return;
    }
    currentRoom = found;
    roomCode = found.game.code;
    socket.emit('room:joined', roomCode);
  });

  socket.on('player', (name: string, avatar: string) => {
    if (!currentRoom) {
      socket.emit('error', 'Join or create a room first');
      return;
    }
    if (!playerId) playerId = socket.id;
    const game = currentRoom.game;
    if (!game.hostId) game.hostId = playerId; // first player becomes host
    game.players[playerId] = {
      id: playerId,
      name,
      avatar,
      score: 0,
      connected: true
    } satisfies Player;
    socket.join(game.code);
    emitGameUpdate(game, playerId);
  });

  socket.on('vote', (targetId: PlayerID) => {
    if (!currentRoom || !playerId) return;
    const game = currentRoom.game;
    const me = game.players[playerId];
    if (!me) return;
    me.vote = targetId;
    emitGameUpdate(game, playerId);
  });

  socket.on('start', () => {
    if (!currentRoom || !playerId) return;
    const game = currentRoom.game;
    if (playerId !== game.hostId) return;
    game.round = {
      roundNumber: game.round.roundNumber + 1,
      category: 'Placeholder Category',
      secretWord: 'PIZZA',
      phase: 'in-progress',
      startedAt: Date.now(),
      endsAt: Date.now() + Object.keys(game.players).length * 72_000
    } as GameState['round'];
    const playerIds = Object.keys(game.players);
    const spy = playerIds[Math.floor(Math.random() * playerIds.length)];
    Object.values(game.players).forEach((p: Player) => (p.isSpy = false));
    game.players[spy].isSpy = true;
    broadcastRound(game);
  });

  socket.on('finalGuess', (guess: string) => {
    if (!currentRoom || !playerId) return;
    const game = currentRoom.game;
    const round = game.round;
    round.finalGuess = guess;
    if (guess.toLowerCase() === (round.secretWord || '').toLowerCase()) {
      round.winner = 'spy';
    } else {
      round.winner = 'team';
    }
    round.phase = 'reveal';
    broadcastRound(game);
  });

  socket.on('disconnect', () => {
    if (currentRoom && playerId) {
      const player = currentRoom.game.players[playerId];
      if (player) player.connected = false;
      if (roomCode) emitGameUpdate(currentRoom.game, playerId);
    }
  });
});

function emitGameUpdate(game: GameState, you: PlayerID) {
  io.to(game.code).emit('game:update', game, you);
}

function broadcastRound(game: GameState) {
  Object.values(game.players).forEach((p) => {
    const player = p as Player;
    const youAreSpy = !!player.isSpy;
    io.to(player.id).emit('round', {
      ...game.round,
      youAreSpy,
      secretWord: youAreSpy ? undefined : game.round.secretWord
    });
  });
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server listening on :${PORT}`);
});
