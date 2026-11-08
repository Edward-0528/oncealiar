# Once a Liar — Marketing Plan

*Drafted November 8, 2026. Covers launch through early February 2027 (90 days).*
Companion docs: `monetization.md` (model and prices), `launch-copy.md` (ready-to-post copy), `landing/index.html` (landing page).

Third-party facts are cited. Numbers marked **(estimate)** or **target** are my assumptions, not data.

---

## 1. Positioning

**Positioning statement**

> For friend groups, families and anyone hosting a get-together, **Once a Liar** is the social-deduction party game you can start in 30 seconds: one host, everyone else scans a QR code and plays in their phone's browser. Unlike Jackbox, it needs no console, TV or $30 purchase. Unlike the boxed *Chameleon* card game, there are no cards to deal and no rules to explain. And unlike free web clones, it's polished, ad-free and built for the room you're in.

**The one-liner:** *Everyone gets the secret word. Except one. Find the liar.*

**Brand pillars**

1. **Zero friction:** no app, no sign-up, no install for anyone; QR join; under 30 seconds to first round.
2. **In-person first:** designed for a living room, a dorm, a bar table. The phone is a secret card, not a screen to stare at.
3. **Theatrical:** *Midnight Masquerade*: masks, playing cards, dramatic reveals. It feels like an event, not a utility.
4. **Fair and generous:** free core game with 45 topics, no ads, guests never pay. Hosts unlock more if they love it.

**Voice:** playful, a little mischievous, never mean. Short sentences. Talk about the *moment* ("the look on Sam's face when…"), not the features.

---

## 2. Target audiences

| Segment | Moment / trigger | What they care about | Best channels | Pack to lead with |
|---|---|---|---|---|
| **Friend groups (20s–30s)** | Pre-drinks, game nights, birthdays, "what do we do now?" | Instant, funny, works with 3–12, chaos | TikTok/Reels, group chats, Reddit | House Party, Pop Culture, After Dark (18+) |
| **College students** | Dorm floors, club socials, orientation icebreakers | Free, works on any phone, big groups | TikTok, r/college-adjacent subs, RA/club leaders, Discord | Starter, Throwback, Pop Culture |
| **Families / holidays** | Thanksgiving, Christmas, New Year's, cousins of all ages | Kid-friendly, easy for grandparents, no installs | Facebook groups, Pinterest, parenting blogs, "holiday party games" search | Family Night, Starter |
| **Office parties / team building** | Holiday party, offsites, remote standup icebreakers (via video call) | Safe-for-work, quick, no IT install | LinkedIn, r/remotework-type subs, HR/team-building listicles | Office, Starter |
| **Bars, cafés, game-night hosts** | Weekly trivia/game nights, board-game cafés | Projectable host screen, reliable, large groups | Direct outreach, local Facebook/Meetup groups | Pop Culture, Around the World |
| **Streamers / content creators** | Community game night with chat | Watchable reveals, room codes on stream | Twitch/YouTube outreach, comp codes via `PREMIUM_CODES` | Pop Culture, Throwback |

**Primary focus for the 90 days:** friend groups and families/holidays. That's where the November–January calendar is strongest.

---

## 3. Competitive positioning

| | **Once a Liar** | Jackbox Party Packs | *The Chameleon* (Big Potato, boxed) | Spyfall (web versions) | Gartic Phone | Codenames (online) | Heads Up! / Psych! (apps) |
|---|---|---|---|---|---|---|---|
| **Price to play** | Free; host unlock $3.99 / $14.99 | ≈ $29.99 per pack ([Deku Deals](https://www.dekudeals.com/items/the-jackbox-party-pack-11)) | ≈ $17–20 retail ([Walmart](https://www.walmart.com/ip/14146606026)) | Free ([Common Sense Media](https://www.commonsensemedia.org/website-reviews/spyfall)) | Free, ad-supported ([WhistleOut](https://www.whistleout.com/CellPhones/Apps/gartic-phone-app-review)) | Free web version | Heads Up $1.99 + paid decks ([App Store](https://apps.apple.com/app/id623592465)); Psych free + IAP ([App Store](https://apps.apple.com/app/id1005765746)) |
| **Who pays** | Host only | Host only ([Jackbox](https://www.jackboxgames.com/how-to-play)) | One buyer | — | — (ads) | — | Each device owner |
| **Needs install / hardware** | None (browser) | PC/console/TV app for host | Physical box | None | None | None | App on each phone |
| **Join method** | QR or 4-letter code | 4-letter code at jackbox.tv | — | Code/link | Link | Link | — |
| **In-person first?** | Yes | Mostly (TV) | Yes | Mixed | Mostly remote/streaming | Mostly remote | Yes |
| **Players** | 3–12 | Varies by game | 3–8 (box) | 4–12 ([spyfall.app per blog](https://mechanicsofmagic.com/?p=15073)) | Large groups | 4+ | Varies |
| **Polish / design** | High: theatrical theme | High | High (physical) | Basic | Medium | Medium | Medium |

**Gap we own:** *Chameleon/Spyfall-style deduction, Jackbox-style "host pays, phones join," with zero installs and a premium look, for less than a pizza.*

**Watch-outs:** free Spyfall clones rank for "spyfall online", and the Jackbox brand dominates "party games". Don't compete head-on for those terms. Win on "no app" and on specific long-tail and holiday terms (§7).

---

## 4. Name and tagline

**Name:** keep **Once a Liar**. It's memorable, it hints at the mechanic, and it riffs on the idiom ("once a liar, always a liar").

Domain ideas (check availability; prices are not verified): `oncealiar.com`, `onceaLiar.game`, `playonceaLiar.com`, `oncealiar.party`. Prefer a short `.com` or `.game`; `.party` is a fun secondary redirect.

**Tagline options**

1. **Everyone knows the word. Except the liar.** *(recommended hero line)*
2. Find the liar before they find the word.
3. One word. One liar. Zero apps.
4. The party game where lying is the point.
5. Scan. Bluff. Accuse.
6. Trust no one. Especially your mom. *(holiday/family ad variant)*
7. Your phone is your secret. Keep it.

**Sub-tagline:** *A free social-deduction party game for 3–12 players. Scan the QR, play in your browser, no app needed.*

---

## 5. 90-day launch plan (week by week)

Calendar anchors: **Thanksgiving Thu Nov 26, 2026** · Friendsgiving weekends (Nov 21–22, Nov 28–29) · office holiday parties (Dec 4–19) · Christmas Dec 24–25 · **New Year's Eve Dec 31** · Super Bowl (early Feb 2027) as the last spike.

> The holiday window is short. **Weeks 1–3 have to be fast.** Ship "good and fun" over "perfect".

| Week | Dates | Theme | Key actions | Exit criteria / target |
|---|---|---|---|---|
| **1** | Nov 9–15 | **Soft launch prep** | Buy domain; deploy to Fly.io with `min_machines_running=1`; ship `landing/index.html`; set up Plausible/Umami with goals (§9); create Lemon Squeezy store (verification takes time); add share-result card + "hosted with Once a Liar" footer (§6); record 10 raw gameplay clips with friends. | Game live on real domain; 3 friend-group playtests completed; analytics firing. |
| **2** | Nov 16–22 | **Friends-and-family soft launch** | Send to ~30 people / group chats with "host one this weekend" ask; collect feedback form (one-question exit survey); fix top 5 issues; start TikTok/Reels/Shorts accounts and post 1 clip/day (concepts V1–V4); post in small, explicitly promo-friendly communities (r/WebGames, r/playmygame, indie dev Discords). **Friendsgiving weekend 1.** | ≥ 50 rooms created; < 5% rooms error/abandon in lobby; first 3 posted videos. |
| **3** | Nov 23–29 | **Thanksgiving push** | Publish "Thanksgiving party games with no app" blog post on the landing domain (SEO); post the family-angle Reddit post in a sub that allows it; TikTok concepts V5, V6 ("Grandma was the liar"); turn on Lemon Squeezy with **$11.99 holiday Party Pass**; email/DM 10 family/parenting bloggers with the pitch email. | ≥ 300 rooms; first paid purchase; 1 user-generated clip. |
| **4** | Nov 30–Dec 6 | **Product Hunt launch** | Launch **Tue Dec 1** (12:01 am PT), using PH listing + first comment from `launch-copy.md`; line up 20–30 people who'll genuinely try it and leave feedback (ask for feedback, never for upvotes; Product Hunt discourages vote solicitation); same day: Show HN-style post optional; X/Bluesky launch thread. | Top-20 of the day (stretch: top 5); 1,000 landing visits. |
| **5** | Dec 7–13 | **Reddit wave** | Post tailored versions (see `launch-copy.md`) spaced ≥ 2 days apart: r/WebGames → r/partygames → r/boardgames (check rules first, §5.1). Answer every comment for 48h. Office-party angle on LinkedIn + "Office" pack teaser. | ≥ 1 post with 100+ upvotes; 2,000 cumulative rooms. |
| **6** | Dec 14–20 | **Office-party & college finals week** | Release **Office pack**; LinkedIn post + short video "the holiday party icebreaker that isn't awful"; outreach to 10 micro-streamers (1k–20k followers) with comp codes; TikTok V7, V8. | 3 streamer/creator replies; first pack-specific sales. |
| **7** | Dec 21–27 | **Christmas** | "Christmas party games for the whole family" SEO post; pin family-safe clips; post-game share card nudges ("Hosting again for New Year's?"); minimal new dev, focus on uptime (it's peak). | Uptime ≥ 99.5%; record weekly rooms. |
| **8** | Dec 28–Jan 3 | **New Year's Eve** | NYE-specific content (V9: "countdown liar"); After Dark (18+) push to adult audiences only (age-appropriate platforms, no minors targeting); remind that the holiday price ends Jan 6. | Peak week: track hosts, conversion. |
| **9** | Jan 4–10 | **Holiday price ends + retro** | Holiday price ends Jan 6 (honest, no fake countdowns). Write a retro: which channel brought hosts that converted? Replace revenue-scenario assumptions with real data. | Retro doc; decide next pack. |
| **10** | Jan 11–17 | **Evergreen SEO + listicles** | Pitch "best free party games / games like Jackbox / games like Spyfall" listicle authors; submit to free directories (itch.io web game page, AlternativeTo as Jackbox/Spyfall alternative, PWA directories). | 5 directory listings; 2 listicle placements pitched. |
| **11** | Jan 18–24 | **Community & UGC** | "Your best liar moment" clip contest (prize: Party Pass codes); feature UGC on socials; Discord or subreddit only if there is demand. | 10 UGC submissions. |
| **12** | Jan 25–31 | **Super Bowl prep + new pack** | Release *Around the World* or *Throwback*; "Super Bowl party games" angle; second, smaller Reddit/PH-style update ("v1.1: 2 new packs, themes"). | New pack sales ≥ 10% of month's purchases. |
| **13** | Feb 1–6 | **Review and next 90 days** | KPI review vs targets (§9); decide: PWA install push, Play Store TWA, yearly pass test, localization (Spanish/German/Portuguese topic packs). | Plan for Q1–Q2 2027. |

### 5.1 Reddit: rules caveats (read before posting)

- Reddit is a community, not an ad board. **r/boardgames** in particular: its wiki says the sub is "a community, not an audience" and restricts promotion; digital "boardgame-like" games have their own posting rules ([r/boardgames wiki: posting guidelines](https://r.datuan.dev/r/boardgames/wiki/contribution-guides)). Read the current sidebar and wiki, consider messaging the mods first, and frame the post as a design discussion (word-grid deduction, balancing the liar's guess) rather than "play my game".
- Many subs enforce a self-promotion ratio (commonly cited as ~10% of your activity, rules vary per sub). Comment genuinely for a couple of weeks before posting.
- **r/WebGames**, **r/playmygame**, **r/IndieGaming**, **r/incremental_games**-style subs are generally more open to dev posts. Still read each sidebar.
- **r/partygames** and **r/boardgamenight**: small but on-target. Ask for feedback, not upvotes.
- Never use alt accounts or vote rings. Disclose that you're the developer in every post.
- Avoid posting the same text in multiple subs. Each post in `launch-copy.md` is tailored.

### 5.2 Short-form video strategy (TikTok / Instagram Reels / YouTube Shorts)

**Format rules:** vertical 9:16, 15–35 s, hook in the first 1.5 s on screen *and* in voice, real people reacting (faces > UI), captions burned in, end on the reveal, CTA only in the caption ("free in your browser, link in bio"). Post the same edit on all three platforms. Cadence: 1/day in weeks 2–8, then 3–4/week. Reuse the trending audio of the week when it fits. Track saves and shares, not just views.

**10 concrete video concepts**

| # | Working title | Hook (first 1.5 s) | What happens | Why it works |
|---|---|---|---|---|
| V1 | **"Who's lying?"** POV | Text: "One of us doesn't know the word. Guess who." | Quick cuts of 5 friends giving one-word clues; freeze-frame; viewer is invited to guess in comments; reveal next video. | Comment bait + series hook. |
| V2 | **The worst clue ever** | "He said 'round'. For PIZZA TOPPINGS." | Liar gives a desperate clue, room erupts, vote, reveal. | Universal cringe-comedy. |
| V3 | **Liar guesses the word** | "She got caught… but she gets ONE guess." | Caught liar stares at 16-word grid, picks correctly, room loses it. | Twist ending, rewatchable. |
| V4 | **30-second setup** | "No app. No cards. Watch." | Screen-record: host taps Create → QR on screen → 6 phones scan → round starts. Timer overlay. | Shows the no-install USP. |
| V5 | **Grandma was the liar** | "We played this at Thanksgiving and Grandma…" | Grandma bluffs perfectly; family accuses wrong person. | Holiday + family + surprise. |
| V6 | **Types of players** | "Every group has these 5 players" | Skit: the over-explainer, the one who always says 'yes', the chaotic liar… | Relatable, shareable to tag friends. |
| V7 | **Office party survival** | "Our holiday party icebreaker didn't suck this year" | Coworkers playing Office pack; HR-safe laughs. | LinkedIn + TikTok crossover. |
| V8 | **Couples edition** | "Playing with my boyfriend's friends for the first time" | Partner is the liar, gets defended by partner, betrayal vote. | Relationship content travels well. |
| V9 | **New Year's countdown liar** | "Find the liar before midnight" | NYE party, clock overlay, reveal at 11:59. | Seasonal hook. |
| V10 | **Dev story** | "I built a party game because my friends hate downloading apps" | Solo-dev face cam + gameplay B-roll + "it's free". | Builder content does well; humanizes; PH/Reddit tie-in. |

---

## 6. Built-in virality loops

These are product features, listed for the client team. They're the highest-ROI marketing work.

1. **QR join on the host screen.** Every round puts the brand and URL in front of 3–12 people. Show `oncealiar.com` (final domain) under the QR so guests remember it.
2. **"Hosted with Once a Liar" end screen** on every guest phone: "Had fun? Host your own game, free." → landing page with `?ref=guest_end` (UTM/ref param, no personal data).
3. **Share result card.** After each game, generate a PNG (Web Share API on mobile): masked avatar of the liar, the secret word, "Caught!" / "Got away with it", room's funniest clue, and the URL. Sized 1080×1920 for Stories and 1200×630 for chat previews. Group chats are where party games spread.
4. **"Hosted by Sam" lobby branding.** Guests see who's hosting; the Party Pass gives hosts a subtle badge. That's social proof that unlocking is normal.
5. **Invite link with code baked in** (`/join/ABCD`) for remote players on a video call, with good OG preview image.
6. **"Play again next time" nudge:** the host can "Save this group" locally (localStorage only) and gets a one-tap re-host next time.
7. **Comp codes as currency:** streamers, bloggers and contest winners get `PREMIUM_CODES`-backed Party Pass codes. Cheap to give, valuable to receive.
8. **Seasonal topic drops** (free Holiday topics in Starter for Dec) give returning hosts a reason to come back and post.

---

## 7. SEO keywords

No keyword-volume tool was used, so these are **unvalidated targets** grouped by intent. Validate with Google Search Console after launch (free) and prioritize by impressions.

| Cluster | Example keywords | Page to rank |
|---|---|---|
| Core / product | once a liar game, find the liar game, guess the liar game, liar party game | Landing page |
| No-app intent | party games no app, party games in browser, phone party game no download, qr code party game | Landing + blog "No-app party games" |
| Alternative-to | games like jackbox free, jackbox alternative free, games like spyfall, chameleon game online, chameleon word game online free | Comparison pages ("Once a Liar vs Spyfall", honest tables) |
| Mechanic | social deduction party game, word bluffing game, impostor word game, spy word game online | Landing + how-to-play page |
| Holiday / occasion | thanksgiving party games for adults, christmas party games for families, new year's eve party games, office holiday party games, friendsgiving games | Seasonal blog posts (publish 3–4 weeks before the date) |
| Group size | games for large groups, party games for 10 people, games for 3 players | How-to-play / FAQ sections |
| Icebreaker | icebreaker games for work, virtual team building games, college icebreaker games | Office pack page |

**On-page checklist:** one H1 with "party game" + "browser"; FAQ with `FAQPage` JSON-LD (optional addition to the `VideoGame` JSON-LD on the landing); fast LCP (no external images); descriptive OG image; `/how-to-play` as a separate crawlable page; internal links from blog posts to the landing CTA.

---

## 8. Influencer, press and partnerships (lightweight)

- **Micro-creators** (1k–50k followers) in party games, family life, college life, board games: offer comp Party Pass codes + early access to new packs. No paid deals in the first 90 days.
- **Bloggers/listicles:** "best Jackbox alternatives", "free party games online", "holiday party games". Use the pitch email in `launch-copy.md`.
- **Board-game cafés and bar game nights:** offer a free venue Party Pass in exchange for a table tent with the QR code.
- **Teachers/RAs:** a Family/School-safe mode is already a good fit. Consider a "Classroom" pack later.

---

## 9. KPIs and measurement (privacy-friendly)

**Tooling:** Plausible (no cookies, entry price ≈ $9/month per third-party comparisons, see [comparison](https://stackwrite.pages.dev/compare/plausible-vs-umami/)) **or** Umami (self-host free on the same VM, or Umami Cloud). Both work without a cookie banner because they don't use cookies or store personal data. Confirm with your own legal reading for the EU. **No player names, words, clues or room codes are ever sent to analytics.**

**Events to instrument** (custom events/goals; props in brackets, no PII):

| Event | Fired when | Props |
|---|---|---|
| `landing_cta` | "Play free" clicked on landing | `position` (hero/pricing/footer) |
| `room_created` | Host creates room | `pack` (free/premium), `source` (ref param) |
| `player_joined` | Guest joins | `method` (qr/code/link) |
| `round_started` | Round begins | `players_bucket` (3–4/5–7/8–12) |
| `game_completed` | ≥ 1 full round finished | `rounds_bucket` |
| `share_card` | Result card shared/downloaded | — |
| `guest_to_host` | Room created by a device that previously joined as guest (local flag) | — |
| `unlock_open` / `checkout_click` / `license_valid` | Monetization funnel | `product` |

**KPI table**

| KPI | Definition | How to measure | 90-day target (estimate) |
|---|---|---|---|
| Monthly active hosts (MAH) | Unique rooms-creating visitors / month | Plausible unique visitors with `room_created` goal | 2,500 by January (base scenario) |
| Players per room | joins ÷ rooms | `player_joined` ÷ `room_created` | ≥ 5 |
| Lobby → round rate | rooms with ≥ 1 round ÷ rooms | `round_started` ÷ `room_created` | ≥ 70% |
| Rounds per session | median rounds | server-side counter (aggregate only) logged daily | ≥ 4 |
| Guest → host conversion | `guest_to_host` ÷ unique guests | Plausible goal | ≥ 3% |
| Share rate | `share_card` ÷ `game_completed` | Plausible | ≥ 5% |
| Host paying conversion | purchases ÷ MAH | Lemon Squeezy orders ÷ MAH | 2–3% |
| Revenue / month | net after fees | Lemon Squeezy dashboard | ≥ $500 in Dec (base) |
| Refund rate | refunds ÷ orders | Lemon Squeezy | < 3% |
| Channel quality | `room_created` and purchases by `source` | UTM/ref params on every link (`?ref=ph`, `?ref=reddit_webgames`, `?ref=tt_v3`) | Identify top 2 channels by week 9 |
| Uptime | % time healthy | Free uptime monitor (e.g. UptimeRobot / Better Stack free tier) on `/health` | ≥ 99.5% |

**Weekly ritual (30 min, Mondays):** check the KPI table, the top 3 referrers, the best video's saves/shares, and Lemon Squeezy orders. Pick one thing to double down on and one to stop.
