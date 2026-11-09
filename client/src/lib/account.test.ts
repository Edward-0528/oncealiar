// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { AccountClient, emailLooksValid, normalizeOtp, sessionFromHash } from './account';

const CONFIG = { accounts: true, purchase: true, supabaseUrl: 'https://x.supabase.co', supabaseAnonKey: 'anon', priceLabel: '$14.99' };

type Call = { url: string; init?: RequestInit };
function mkFetch(routes: Record<string, (init?: RequestInit) => { status?: number; body?: unknown }>) {
  const calls: Call[] = [];
  const f = (async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    const key = Object.keys(routes).find((k) => url.includes(k));
    const r = key ? routes[key](init) : { status: 404, body: {} };
    const status = r.status ?? 200;
    return { ok: status < 400, status, json: async () => r.body } as Response;
  }) as unknown as typeof fetch;
  return { f, calls };
}

beforeEach(() => localStorage.clear());

describe('helpers', () => {
  it('validates emails and codes', () => {
    expect(emailLooksValid('a@b.co')).toBe(true);
    expect(emailLooksValid('a@b')).toBe(false);
    expect(normalizeOtp(' 12 34-56 ')).toBe('123456');
  });
  it('reads a magic-link session from the hash', () => {
    const s = sessionFromHash('#access_token=AT&refresh_token=RT&expires_in=3600&type=magiclink', 1000);
    expect(s).toMatchObject({ accessToken: 'AT', refreshToken: 'RT', expiresAt: 4600 });
    expect(sessionFromHash('#foo=bar')).toBeNull();
  });
});

describe('AccountClient', () => {
  const base = { '/api/config': () => ({ body: CONFIG }) };

  it('stays off when the server has no accounts', async () => {
    const { f } = mkFetch({ '/api/config': () => ({ body: { accounts: false, purchase: false } }) });
    const c = new AccountClient(f, '');
    await c.init('');
    expect(c.enabled).toBe(false);
  });
  it('stays off when the server is unreachable', async () => {
    const c = new AccountClient((async () => {
      throw new Error('down');
    }) as unknown as typeof fetch, '');
    await c.init('');
    expect(c.enabled).toBe(false);
  });

  it('signs in with an emailed code and loads the account', async () => {
    const { f, calls } = mkFetch({
      ...base,
      '/auth/v1/otp': () => ({ body: {} }),
      '/auth/v1/verify': () => ({ body: { access_token: 'AT', refresh_token: 'RT', expires_in: 3600, user: { email: 'a@b.co' } } }),
      '/api/me': () => ({ body: { ok: true, email: 'a@b.co', premium: true, history: [] } })
    });
    const c = new AccountClient(f, '');
    await c.init('');
    expect(await c.sendCode('nope')).toMatchObject({ ok: false });
    expect(await c.sendCode('a@b.co')).toEqual({ ok: true });
    expect(await c.verifyCode('a@b.co', '12')).toMatchObject({ ok: false });
    expect(await c.verifyCode('a@b.co', '123456')).toEqual({ ok: true });
    expect(c.getSession()?.email).toBe('a@b.co');
    expect(c.getMe()?.premium).toBe(true);
    expect(JSON.parse(String(calls.find((x) => x.url.includes('/verify'))?.init?.body))).toMatchObject({ type: 'email', token: '123456' });
    // survives a reload
    expect(new AccountClient(f, '').getSession()?.accessToken).toBe('AT');
    c.signOut();
    expect(c.getSession()).toBeNull();
    expect(new AccountClient(f, '').getSession()).toBeNull();
  });

  it('reports a wrong code and rate limits', async () => {
    const { f } = mkFetch({ ...base, '/auth/v1/verify': () => ({ status: 403, body: { msg: 'expired' } }), '/auth/v1/otp': () => ({ status: 429, body: {} }) });
    const c = new AccountClient(f, '');
    await c.init('');
    expect((await c.verifyCode('a@b.co', '123456')).ok).toBe(false);
    const r = await c.sendCode('a@b.co');
    expect(r.ok === false && r.error).toMatch(/Too many/);
    expect(c.getSession()).toBeNull();
  });

  it('refreshes an expiring token, and signs out when the refresh token is dead', async () => {
    localStorage.setItem('oal:account', JSON.stringify({ accessToken: 'old', refreshToken: 'RT', expiresAt: 100, email: 'a@b.co' }));
    let dead = false;
    const { f } = mkFetch({
      ...base,
      '/auth/v1/token': () => (dead ? { status: 400, body: {} } : { body: { access_token: 'new', refresh_token: 'RT2', expires_in: 3600 } }),
      '/api/me': () => ({ body: { ok: true, email: 'a@b.co', premium: false, history: [] } })
    });
    const c = new AccountClient(f, '');
    await c.init('');
    expect(await c.getToken(1000)).toBe('new');
    expect(await c.getToken(1000)).toBe('new'); // fresh: no second refresh
    dead = true;
    localStorage.setItem('oal:account', JSON.stringify({ accessToken: 'old', refreshToken: 'gone', expiresAt: 100, email: 'a@b.co' }));
    const c2 = new AccountClient(f, '');
    await c2.init('');
    expect(await c2.getToken(1000)).toBeNull();
    expect(c2.getSession()).toBeNull();
  });

  it('starts checkout with the bearer token', async () => {
    localStorage.setItem('oal:account', JSON.stringify({ accessToken: 'AT', refreshToken: 'RT', expiresAt: 9e9, email: 'a@b.co' }));
    const { f, calls } = mkFetch({ ...base, '/api/me': () => ({ body: { ok: true, email: 'a@b.co', premium: false, history: [] } }), '/api/checkout': () => ({ body: { ok: true, url: 'https://checkout.stripe.com/x' } }) });
    const c = new AccountClient(f, '');
    await c.init('');
    expect(await c.checkout()).toEqual({ ok: true, url: 'https://checkout.stripe.com/x' });
    expect((calls.find((x) => x.url.includes('/api/checkout'))?.init?.headers as Record<string, string>).Authorization).toBe('Bearer AT');
  });
});
