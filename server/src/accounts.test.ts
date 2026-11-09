import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';
import { createAccounts, verifyStripeSignature, accountsConfigFromEnv, bearer, type AccountsConfig } from './accounts.js';

const cfg: AccountsConfig = {
  supabaseUrl: 'https://x.supabase.co',
  supabaseAnonKey: 'anon',
  supabaseServiceKey: 'service',
  stripeSecretKey: 'sk_test_1',
  stripePriceId: 'price_1',
  stripeWebhookSecret: 'whsec_1',
  clientUrl: 'https://game.example'
};

const sign = (body: string, secret = 'whsec_1', t = Math.floor(Date.now() / 1000)) =>
  `t=${t},v1=${crypto.createHmac('sha256', secret).update(`${t}.${body}`).digest('hex')}`;

type Call = { url: string; init?: RequestInit };
function fakeFetch(responder: (c: Call) => unknown, status = 200) {
  const calls: Call[] = [];
  const f = (async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    const out = responder({ url, init });
    return { ok: status < 400, status, json: async () => out } as Response;
  }) as unknown as typeof fetch;
  return { f, calls };
}

describe('verifyStripeSignature', () => {
  const body = Buffer.from('{"a":1}');
  it('accepts a valid signature', () => expect(verifyStripeSignature(body, sign('{"a":1}'), 'whsec_1')).toBe(true));
  it('rejects a wrong secret, tampered body, missing header and stale timestamp', () => {
    expect(verifyStripeSignature(body, sign('{"a":1}', 'other'), 'whsec_1')).toBe(false);
    expect(verifyStripeSignature(Buffer.from('{"a":2}'), sign('{"a":1}'), 'whsec_1')).toBe(false);
    expect(verifyStripeSignature(body, undefined, 'whsec_1')).toBe(false);
    expect(verifyStripeSignature(body, sign('{"a":1}', 'whsec_1', 1000), 'whsec_1')).toBe(false);
  });
});

describe('accounts config', () => {
  it('is off unless all three Supabase values are set', () => {
    expect(accountsConfigFromEnv({ SUPABASE_URL: 'https://x.supabase.co' })).toBeNull();
    const c = accountsConfigFromEnv({ SUPABASE_URL: 'https://x.supabase.co/', SUPABASE_ANON_KEY: 'a', SUPABASE_SERVICE_KEY: 's', CLIENT_ORIGIN: 'https://g.example/' });
    expect(c?.supabaseUrl).toBe('https://x.supabase.co');
    expect(c?.clientUrl).toBe('https://g.example');
  });
  it('parses bearer headers', () => {
    expect(bearer('Bearer abc')).toBe('abc');
    expect(bearer('nope')).toBeNull();
  });
});

describe('verifyToken / hasPremium', () => {
  it('returns the user for a valid token and caches it', async () => {
    const { f, calls } = fakeFetch(() => ({ id: 'u1', email: 'a@b.co' }));
    const a = createAccounts(cfg, f);
    const token = 't'.repeat(40);
    expect(await a.verifyToken(token)).toEqual({ id: 'u1', email: 'a@b.co' });
    await a.verifyToken(token);
    expect(calls).toHaveLength(1);
  });
  it('rejects junk and failed lookups', async () => {
    const a = createAccounts(cfg, fakeFetch(() => ({}), 401).f);
    expect(await a.verifyToken('short')).toBeNull();
    expect(await a.verifyToken(42)).toBeNull();
    expect(await a.verifyToken('t'.repeat(40))).toBeNull();
  });
  it('hasPremium reads entitlements', async () => {
    expect(await createAccounts(cfg, fakeFetch(() => [{ id: 'e' }]).f).hasPremium('u1')).toBe(true);
    expect(await createAccounts(cfg, fakeFetch(() => []).f).hasPremium('u1')).toBe(false);
  });
});

describe('checkout', () => {
  it('creates a Stripe session tied to the user', async () => {
    const { f, calls } = fakeFetch(() => ({ url: 'https://checkout.stripe.com/c/1' }));
    const url = await createAccounts(cfg, f).createCheckout({ id: 'u1', email: 'a@b.co' });
    expect(url).toBe('https://checkout.stripe.com/c/1');
    const body = new URLSearchParams(String(calls[0].init?.body));
    expect(body.get('client_reference_id')).toBe('u1');
    expect(body.get('line_items[0][price]')).toBe('price_1');
    expect(body.get('success_url')).toBe('https://game.example/start?purchase=success');
  });
  it('is off without Stripe config', async () => {
    const a = createAccounts({ ...cfg, stripeSecretKey: undefined }, fakeFetch(() => ({})).f);
    expect(a.publicConfig().purchase).toBe(false);
    await expect(a.createCheckout({ id: 'u', email: '' })).rejects.toThrow();
  });
});

describe('stripe webhook', () => {
  const event = (type: string, object: object) => JSON.stringify({ type, data: { object } });
  const send = (a: ReturnType<typeof createAccounts>, body: string, header = sign(body)) => a.handleStripeWebhook(Buffer.from(body), header);

  it('rejects a bad signature', async () => {
    const a = createAccounts(cfg, fakeFetch(() => ({})).f);
    expect((await send(a, event('checkout.session.completed', {}), 't=1,v1=00')).status).toBe(400);
  });
  it('grants the entitlement for a paid checkout', async () => {
    const { f, calls } = fakeFetch(() => ({}));
    const a = createAccounts(cfg, f);
    const out = await send(a, event('checkout.session.completed', { id: 'cs_1', client_reference_id: 'u1', payment_status: 'paid', payment_intent: 'pi_1' }));
    expect(out).toEqual({ status: 200, message: 'granted' });
    expect(calls[0].url).toContain('/rest/v1/oal_entitlements');
    expect(JSON.parse(String(calls[0].init?.body))).toMatchObject({ user_id: 'u1', stripe_session_id: 'cs_1', stripe_payment_intent: 'pi_1' });
  });
  it('ignores unpaid sessions', async () => {
    const { f, calls } = fakeFetch(() => ({}));
    const out = await send(createAccounts(cfg, f), event('checkout.session.completed', { id: 'cs_1', client_reference_id: 'u1', payment_status: 'unpaid' }));
    expect(out.message).toBe('ignored');
    expect(calls).toHaveLength(0);
  });
  it('asks Stripe to retry when saving fails', async () => {
    const out = await send(createAccounts(cfg, fakeFetch(() => ({}), 500).f), event('checkout.session.completed', { id: 'cs_1', client_reference_id: 'u1', payment_status: 'paid' }));
    expect(out.status).toBe(500);
  });
  it('revokes on refund', async () => {
    const { f, calls } = fakeFetch(() => ({}));
    const out = await send(createAccounts(cfg, f), event('charge.refunded', { payment_intent: 'pi_1' }));
    expect(out.message).toBe('revoked');
    expect(calls[0].init?.method).toBe('DELETE');
    expect(calls[0].url).toContain('stripe_payment_intent=eq.pi_1');
  });
});
