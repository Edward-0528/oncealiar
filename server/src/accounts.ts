/**
 * Accounts + purchases. Everything here is optional: with no env configured the
 * game runs exactly as before (guests only, unlock codes).
 *
 *  - Auth: Supabase Auth (email one-time code / magic link). The server only ever
 *    *verifies* a user's access token; sign-in itself happens client → Supabase.
 *  - Party Pass: one-time Stripe Checkout payment. The webhook records an
 *    entitlement row; a signed-in host with an entitlement unlocks premium rooms.
 *  - History: one row per signed-in player when a game finishes.
 *
 * No SDKs: plain `fetch` against the Supabase REST API and the Stripe API.
 */
import crypto from 'node:crypto';

export interface AccountsConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceKey: string;
  stripeSecretKey?: string;
  /** Stripe Price id of the Party Pass (price_...) */
  stripePriceId?: string;
  stripeWebhookSecret?: string;
  /** public URL of the client, for Checkout redirects (no trailing slash) */
  clientUrl?: string;
}

export interface AccountUser {
  id: string;
  email: string;
}

export interface HistoryRow {
  room_code: string;
  played_at: string;
  players: number;
  rounds: number;
  score: number;
  rank: number;
  won: boolean;
}

export interface GameRecord {
  roomCode: string;
  players: number;
  rounds: number;
  score: number;
  rank: number;
  won: boolean;
}

export interface Accounts {
  readonly config: AccountsConfig;
  /** what the client may know: which features exist, plus the public Supabase values */
  publicConfig(): { accounts: boolean; purchase: boolean; supabaseUrl: string; supabaseAnonKey: string; priceLabel: string };
  verifyToken(token: unknown): Promise<AccountUser | null>;
  hasPremium(userId: string): Promise<boolean>;
  createCheckout(user: AccountUser): Promise<string>;
  handleStripeWebhook(rawBody: Buffer, signature: string | undefined, now?: number): Promise<{ status: number; message: string }>;
  recordGame(userId: string, rec: GameRecord): Promise<void>;
  history(userId: string, limit?: number): Promise<HistoryRow[]>;
}

type Fetch = typeof fetch;

export function accountsConfigFromEnv(env: NodeJS.ProcessEnv = process.env): AccountsConfig | null {
  const supabaseUrl = env.SUPABASE_URL?.trim().replace(/\/+$/, '');
  const supabaseAnonKey = env.SUPABASE_ANON_KEY?.trim();
  const supabaseServiceKey = env.SUPABASE_SERVICE_KEY?.trim();
  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) return null;
  return {
    supabaseUrl,
    supabaseAnonKey,
    supabaseServiceKey,
    stripeSecretKey: env.STRIPE_SECRET_KEY?.trim() || undefined,
    stripePriceId: env.STRIPE_PRICE_ID?.trim() || undefined,
    stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET?.trim() || undefined,
    clientUrl: (env.CLIENT_URL ?? env.CLIENT_ORIGIN?.split(',')[0])?.trim().replace(/\/+$/, '') || undefined
  };
}

/** Verify a `Stripe-Signature` header (t=…,v1=…) over `${t}.${body}`. Exported for tests. */
export function verifyStripeSignature(rawBody: Buffer, header: string | undefined, secret: string, now = Date.now(), toleranceSec = 300): boolean {
  if (!header) return false;
  const parts = header.split(',').map((p) => p.trim().split('='));
  const t = parts.find(([k]) => k === 't')?.[1];
  const sigs = parts.filter(([k]) => k === 'v1').map(([, v]) => v);
  if (!t || sigs.length === 0) return false;
  if (Math.abs(now / 1000 - Number(t)) > toleranceSec) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${t}.`).update(rawBody).digest();
  return sigs.some((s) => {
    const got = Buffer.from(s, 'hex');
    return got.length === expected.length && crypto.timingSafeEqual(got, expected);
  });
}

export function createAccounts(config: AccountsConfig, fetchImpl: Fetch = fetch): Accounts {
  const sb = (path: string, init: RequestInit = {}) =>
    fetchImpl(`${config.supabaseUrl}${path}`, {
      ...init,
      headers: {
        apikey: config.supabaseServiceKey,
        Authorization: `Bearer ${config.supabaseServiceKey}`,
        'Content-Type': 'application/json',
        ...(init.headers as Record<string, string> | undefined)
      }
    });
  const purchaseOn = !!(config.stripeSecretKey && config.stripePriceId && config.stripeWebhookSecret && config.clientUrl);

  // short caches keep a busy lobby from hammering Supabase
  const tokenCache = new Map<string, { user: AccountUser; until: number }>();
  const premiumCache = new Map<string, { value: boolean; until: number }>();

  return {
    config,
    publicConfig: () => ({
      accounts: true,
      purchase: purchaseOn,
      supabaseUrl: config.supabaseUrl,
      supabaseAnonKey: config.supabaseAnonKey,
      priceLabel: '$14.99'
    }),

    async verifyToken(token) {
      if (typeof token !== 'string' || token.length < 20 || token.length > 4096) return null;
      const hit = tokenCache.get(token);
      if (hit && hit.until > Date.now()) return hit.user;
      try {
        const res = await fetchImpl(`${config.supabaseUrl}/auth/v1/user`, {
          headers: { apikey: config.supabaseAnonKey, Authorization: `Bearer ${token}` }
        });
        if (!res.ok) return null;
        const u = (await res.json()) as { id?: string; email?: string };
        if (!u.id) return null;
        const user = { id: u.id, email: u.email ?? '' };
        tokenCache.set(token, { user, until: Date.now() + 60_000 });
        if (tokenCache.size > 500) tokenCache.clear();
        return user;
      } catch {
        return null;
      }
    },

    async hasPremium(userId) {
      const hit = premiumCache.get(userId);
      if (hit && hit.until > Date.now()) return hit.value;
      try {
        const res = await sb(`/rest/v1/oal_entitlements?select=id&user_id=eq.${encodeURIComponent(userId)}&limit=1`);
        if (!res.ok) return false;
        const rows = (await res.json()) as unknown[];
        const value = rows.length > 0;
        premiumCache.set(userId, { value, until: Date.now() + 30_000 });
        return value;
      } catch {
        return false;
      }
    },

    async createCheckout(user) {
      if (!purchaseOn) throw new Error('Purchases are not set up yet');
      const body = new URLSearchParams({
        mode: 'payment',
        'line_items[0][price]': config.stripePriceId!,
        'line_items[0][quantity]': '1',
        client_reference_id: user.id,
        success_url: `${config.clientUrl}/start?purchase=success`,
        cancel_url: `${config.clientUrl}/start?purchase=cancelled`
      });
      if (user.email) body.set('customer_email', user.email);
      const res = await fetchImpl('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${config.stripeSecretKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body
      });
      const data = (await res.json()) as { url?: string; error?: { message?: string } };
      if (!res.ok || !data.url) throw new Error(data.error?.message ?? 'Could not start checkout');
      return data.url;
    },

    async handleStripeWebhook(rawBody, signature, now = Date.now()) {
      if (!config.stripeWebhookSecret) return { status: 503, message: 'webhook not configured' };
      if (!verifyStripeSignature(rawBody, signature, config.stripeWebhookSecret, now)) return { status: 400, message: 'bad signature' };
      let event: { type?: string; data?: { object?: Record<string, unknown> } };
      try {
        event = JSON.parse(rawBody.toString('utf8'));
      } catch {
        return { status: 400, message: 'bad json' };
      }
      const obj = event.data?.object ?? {};
      if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
        const userId = typeof obj.client_reference_id === 'string' ? obj.client_reference_id : '';
        if (!userId || obj.payment_status !== 'paid') return { status: 200, message: 'ignored' };
        const res = await sb('/rest/v1/oal_entitlements?on_conflict=stripe_session_id', {
          method: 'POST',
          headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
          body: JSON.stringify({
            user_id: userId,
            kind: 'party_pass',
            stripe_session_id: String(obj.id),
            stripe_payment_intent: typeof obj.payment_intent === 'string' ? obj.payment_intent : null
          })
        });
        // 5xx makes Stripe retry the delivery
        if (!res.ok) return { status: 500, message: 'could not save entitlement' };
        premiumCache.delete(userId);
        return { status: 200, message: 'granted' };
      }
      if (event.type === 'charge.refunded') {
        const pi = typeof obj.payment_intent === 'string' ? obj.payment_intent : '';
        if (!pi) return { status: 200, message: 'ignored' };
        const res = await sb(`/rest/v1/oal_entitlements?stripe_payment_intent=eq.${encodeURIComponent(pi)}`, { method: 'DELETE' });
        if (!res.ok) return { status: 500, message: 'could not revoke' };
        premiumCache.clear();
        return { status: 200, message: 'revoked' };
      }
      return { status: 200, message: 'ignored' };
    },

    async recordGame(userId, rec) {
      try {
        await sb('/rest/v1/oal_history', {
          method: 'POST',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({
            user_id: userId,
            room_code: rec.roomCode,
            players: rec.players,
            rounds: rec.rounds,
            score: rec.score,
            rank: rec.rank,
            won: rec.won
          })
        });
      } catch {
        // history is a nicety: never break a game over it
      }
    },

    async history(userId, limit = 20) {
      try {
        const res = await sb(
          `/rest/v1/oal_history?select=room_code,played_at,players,rounds,score,rank,won&user_id=eq.${encodeURIComponent(userId)}&order=played_at.desc&limit=${limit}`
        );
        return res.ok ? ((await res.json()) as HistoryRow[]) : [];
      } catch {
        return [];
      }
    }
  };
}

export const bearer = (header: string | undefined): string | null => {
  const m = /^Bearer\s+(.+)$/i.exec(header ?? '');
  return m ? m[1] : null;
};
