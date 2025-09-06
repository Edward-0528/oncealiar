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

interface RoomData { game: GameState; }

const rooms = new Map<string, RoomData>();

function createRoom(hostSocket: Socket<ClientToServerEvents, ServerToClientEvents>): RoomData {
  const code = nanoid(6).toUpperCase();
  const hostId = hostSocket.id;
  const game: GameState = {
    code,
    hostId,
    players: {
      [hostId]: {
        id: hostId,
        name: 'Host',
        avatar: '😀',
        score: 0,
        connected: true
      } as Player
    },
    round: { roundNumber: 0, category: '', phase: 'lobby' },
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
    currentRoom = createRoom(socket);
    roomCode = currentRoom.game.code;
    socket.join(roomCode);
  socket.emit('room:created', roomCode, socket.id);
  // Assign host playerId locally so host can start immediately
  playerId = socket.id;
  emitGameUpdate(currentRoom.game);
  });

  socket.on('player:reclaim', (oldId, ack) => {
    // Search all rooms for this player
    for (const [code, data] of rooms.entries()) {
      const game = data.game;
      const existing = game.players[oldId];
      if (existing) {
        // Update mapping: move player entry to new socket id if changed
        const newId = socket.id;
        playerId = newId;
        currentRoom = data;
        roomCode = code;
        if (newId !== oldId) {
          game.players[newId] = { ...existing, id: newId, connected: true };
          delete game.players[oldId];
          if (game.hostId === oldId) game.hostId = newId;
        } else {
          existing.connected = true;
        }
        socket.join(code);
        ack(true, code);
        emitGameUpdate(game);
        // Re-send personalized round info if round active
        if (game.round.phase !== 'lobby') broadcastRound(game);
        return;
      }
    }
    ack(false);
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
    const existing = game.players[playerId];
    if (existing) {
      existing.name = name;
      existing.avatar = avatar;
      existing.connected = true;
    } else {
      if (!game.hostId) game.hostId = playerId; // fallback safety
      game.players[playerId] = {
        id: playerId,
        name,
        avatar,
        score: 0,
        connected: true
      } as Player;
    }
    socket.join(game.code);
  emitGameUpdate(game);
  });

  socket.on('vote', (targetId: PlayerID) => {
    if (!currentRoom || !playerId) return;
    const game = currentRoom.game;
    const me = game.players[playerId];
    if (!me) return;
    me.vote = targetId;
  emitGameUpdate(game);
  });

  socket.on('start', () => {
    if (!currentRoom || !playerId) return;
    const game = currentRoom.game;
    if (playerId !== game.hostId) return;
    const playerCount = Object.keys(game.players).length;
    const minPlayers = (game.settings as any).minPlayers ?? 3;
    if (playerCount < minPlayers) {
      socket.emit('error', `Need at least ${minPlayers} players to start (currently ${playerCount}).`);
      return;
    }
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

  // Host manual phase control for testing (in-progress -> voting -> reveal)
  socket.on('round:phase', (phase: GameState['round']['phase']) => {
    if (!currentRoom || !playerId) return;
    const game = currentRoom.game;
    if (playerId !== game.hostId) return;
    const allowed: GameState['round']['phase'][] = ['lobby', 'in-progress', 'voting', 'reveal'];
    if (!allowed.includes(phase)) return;
    if (phase === 'in-progress' && game.round.phase === 'lobby') {
      // Reuse start behavior inline
      const playerCount = Object.keys(game.players).length;
      const minPlayers = (game.settings as any).minPlayers ?? 3;
      if (playerCount < minPlayers) {
        socket.emit('error', `Need at least ${minPlayers} players to start (currently ${playerCount}).`);
        return;
      }
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
      return;
    }
    if (phase === 'voting' && game.round.phase === 'in-progress') {
      game.round.phase = 'voting';
      broadcastRound(game);
      return;
    }
    if (phase === 'reveal' && (game.round.phase === 'voting' || game.round.phase === 'in-progress')) {
      game.round.phase = 'reveal';
      broadcastRound(game);
      return;
    }
    if (phase === 'lobby') {
      // reset to lobby state (end round)
      game.round = { roundNumber: game.round.roundNumber, category: '', phase: 'lobby' } as any;
      emitGameUpdate(game);
    }
  });

  socket.on('disconnect', () => {
    if (currentRoom && playerId) {
      const player = currentRoom.game.players[playerId];
      if (player) player.connected = false;
      if (roomCode) emitGameUpdate(currentRoom.game);
    }
  });
});

function emitGameUpdate(game: GameState) {
  // Send each player their own 'you' id so host doesn't get overwritten by another player's join/update
  Object.values(game.players).forEach(p => {
    io.to(p.id).emit('game:update', game, p.id);
  });
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

// Only start listening if this module is the entrypoint (not when imported by tests)
export { app, server, io };

if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 3001;
  server.listen(PORT, () => {
    console.log(`Server listening on :${PORT}`);
  });
}
