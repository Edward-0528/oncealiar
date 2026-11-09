# Accounts and the Party Pass: setup

Everything here is **optional**. With none of these env vars set the game behaves exactly as before: guests only, hosts unlock premium with `PREMIUM_CODES`.

## What it does

- **Sign in (optional):** email one-time code or magic link via Supabase Auth. Guests never need it.
- **Party Pass:** one-time Stripe Checkout payment tied to the signed-in account. Whenever that account hosts a room, the room unlocks premium automatically (`account:link` in `server/src/rooms.ts`). Guests in the room play premium content for free.
- **History:** when a game ends, each signed-in player gets a row (rank, score, players, rounds) shown under Account.
- Refunds: the `charge.refunded` webhook removes the entitlement.

Code: `server/src/accounts.ts` (Supabase REST + Stripe over `fetch`, no SDKs), routes in `server/src/app.ts` (`/api/config`, `/api/checkout`, `/api/me`, `/api/stripe/webhook`), client in `client/src/lib/account.ts` and `client/src/components/AccountSheet.tsx`.

## 1. Supabase

1. Create a project (a dedicated one for this game is cleanest).
2. Run `supabase/migrations/20261109_accounts.sql` in the SQL editor. It creates `oal_entitlements` and `oal_history` with row-level security (users can only read their own rows; the server writes with the service key).
3. Authentication → URL Configuration: set **Site URL** to the client URL and add `https://<client>/start` to **Redirect URLs**.
4. Authentication → Email Templates → **Magic Link**: add the code to the body so people can type it instead of tapping the link, e.g. `Your Once a Liar code: {{ .Token }}`. (The link works without this; the code field just won't have anything to enter.)
5. Supabase's built-in email sender is heavily rate limited; add custom SMTP (Resend, Postmark) before launch.
6. Server env: `SUPABASE_URL`, `SUPABASE_ANON_KEY` (publishable), `SUPABASE_SERVICE_KEY` (secret, server only, never in the client).

## 2. Stripe

1. Create a product "Party Pass", one-time price (default label in the UI is `$14.99`; edit `priceLabel` in `accounts.ts` if you choose another).
2. Developers → Webhooks → add endpoint `https://<server>/api/stripe/webhook` with events `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `charge.refunded`.
3. Server env: `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID` (`price_...`), `STRIPE_WEBHOOK_SECRET` (`whsec_...`), `CLIENT_URL`.
4. Test with Stripe's test mode keys and card `4242 4242 4242 4242` first.

Taxes: unlike a merchant of record, you are the seller. Turn on Stripe Tax and register where required before selling widely (see `docs/monetization.md` §4).

## Local testing

`npm run dev` with the env vars above exported for the server. The Vite dev server proxies `/api` to port 3001. `stripe listen --forward-to localhost:3001/api/stripe/webhook` gives a local webhook secret.
