import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { io as Client } from 'socket.io-client';
import { server } from './index';

// dynamic import to avoid side effects if any

const PORT = 4011;
let httpServer: any;

beforeAll(() => {
  process.env.NODE_ENV = 'test';
  httpServer = server.listen(PORT);
});

afterAll((done) => {
  httpServer.close(done);
});

describe('server basic socket flow', () => {
  it('creates a room and joins', async () => {
  const client = Client(`http://localhost:${PORT}`);
  await new Promise<void>(res => client.on('connect', () => res()));
    client.emit('room:create');
  const code: string = await new Promise(res => client.on('room:created', (c: string) => res(c)));
    expect(code).toHaveLength(6);
    client.emit('player', 'Test', '😀');
  const gameUpdate = await new Promise<any>(res => client.on('game:update', (g) => res(g)));
    expect(gameUpdate.code).toBe(code);
    client.close();
  });
});
