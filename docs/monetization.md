# Once a Liar — Monetization Plan

*Owner: growth / monetization · Drafted November 2026 · Status: recommendation, not yet implemented*

> **TL;DR** — **Host pays, everyone plays.** The base game (Starter + House Party packs, 3–12 players) stays free forever with no ads. One person — the host — can unlock premium packs with a **one-time purchase ($3.99 per pack)** or the **Party Pass ($14.99 one-time, lifetime: every current and future pack + all visual themes)**. Guests never pay, never sign up, never install anything. Payments run through **Lemon Squeezy** (merchant of record, handles global VAT/sales tax, issues license keys) → the host enters a license key → the Socket.IO server validates it and marks the room premium. Running cost is roughly **$15–25/month**; break-even is about **2 Party Passes or 6 packs a month**.

All third-party figures below are cited. Anything marked **(estimate)** is my own assumption and not a measured number.

---

## 1. Why "host pays, everyone plays"

| Principle | Why it fits Once a Liar |
|---|---|
| **Only the host has buying intent.** | At a party, one person is setting up the game; everyone else just wants to scan the QR and play. Asking 8 guests to pay or sign in is how you lose the room. |
| **Proven in the category.** | Jackbox's own help page says only one person in the group needs to own the game to host it, and players join at jackbox.tv with a room code, no purchase or app needed ([Jackbox — How to Play](https://www.jackboxgames.com/how-to-play)). Players already understand this model. |
| **Guests are the marketing.** | Every guest experiences the game for free. Some of them will host their own party next. Paywalling guests would kill the viral loop (see `marketing-plan.md`). |
| **Cheap relative to alternatives.** | A Jackbox Party Pack lists at about $29.99 ([Deku Deals](https://www.dekudeals.com/items/the-jackbox-party-pack-11); [SteamDB](https://steamdb.info/sub/1190565)). The physical *The Chameleon* by Big Potato retails for about $17–20 in the US ([Walmart](https://www.walmart.com/ip/14146606026), [Hobby Lobby](https://www.hobbylobby.com/crafts-hobbies/kids-crafts-activities/games-toys/the-chameleon/p/81150607)). A $14.99 lifetime Party Pass sits below both and needs no TV or console. |
| **One-time beats subscription for occasional use.** | Most groups play party games in bursts (holidays, birthdays). Subscriptions get cancelled after the holidays, or never bought. Mobile party apps like *Heads Up!* sell one-off deck purchases ([App Store listing](https://apps.apple.com/app/id623592465)), as does *Psych!* ([App Store listing](https://apps.apple.com/app/id1005765746)). One-time unlocks are the norm and match what users expect. |

### What the free tier must include (non-negotiable)

- Full game loop, all modes, 3–12 players, QR/room-code join.
- **Starter pack (30 topics)** and **House Party pack (15 topics)**: enough for many game nights, so the free game never feels like a demo.
- No ads, no account, no time limit.

The premium offer is *more variety and themed content*, never *the ability to play*.

---

## 2. Why NOT ads during play

1. **The audience is the room, not the screen.** The host's device is often cast to a TV or passed around. An ad interrupts 6–10 people at once and makes the host look bad in front of friends.
2. **Revenue is negligible at this scale.** Display/interstitial revenue is driven by impressions. A party game produces few page views per session (one long-lived socket page per player). Even optimistic ad RPMs (my **estimate:** $1–5 per 1,000 web impressions for a small, non-gaming-network site) would earn a few dollars a month at the traffic levels in §5. That is less than a single Party Pass sale.
3. **Ads cost trust and speed.** Ad scripts add tracking, cookie banners (EU/UK), layout shift and slower load on phones joining over party Wi-Fi. "No ads, no tracking, no sign-up" is a marketing asset (see positioning).
4. **Competitors show the downside.** Gartic Phone is free and ad-supported; one review reports an ad before a round starts ([WhistleOut review](https://www.whistleout.com/CellPhones/Apps/gartic-phone-app-review)). That works for a huge-volume streamer game. It is not a lever a solo dev with modest traffic should pull.
5. **The README's earlier ideas** (rewarded ads for XP, season pass, subscription for >8 players) are dropped. They need accounts, persistence and live-ops work that a solo developer can't sustain, and the 12-player cap is part of the free promise.

*Possible exception later:* a single, static, non-tracking "Sponsored pack" (e.g. a brand-made topic pack) on the menu screen, never mid-round. Revisit only if traffic exceeds roughly 50k monthly hosts.

---

## 3. Pricing table (recommended)

| Product | Price (USD) | What you get | Notes |
|---|---|---|---|
| **Free** | $0 | Starter (30 topics) + House Party (15 topics), 3–12 players, all game modes, default *Midnight Masquerade* theme | Forever. No ads. Guests always free. |
| **Single premium pack** | **$3.99** one-time | One pack: *Pop Culture*, *Around the World*, *Throwback*, *Family Night*, *Office*, or *After Dark (18+)*. Target about 20–30 topics each. | Priced at $3.99 rather than $2.99 because a fixed 50¢ fee per transaction makes very small tickets inefficient (see §4). |
| **Party Pass (lifetime)** | **$14.99** one-time | **All** premium packs, including future ones, plus all premium themes (*Tabloid Pop*, *Cozy Game Night*, future themes) | Main offer. It's the "decoy-proof" choice: 4 packs alone would cost $15.96. |
| **Party Pass, holiday launch price** | **$11.99** (until Jan 6, 2027) | Same as above | Creates urgency during the Thanksgiving → New Year's window. |
| **Visual theme (à la carte)** | $2.99 | One alternate theme | Optional. Ship only if people ask for themes without packs; otherwise keep themes as a Pass perk. |
| **Tip jar** | Pay what you want, min. $3 | Nothing but gratitude + a small "Supporter" badge on the host's lobby | Lemon Squeezy supports pay-what-you-want pricing. Keep it on the post-game screen and footer, never a pop-up. |

### Why lifetime instead of yearly?

- A yearly pass ($6.99–9.99/yr) is reasonable on paper, but party games are bought in holiday bursts and renewal rates for seasonal use are hard to predict. Subscriptions also add support load (cancellations, failed renewals) and, on Lemon Squeezy, reportedly an extra subscription surcharge ([pricing summary](https://www.swell.is/content/lemon-squeezy-pricing); verify on the official page).
- **Recommendation:** launch lifetime only. If, after a year, the content pipeline is steady (a new pack every 2–3 months), test a **$7.99/year "Party Pass+"** that includes early access to new packs, while keeping lifetime available.

### Regional pricing
Lemon Squeezy and Paddle localize currency display. Keep USD price points and round local equivalents (e.g. €3.99 / £3.49 per pack, €14.99 / £12.99 Pass), inclusive of VAT where the provider shows tax-inclusive prices.

---

## 4. Payment provider comparison (for a solo dev selling digital goods globally)

| Option | Fees (headline) | Merchant of record (handles VAT/sales tax)? | License keys built in? | Fit |
|---|---|---|---|---|
| **Lemon Squeezy** | 5% + 50¢ per transaction, no monthly fee; surcharges reported for international/PayPal/subscriptions ([Dodo review](https://dodopayments.com/blogs/lemonsqueezy-review), [Swell](https://www.swell.is/content/lemon-squeezy-pricing)) | **Yes** | **Yes**: auto-generated, with a public License API for validation ([LS docs](https://docs.lemonsqueezy.com/help/licensing/license-api)) | **Recommended.** Least code: no tax work, no key generation. Note: Stripe acquired Lemon Squeezy in July 2024 and some commentators see its long-term direction as uncertain ([Alex Cloudstar](https://alexcloudstar.com/blog/merchant-of-record-indie-saas-2026/)). Keep the integration thin so it can be swapped. |
| **Paddle** | 5% + 50¢ ([Dodo — Paddle fees](https://dodopayments.com/blogs/paddle-fees-explained)) | Yes | No native keys (you generate them) | Good fallback. Reportedly asks very-low-ticket sellers (<$10) to contact sales ([Dodo — Paddle vs LS](https://dodopayments.com/blogs/paddle-vs-lemon-squeezy/)). |
| **Stripe Checkout / Payment Links** | 2.9% + 30¢ (US cards) ([Orb pricing atlas](https://www.withorb.com/pricing-atlas/stripe)) | **No.** You are the seller. Stripe Tax (≈0.5%) only calculates tax; you still register and file ([Dodo — Stripe Tax](https://dodopayments.com/blogs/stripe-tax-explained)) | No | Cheapest per sale, but EU/UK VAT on digital goods sold to consumers applies from the first sale. Not worth the compliance burden for a hobby-scale business. |
| **Stripe Managed Payments** | Reported as Stripe processing + 3.5% ([paynow.gg comparison](https://paynow.gg/compare/stripe)) | Yes (launched 2026; sources conflict on preview vs GA) | No | Watch this; could replace LS later at a similar cost. |

**Fee math on our price points (Lemon Squeezy, base fee only, estimate):**

| Price | Fee (5% + $0.50) | Net to owner | Effective fee |
|---|---|---|---|
| $3.99 pack | $0.70 | **$3.29** | 17.5% |
| $11.99 Pass (launch) | $1.10 | **$10.89** | 9.2% |
| $14.99 Pass | $1.25 | **$13.74** | 8.3% |
| $3 tip | $0.65 | $2.35 | 21.7% |

International and PayPal surcharges (reported at +1.5% each) would reduce these further. This is why the Party Pass is the hero product and why there is no $0.99–$1.99 tier.

### PWA vs app stores (2026)

- **Stay web-first.** A browser game avoids store fees entirely. Apple's Small Business Program rate is 15% for developers under $1M in proceeds. In August 2026 Apple asked the court to approve a commission on *external* purchase links in US apps (proposed 5% for Small Business Program members, 15% standard). That proposal was not approved at the time of writing ([iPhone in Canada, Aug 14 2026](https://www.iphoneincanada.ca/2026/08/14/apple-proposes-15-cut-purchases-outside-app-store/); [TechCrunch background](https://techcrunch.com/2025/05/05/apple-appeals-decision-that-forced-it-to-allow-links-to-external-payments-in-apps)).
- Make the web app an **installable PWA** (manifest + icons) so hosts can "Add to Home Screen". There is no store review and no commission.
- A store listing (via a wrapper like Capacitor/TWA) is a **discovery** play for 2027, not a revenue play. If pursued, the Google Play TWA is the cheaper first step. The copy is already drafted in `launch-copy.md`.

---

## 5. Revenue scenarios (all estimates)

**Definitions.** *Monthly active hosts (MAH)*: unique devices that create at least one room in a month. *Paying conversion*: share of MAH who buy anything that month. *Blended net revenue per purchase*: mix of packs, Passes and tips after Lemon Squeezy base fees.

Assumed purchase mix (estimate): 55% Party Pass, 35% single pack, 10% tip → blended net ≈ 0.55×$13.74 + 0.35×$3.29 + 0.10×$2.35 ≈ **$9.0 net per purchase**. (During the $11.99 launch price, ≈ $8.4.)

| Scenario | MAH (avg/month, year 1) | Paying conversion | Purchases / month | Net revenue / month | Net year 1 | Key assumptions |
|---|---|---|---|---|---|---|
| **Conservative** | 400 | 1.5% | 6 | **≈ $54** | ≈ $650 | Little press pickup; organic Reddit/word of mouth only. Covers hosting, little more. |
| **Base** | 2,500 | 2.5% | 62 | **≈ $560** | ≈ $6,700 | One small Reddit/PH spike + steady TikTok output; 2–3 new packs in year 1; ~25% of MAH come back next month. |
| **Optimistic** | 12,000 | 3.5% | 420 | **≈ $3,780** | ≈ $45,000 | One short-form video breaks out (100k+ views) and a few streamers/bloggers feature it; strong holiday season. |

Notes on the assumptions:
- Conversion is **per host**, not per player. Each host session brings 3–12 free guests, so the per-player conversion is far lower. That's intentional.
- **Seasonality:** expect November–January to produce a large share of annual revenue (estimate: 35–50%), with smaller spikes around Halloween, Super Bowl, graduation and summer.
- Lifetime purchases don't recur. Revenue depends on **new hosts**, which is why the marketing plan focuses on turning guests into future hosts.
- Re-check these assumptions after 30 days of real data (see KPIs in `marketing-plan.md`) and replace them.

---

## 6. Technical integration plan (cheapest to run): Lemon Squeezy license keys

### 6.1 Flow

```
Host taps "Unlock packs" ──► Lemon Squeezy hosted checkout (overlay or new tab)
                                   │ pays
                                   ▼
               LS emails a receipt + LICENSE KEY  ──► redirect to /unlocked?key=… (optional)
                                   │
Host pastes / auto-fills key ──► client stores key in localStorage ("oal.license")
                                   │
socket.emit('room:create', { licenseKey })  ──► server
                                   │
server: entitlements.check(key)
   ├─ cache hit (validated < 24h ago, not revoked) ──► allowed packs
   └─ miss ──► POST https://api.lemonsqueezy.com/v1/licenses/validate
               → verify meta.store_id == LS_STORE_ID, map meta.variant_id → pack ids
               → cache result
                                   │
room.premiumPacks = [...]  → only the HOST's entitlement matters; guests get words from server
```

Webhooks keep the cache honest:

```
Lemon Squeezy ──POST /webhooks/lemonsqueezy──► server
   verify X-Signature = HMAC-SHA256(raw body, LS_WEBHOOK_SECRET)
   order_created / license_key_created → upsert entitlement
   order_refunded / license_key_updated (disabled) → revoke
```

### 6.2 Why this is cheap and robust
- **No user accounts, no email sending, no database server.** The license key *is* the account. Entitlements cache in memory, persisted to a small JSON/SQLite file on a 1 GB volume (Fly volumes cost cents per GB-month; check [Fly pricing](https://fly.io/docs/about/pricing/)).
- **Premium words never reach the client** (per `shared/src/content.ts`: packs live server-side). A leaked client bundle doesn't leak premium content.
- The License API's `activate`/`validate` endpoints are called with the license key itself (no secret API key needed), so a compromised server env can't be used to issue keys.
- **Activation limit:** set to 5 per key in the LS product settings. The server calls `/v1/licenses/activate` with `instance_name = "host-<random device id>"` the first time a device uses a key, which deters casual key sharing without making the host's life hard. Support can reset activations in the LS dashboard.

### 6.3 Fit with the existing `PREMIUM_CODES` hook
The server is getting an env-based `PREMIUM_CODES` hook for premium rooms on the `revamp/v1` branch (not yet present in `server/src/index.ts` at the time of writing). Keep it, and layer the provider on top:

```ts
// server/src/entitlements.ts (proposed — for the server owner to implement)
type Entitlement = { packs: string[] | 'all'; themes: string[] | 'all'; source: 'env' | 'lemonsqueezy' };

export async function resolveEntitlement(code: string | undefined): Promise<Entitlement | null> {
  if (!code) return null;
  const c = code.trim();
  // 1) Comp / press / tester codes — comma-separated in env, grant everything
  if (envCodes.has(c.toUpperCase())) return { packs: 'all', themes: 'all', source: 'env' };
  // 2) Cached license
  const hit = cache.get(c);
  if (hit && !hit.revoked && Date.now() - hit.checkedAt < 24 * 3600_000) return hit.ent;
  // 3) Ask Lemon Squeezy
  const res = await fetch('https://api.lemonsqueezy.com/v1/licenses/validate', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ license_key: c }),
  }).then(r => r.json());
  if (!res.valid || String(res.meta?.store_id) !== process.env.LS_STORE_ID) return null;
  const ent = VARIANT_MAP[String(res.meta.variant_id)];   // e.g. { "123456": {packs:'all',themes:'all'} }
  cache.set(c, { ent, checkedAt: Date.now(), revoked: false });
  return ent ?? null;
}
```

- **Fail-open for known keys:** if Lemon Squeezy is unreachable, honour a key that validated within the last 30 days. Never block a party because a third-party API is down.
- **Rate limit** the validate path (e.g. 10 attempts/min per socket) to stop key brute-forcing.
- **Client UI:** "Have a code?" field in host settings. Store the key in localStorage, show "Party Pass active ✓", and add a "Restore purchase" link to the LS "My Orders" page (Lemon Squeezy offers a customer portal for finding past keys).

### 6.4 Product setup in Lemon Squeezy
| LS product | Variant | Price | License keys | Activation limit |
|---|---|---|---|---|
| Party Pass | Lifetime | $14.99 (launch discount code / sale price $11.99) | On, no expiry | 5 |
| Pack: Pop Culture | — | $3.99 | On, no expiry | 5 |
| Pack: Around the World / Throwback / Family Night / Office / After Dark (18+) | — | $3.99 each | On | 5 |
| Tip jar | Pay-what-you-want (min $3) | — | Off | — |

For **After Dark (18+)**: add an age confirmation checkbox at checkout (custom field) and an in-game "18+ — host confirms everyone is an adult" toggle.

### 6.5 Accounts, keys and env vars the owner needs

| What | Where | Used for | Secret? |
|---|---|---|---|
| Lemon Squeezy account + **store** (identity verification, payout bank/PayPal details) | lemonsqueezy.com | Selling, tax, payouts | Account |
| `LS_STORE_ID` | LS → Settings → Stores | Reject keys from other stores | No |
| `LS_VARIANT_MAP` (JSON: variantId → entitlement) | LS → Products → variant IDs | Map purchase → packs/themes | No |
| `LS_WEBHOOK_SECRET` | LS → Settings → Webhooks (URL `https://<domain>/webhooks/lemonsqueezy`, events: `order_created`, `order_refunded`, `license_key_created`, `license_key_updated`) | Verify webhook signatures | **Yes** |
| `LS_API_KEY` *(optional)* | LS → Settings → API | Only needed for admin scripts (list orders, reissue keys). Server runtime doesn't need it. | **Yes** |
| `PREMIUM_CODES` | Host env | Comp codes for press, streamers, testers, giveaways | **Yes** |
| `ENTITLEMENT_DB_PATH` | Host env, e.g. `/data/entitlements.json` on a volume | Persist cache across restarts | No |
| Checkout URLs (one per product) | LS → Share | Client buttons and landing page pricing links | No |
| Domain + DNS | Registrar (≈ $10–15/yr estimate for a .com/.games varies) | Landing page + game + webhook URL | Account |
| Hosting account | Fly.io / Render / Railway | Run Docker image | Account |
| Plausible or Umami | plausible.io / umami.is | Privacy-friendly analytics and revenue goals | Account |

### 6.6 Alternative: Stripe Payment Links + self-signed codes
If Lemon Squeezy becomes unavailable: Stripe Payment Link → `checkout.session.completed` webhook (`STRIPE_WEBHOOK_SECRET`) → server mints an **offline-verifiable code** `OAL-<base32(payload)>-<HMAC-SHA256(payload, LICENSE_SIGNING_SECRET)[:10]>` → shown on the success page and emailed (needs an email provider such as Postmark/Resend). The server validates the HMAC with no network call. This is cheaper per sale but makes the owner the seller of record for tax. Use only with Stripe Managed Payments or after confirming tax obligations.

### 6.7 Implementation checklist (≈ 1–2 dev days, estimate)
1. Create LS store, products, variants; enable license keys; set activation limit.
2. Server: `entitlements.ts`, `POST /webhooks/lemonsqueezy` (raw-body parser for signature check), rate limit, persistence file.
3. Server: in `room:create`, accept `licenseKey`; attach `entitlement` to the room; filter `PackSummary.premium` packs by entitlement when the host picks topics.
4. Client: "Unlock" sheet with 3 options (Pass / single pack / have a code), LS overlay checkout (`lemon.js`) or plain links, "Restore purchase".
5. Landing page pricing buttons → LS checkout URLs (replace the TODOs in `landing/index.html`).
6. Test with LS **test mode** and the provider's published test card. Run refund → revoke end to end.
7. Add Plausible custom events: `unlock_open`, `checkout_click`, `license_valid` (with `product` prop).

---

## 7. Hosting cost estimate and break-even

The Socket.IO server keeps rooms in memory. A party round has tiny payloads (clues, votes). A single small VM handles a lot of concurrent rooms. **Estimate:** a 512 MB shared VM should handle hundreds of concurrent players. Load-test with `server/src/simulateClients.ts` before launch to replace this estimate with a measured number.

| Host | Plan | Monthly cost | Notes |
|---|---|---|---|
| **Fly.io** (recommended) | `shared-cpu-1x` 256 MB: $2.19/mo; 512 MB ≈ 2× (estimate) + 1 GB volume | **≈ $4–6** | Prices effective Oct 2026 per [Fly pricing](https://fly.io/docs/about/pricing/) / [2026 update coverage](https://www.buildmvpfast.com/blog/fly-io-pricing-2026-ram-increase-vs-hetzner). Docker-native, WebSockets fine, regions near players. Set `min_machines_running = 1` so the first party of the night doesn't hit a cold start. |
| Render | Starter web service $7/mo | **≈ $7** | Free tier spins down after 15 min idle and takes up to ~1 min to wake ([Render pricing summary](https://www.activepieces.com/blog/render-pricing-2026-free-tier-workers-total-cost)). Unacceptable for "scan and play", so use Starter. |
| Railway | Hobby $5/mo incl. $5 usage | **≈ $5–8** | [Railway docs](https://docs.railway.com/reference/pricing/plans) |

**Total monthly running cost (estimate):**

| Item | Low | High |
|---|---|---|
| Game server (Fly.io) | $4 | $8 |
| Landing page (static, served by the same container or Cloudflare Pages free) | $0 | $0 |
| Domain (annual ÷ 12) | $1 | $2 |
| Analytics: Umami self-hosted on same VM / Umami Cloud hobby, or Plausible starter ≈ $9/mo ([comparison](https://stackwrite.pages.dev/compare/plausible-vs-umami/)) | $0 | $9 |
| Transactional email | $0 (LS sends receipts + keys) | $0 |
| **Total** | **≈ $5** | **≈ $19** |

Budget **$25/month** to leave headroom for a second region or a traffic spike.

**Break-even (at the $25 budget, Lemon Squeezy base fees):**
- 2 Party Passes ($13.74 net each), **or**
- 8 single packs ($3.29 net each), **or**
- about 3 blended purchases at ≈ $9 net.

The **conservative** scenario (≈ 6 purchases/month) clears break-even. Everything above that is profit, minus the owner's time.

---

## 8. Decisions for the owner

1. Approve "host pays, everyone plays" with **$3.99 packs / $14.99 Party Pass ($11.99 holiday launch)**.
2. Create the Lemon Squeezy store now. Identity verification and payout setup can take days, and the holiday window is short.
3. Pick a domain (see name options in `marketing-plan.md`) so the webhook URL and landing page are final.
4. Decide whether *After Dark (18+)* ships at launch. It's likely the strongest seller for adult parties, but it needs the age gate above.
