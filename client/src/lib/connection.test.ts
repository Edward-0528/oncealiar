import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConnectionKeeper, TIMINGS, type PageEnv, type SocketLike } from './connection';
import type { ConnStatus } from './transport';
import type { Session } from './storage';

/** A fake socket.io client: records emits, lets the test drive connect/disconnect and acks. */
class FakeSocket implements SocketLike {
  connected = false;
  handlers = new Map<string, ((...a: any[]) => void)[]>();
  emits: { event: string; args: any[] }[] = [];
  drops = 0;
  redials = 0;
  connects = 0;
  on(event: string, fn: (...a: any[]) => void) {
    this.handlers.set(event, [...(this.handlers.get(event) ?? []), fn]);
  }
  emit(event: string, ...args: any[]) {
    this.emits.push({ event, args });
  }
  connect() {
    this.connects++;
  }
  dropTransport() {
    this.drops++;
  }
  reconnectNow() {
    this.redials++;
  }
  fire(event: string, ...args: any[]) {
    (this.handlers.get(event) ?? []).forEach((fn) => fn(...args));
  }
  serverConnect() {
    this.connected = true;
    this.fire('connect');
  }
  serverDrop(reason = 'transport close') {
    this.connected = false;
    this.fire('disconnect', reason);
  }
  last(event: string) {
    return [...this.emits].reverse().find((e) => e.event === event);
  }
  count(event: string) {
    return this.emits.filter((e) => e.event === event).length;
  }
  /** answer the most recent emit of `event` via its ack callback */
  ack(event: string, res: unknown = { ok: true }) {
    const e = this.last(event);
    if (!e) throw new Error(`no ${event} emitted`);
    const fn = e.args[e.args.length - 1];
    fn(res);
  }
}

class FakeEnv implements PageEnv {
  isHidden = false;
  isOnline = true;
  t = 0;
  listeners = new Map<string, ((e: Event) => void)[]>();
  hidden() {
    return this.isHidden;
  }
  online() {
    return this.isOnline;
  }
  now() {
    return Date.now();
  }
  listen(target: 'document' | 'window', event: string, fn: (e: Event) => void) {
    const k = `${target}:${event}`;
    this.listeners.set(k, [...(this.listeners.get(k) ?? []), fn]);
    return () => this.listeners.set(k, (this.listeners.get(k) ?? []).filter((f) => f !== fn));
  }
  dispatch(target: 'document' | 'window', event: string, extra: Record<string, unknown> = {}) {
    const e = Object.assign(new Event(event), extra);
    (this.listeners.get(`${target}:${event}`) ?? []).forEach((fn) => fn(e));
  }
  hide() {
    this.isHidden = true;
    this.dispatch('document', 'visibilitychange');
  }
  show() {
    this.isHidden = false;
    this.dispatch('document', 'visibilitychange');
  }
}

function setup(session: Session | null = { code: 'ABCD', token: 'tok' }) {
  const socket = new FakeSocket();
  const env = new FakeEnv();
  const statuses: ConnStatus[] = [];
  const invalid: string[] = [];
  const rejoined: number[] = [];
  let current = session;
  const keeper = new ConnectionKeeper(
    socket,
    {
      getSession: () => current,
      onStatus: (s) => statuses.push(s),
      onSessionInvalid: (code, err) => invalid.push(`${code}:${err}`),
      onRejoined: (_code, ms) => rejoined.push(ms)
    },
    env
  );
  keeper.start();
  return {
    socket,
    env,
    keeper,
    statuses,
    invalid,
    rejoined,
    setSession: (s: Session | null) => (current = s)
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(1_000_000);
});
afterEach(() => {
  vi.useRealTimers();
});

describe('ConnectionKeeper — (re)join', () => {
  it('reports connected immediately when there is no session', () => {
    const { socket, statuses } = setup(null);
    socket.serverConnect();
    expect(statuses).toEqual(['connected']);
    expect(socket.count('room:rejoin')).toBe(0);
    expect(socket.last('presence')?.args).toEqual(['visible']);
  });

  it('rejoins with the stored token BEFORE reporting connected, and waits for the fresh state', () => {
    const { socket, keeper, statuses } = setup();
    socket.serverConnect();
    expect(socket.last('room:rejoin')?.args.slice(0, 2)).toEqual(['ABCD', 'tok']);
    expect(statuses).toEqual([]); // still "connecting": UI must not change yet
    socket.ack('room:rejoin');
    expect(statuses).toEqual([]); // ack arrives before the state push
    keeper.notifyState();
    expect(statuses).toEqual(['connected']);
    expect(keeper.status).toBe('connected');
  });

  it('falls back to connected if the state never arrives after the ack', () => {
    const { socket, statuses } = setup();
    socket.serverConnect();
    socket.ack('room:rejoin');
    vi.advanceTimersByTime(TIMINGS.stateWaitMs);
    expect(statuses).toEqual(['connected']);
  });

  it('reports an invalid session (room gone) and still becomes connected', () => {
    const { socket, statuses, invalid } = setup();
    socket.serverConnect();
    socket.ack('room:rejoin', { ok: false, error: 'Room not found' });
    expect(invalid).toEqual(['ABCD:Room not found']);
    expect(statuses).toEqual(['connected']);
  });

  it('redials when the rejoin ack never comes', () => {
    const { socket } = setup();
    socket.serverConnect();
    vi.advanceTimersByTime(TIMINGS.rejoinAckMs);
    expect(socket.drops).toBe(1);
  });

  it('goes reconnecting on a drop and silently rejoins on the next connect', () => {
    const { socket, keeper, statuses, rejoined } = setup();
    socket.serverConnect();
    socket.ack('room:rejoin');
    keeper.notifyState();
    socket.serverDrop();
    expect(keeper.status).toBe('reconnecting');
    vi.advanceTimersByTime(700);
    socket.serverConnect();
    expect(socket.count('room:rejoin')).toBe(2);
    socket.ack('room:rejoin');
    keeper.notifyState();
    expect(statuses).toEqual(['connected', 'reconnecting', 'connected']);
    expect(rejoined).toEqual([700]);
  });

  it('ignores a stale ack from a previous connection', () => {
    const { socket, keeper, statuses } = setup();
    socket.serverConnect();
    const staleAck = socket.last('room:rejoin')!.args[2];
    socket.serverDrop();
    socket.serverConnect();
    staleAck({ ok: true });
    keeper.notifyState();
    expect(statuses).toEqual([]); // the new connection's rejoin hasn't been acked yet
  });

  it('kicks socket.io back into reconnecting after a server-initiated disconnect', () => {
    const { socket } = setup();
    socket.serverConnect();
    socket.serverDrop('io server disconnect');
    expect(socket.connects).toBe(1);
  });
});

describe('ConnectionKeeper — page visibility', () => {
  function ready() {
    const ctx = setup();
    ctx.socket.serverConnect();
    ctx.socket.ack('room:rejoin');
    ctx.keeper.notifyState();
    return ctx;
  }

  it('sends presence hidden on visibilitychange→hidden and pagehide (once)', () => {
    const { socket, env } = ready();
    env.hide();
    expect(socket.last('presence')?.args).toEqual(['hidden']);
    env.dispatch('window', 'pagehide');
    expect(socket.count('presence')).toBe(2); // visible (on ready) + hidden, no duplicate
  });

  it('on return: presence visible + liveness ping; a timely ack keeps the socket', () => {
    const { socket, env } = ready();
    env.hide();
    vi.advanceTimersByTime(5_000);
    env.show();
    expect(socket.last('presence')?.args).toEqual(['visible']);
    expect(socket.count('net:ping')).toBe(1);
    socket.ack('net:ping');
    vi.advanceTimersByTime(TIMINGS.pingAckMs + 10);
    expect(socket.drops).toBe(0);
  });

  it('forces a reconnect when the ping is not acked within 2s (zombie socket after resume)', () => {
    const { socket, env } = ready();
    env.hide();
    vi.advanceTimersByTime(5_000);
    env.show();
    vi.advanceTimersByTime(TIMINGS.pingAckMs - 1);
    expect(socket.drops).toBe(0);
    vi.advanceTimersByTime(1);
    expect(socket.drops).toBe(1);
  });

  it('redials immediately (no ping) after a long time hidden', () => {
    const { socket, env } = ready();
    env.hide();
    vi.advanceTimersByTime(TIMINGS.longHiddenMs + 1);
    env.show();
    expect(socket.drops).toBe(1);
    expect(socket.count('net:ping')).toBe(0);
  });

  it('redials right away when returning to a dead socket instead of waiting for backoff', () => {
    const { socket, env } = ready();
    env.hide();
    socket.serverDrop();
    env.show();
    expect(socket.redials).toBe(1);
  });

  it('bfcache restore (pageshow persisted) always redials', () => {
    const { socket, env } = ready();
    env.dispatch('window', 'pageshow', { persisted: true });
    expect(socket.drops).toBe(1);
  });

  it('online / focus trigger a (throttled) check', () => {
    const { socket, env } = ready();
    env.dispatch('window', 'online');
    env.dispatch('window', 'focus');
    expect(socket.count('net:ping')).toBe(1); // one in flight at a time
    socket.ack('net:ping');
    vi.advanceTimersByTime(TIMINGS.checkThrottleMs);
    env.dispatch('window', 'focus');
    expect(socket.count('net:ping')).toBe(2);
  });

  it('does nothing while offline; the online event resumes', () => {
    const { socket, env } = ready();
    socket.serverDrop();
    env.isOnline = false;
    env.dispatch('window', 'focus');
    expect(socket.redials).toBe(0);
    env.isOnline = true;
    env.dispatch('window', 'online');
    expect(socket.redials).toBe(1);
  });

  it('reports the real visibility after a reconnect that happened in the background', () => {
    const { socket, env, keeper } = ready();
    env.hide();
    socket.serverDrop();
    socket.serverConnect();
    socket.ack('room:rejoin');
    keeper.notifyState();
    expect(socket.last('presence')?.args).toEqual(['hidden']);
  });

  it('does not send presence while disconnected', () => {
    const { socket, env } = ready();
    socket.serverDrop();
    const before = socket.count('presence');
    env.hide();
    expect(socket.count('presence')).toBe(before);
  });
});
