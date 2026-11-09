import { afterEach, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import { io as connect } from 'socket.io-client';
import { createApp, originMatcher, parseOrigins } from './app.js';
import { FIXTURE_PACKS } from './test/fixtures.js';

describe('CLIENT_ORIGIN parsing', () => {
  it('splits, trims and drops trailing slashes', () => {
    expect(parseOrigins(' https://a.onrender.com/ , https://b.example.com ')).toEqual(['https://a.onrender.com', 'https://b.example.com']);
    expect(parseOrigins(undefined)).toEqual([]);
  });

  it('allows everything when unset, only listed origins (with * wildcards) otherwise', () => {
    expect(originMatcher([])('https://evil.example')).toBe(true);
    const ok = originMatcher(parseOrigins('https://oncealiar.onrender.com,https://oncealiar-*.onrender.com'));
    expect(ok('https://oncealiar.onrender.com')).toBe(true);
    expect(ok('https://oncealiar-ab12.onrender.com')).toBe(true);
    expect(ok('https://oncealiar-pr-3.onrender.com')).toBe(true);
    expect(ok('https://evil.onrender.com')).toBe(false);
    expect(ok('https://oncealiar.onrender.com.evil.io')).toBe(false);
    expect(ok('https://x.oncealiar-a.onrender.com')).toBe(false);
    expect(ok(undefined)).toBe(true); // same-origin / curl / Render health check
  });
});

describe('split deploy server', () => {
  let srv: ReturnType<typeof createApp> | null = null;
  afterEach(async () => {
    await srv?.close();
    srv = null;
  });
  const listen = async (opts: Partial<Parameters<typeof createApp>[0]>) => {
    srv = createApp({ packs: FIXTURE_PACKS, ...opts });
    await new Promise<void>((r) => srv!.httpServer.listen(0, r));
    return `http://localhost:${(srv.httpServer.address() as AddressInfo).port}`;
  };

  it('answers /healthz with CORS for the client origin and no-store', async () => {
    const base = await listen({ clientOrigins: ['https://oncealiar.onrender.com'] });
    const good = await fetch(`${base}/healthz`, { headers: { Origin: 'https://oncealiar.onrender.com' } });
    expect(good.status).toBe(200);
    expect(good.headers.get('access-control-allow-origin')).toBe('https://oncealiar.onrender.com');
    expect(good.headers.get('cache-control')).toBe('no-store');
    const bad = await fetch(`${base}/healthz`, { headers: { Origin: 'https://evil.example' } });
    expect(bad.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('simulated cold start holds /healthz and refuses sockets until awake', async () => {
    const base = await listen({ coldStartMs: 600 });
    const t0 = Date.now();
    const res = await fetch(`${base}/healthz`);
    expect(res.status).toBe(200);
    expect(Date.now() - t0).toBeGreaterThanOrEqual(400);
    // now awake: a socket connects
    const sock = connect(base, { transports: ['websocket'], reconnection: false });
    await new Promise<void>((resolve, reject) => {
      sock.on('connect', () => resolve());
      sock.on('connect_error', reject);
    });
    sock.close();
  });

  it('refuses socket handshakes during a simulated cold start', async () => {
    const base = await listen({ coldStartMs: 5000 });
    const sock = connect(base, { transports: ['polling'], reconnection: false });
    const err = await new Promise<Error>((resolve) => sock.on('connect_error', resolve));
    expect(err).toBeTruthy();
    sock.close();
  });

  it('/__nap exists only with the simulation on, and puts the server back to sleep', async () => {
    let base = await listen({});
    expect((await fetch(`${base}/__nap`)).status).toBe(404);
    await srv!.close();
    base = await listen({ coldStartMs: 1 });
    await new Promise((r) => setTimeout(r, 5));
    expect((await fetch(`${base}/__nap?ms=5000`)).status).toBe(200);
    const sock = connect(base, { transports: ['polling'], reconnection: false });
    await new Promise<Error>((resolve) => sock.on('connect_error', resolve));
    sock.close();
  });
});
