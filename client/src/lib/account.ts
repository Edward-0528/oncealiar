/**
 * Optional accounts (Supabase email sign-in) + the Party Pass purchase.
 *
 * Guest play never touches this. The server tells us at `/api/config` whether accounts
 * and purchases are switched on; when they aren't, the UI hides every account control.
 *
 * Sign-in talks to Supabase Auth's REST API directly (no SDK): we email a one-time code
 * (and a magic link, which lands back here with the session in the URL hash).
 */
import { SERVER_ORIGIN } from './serverUrl';

export interface ServerConfig {
  accounts: boolean;
  purchase: boolean;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  priceLabel?: string;
}

export interface AccountSession {
  accessToken: string;
  refreshToken: string;
  /** unix seconds */
  expiresAt: number;
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

export interface MeInfo {
  email: string;
  premium: boolean;
  history: HistoryRow[];
}

const KEY = 'oal:account';
const OFF: ServerConfig = { accounts: false, purchase: false };

type Fetch = typeof fetch;

const store = {
  get(): AccountSession | null {
    try {
      const raw = localStorage.getItem(KEY);
      const s = raw ? (JSON.parse(raw) as AccountSession) : null;
      return s && s.accessToken && s.refreshToken ? s : null;
    } catch {
      return null;
    }
  },
  set(s: AccountSession | null) {
    try {
      if (s) localStorage.setItem(KEY, JSON.stringify(s));
      else localStorage.removeItem(KEY);
    } catch {
      // private mode: the session just won't survive a reload
    }
  }
};

export function emailLooksValid(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
}

/** Supabase sends 6–8 digit codes depending on project settings. */
export function normalizeOtp(v: string): string {
  return v.replace(/\D/g, '').slice(0, 8);
}

interface RawSession {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  expires_in?: number;
  user?: { email?: string };
}

function toSession(raw: RawSession, fallbackEmail = '', nowSec = Math.floor(Date.now() / 1000)): AccountSession | null {
  if (!raw.access_token || !raw.refresh_token) return null;
  return {
    accessToken: raw.access_token,
    refreshToken: raw.refresh_token,
    expiresAt: raw.expires_at ?? nowSec + (raw.expires_in ?? 3600),
    email: raw.user?.email ?? fallbackEmail
  };
}

/** `#access_token=…&refresh_token=…` left by a magic link. Pure: returns null when there is none. */
export function sessionFromHash(hash: string, nowSec = Math.floor(Date.now() / 1000)): AccountSession | null {
  if (!hash.includes('access_token=')) return null;
  const p = new URLSearchParams(hash.replace(/^#/, ''));
  const exp = Number(p.get('expires_at'));
  return toSession(
    {
      access_token: p.get('access_token') ?? undefined,
      refresh_token: p.get('refresh_token') ?? undefined,
      expires_at: Number.isFinite(exp) && exp > 0 ? exp : undefined,
      expires_in: Number(p.get('expires_in')) || undefined
    },
    '',
    nowSec
  );
}

export class AccountClient {
  private config: ServerConfig = OFF;
  private session: AccountSession | null = store.get();
  private me: MeInfo | null = null;
  private listeners = new Set<() => void>();
  private version = 0;
  private loaded: Promise<void> | null = null;

  constructor(
    private f: Fetch = (...a) => fetch(...a),
    private origin = SERVER_ORIGIN
  ) {}

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => void this.listeners.delete(fn);
  };
  /** changes whenever anything observable changes (for useSyncExternalStore) */
  getVersion = () => this.version;
  private emit() {
    this.version++;
    for (const l of this.listeners) l();
  }

  getConfig = () => this.config;
  getSession = () => this.session;
  getMe = () => this.me;
  get enabled() {
    return this.config.accounts;
  }

  /** Fetch server config once, pick up a magic-link session, refresh/restore the signed-in state. */
  init(hash = typeof window !== 'undefined' ? window.location.hash : ''): Promise<void> {
    if (this.loaded) return this.loaded;
    this.loaded = (async () => {
      try {
        const res = await this.f(`${this.origin}/api/config`);
        if (res.ok) this.config = { ...OFF, ...((await res.json()) as ServerConfig) };
      } catch {
        this.config = OFF;
      }
      if (!this.config.accounts) {
        this.emit();
        return;
      }
      const fromLink = sessionFromHash(hash);
      if (fromLink) {
        this.session = fromLink;
        store.set(fromLink);
        try {
          history.replaceState(null, '', window.location.pathname + window.location.search);
        } catch {
          // ignore
        }
      }
      this.emit();
      if (this.session) await this.refreshMe();
    })();
    return this.loaded;
  }

  private authHeaders() {
    return { apikey: this.config.supabaseAnonKey ?? '', 'Content-Type': 'application/json' };
  }

  async sendCode(email: string): Promise<{ ok: true } | { ok: false; error: string }> {
    if (!this.config.accounts || !this.config.supabaseUrl) return { ok: false, error: 'Accounts are not available right now' };
    if (!emailLooksValid(email)) return { ok: false, error: 'Enter a valid email address' };
    try {
      const redirect = encodeURIComponent(`${window.location.origin}/start`);
      const res = await this.f(`${this.config.supabaseUrl}/auth/v1/otp?redirect_to=${redirect}`, {
        method: 'POST',
        headers: this.authHeaders(),
        body: JSON.stringify({ email: email.trim(), create_user: true })
      });
      if (res.ok) return { ok: true };
      const body = (await res.json().catch(() => ({}))) as { msg?: string; error_description?: string };
      return { ok: false, error: res.status === 429 ? 'Too many tries. Wait a minute and try again.' : (body.msg ?? body.error_description ?? 'Could not send the code') };
    } catch {
      return { ok: false, error: 'Could not reach the server. Check your connection.' };
    }
  }

  async verifyCode(email: string, code: string): Promise<{ ok: true } | { ok: false; error: string }> {
    if (!this.config.supabaseUrl) return { ok: false, error: 'Accounts are not available right now' };
    const token = normalizeOtp(code);
    if (token.length < 6) return { ok: false, error: 'Enter the code from the email' };
    try {
      const res = await this.f(`${this.config.supabaseUrl}/auth/v1/verify`, {
        method: 'POST',
        headers: this.authHeaders(),
        body: JSON.stringify({ type: 'email', email: email.trim(), token })
      });
      const body = (await res.json().catch(() => ({}))) as RawSession & { msg?: string };
      const s = res.ok ? toSession(body, email.trim()) : null;
      if (!s) return { ok: false, error: 'That code didn’t work. It may have expired: send a new one.' };
      this.session = s;
      store.set(s);
      this.emit();
      await this.refreshMe();
      return { ok: true };
    } catch {
      return { ok: false, error: 'Could not reach the server. Check your connection.' };
    }
  }

  signOut() {
    this.session = null;
    this.me = null;
    store.set(null);
    this.emit();
  }

  /** A token that is good for at least a minute, refreshing if needed. null = signed out. */
  async getToken(nowSec = Math.floor(Date.now() / 1000)): Promise<string | null> {
    const s = this.session;
    if (!s) return null;
    if (s.expiresAt - nowSec > 60) return s.accessToken;
    if (!this.config.supabaseUrl) return null;
    try {
      const res = await this.f(`${this.config.supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: this.authHeaders(),
        body: JSON.stringify({ refresh_token: s.refreshToken })
      });
      if (res.status === 400 || res.status === 401) {
        // the refresh token is dead: sign out instead of retrying forever
        this.signOut();
        return null;
      }
      const next = res.ok ? toSession((await res.json()) as RawSession, s.email, nowSec) : null;
      if (!next) return s.expiresAt > nowSec ? s.accessToken : null;
      this.session = next;
      store.set(next);
      return next.accessToken;
    } catch {
      return s.expiresAt > nowSec ? s.accessToken : null;
    }
  }

  async refreshMe(): Promise<MeInfo | null> {
    const token = await this.getToken();
    if (!token) return null;
    try {
      const res = await this.f(`${this.origin}/api/me`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401) {
        this.signOut();
        return null;
      }
      if (!res.ok) return this.me;
      const data = (await res.json()) as MeInfo;
      this.me = { email: data.email, premium: !!data.premium, history: data.history ?? [] };
      this.emit();
      return this.me;
    } catch {
      return this.me;
    }
  }

  /** Start Stripe Checkout; returns the hosted page URL to navigate to. */
  async checkout(): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
    const token = await this.getToken();
    if (!token) return { ok: false, error: 'Sign in first' };
    try {
      const res = await this.f(`${this.origin}/api/checkout`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (res.ok && data.url) return { ok: true, url: data.url };
      return { ok: false, error: data.error ?? 'Could not start checkout' };
    } catch {
      return { ok: false, error: 'Could not reach the server. Check your connection.' };
    }
  }
}

/** one shared client for the app */
export const accountClient = new AccountClient();
