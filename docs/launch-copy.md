# Once a Liar — Launch Copy

Ready-to-post copy. Replace `oncealiar.com` with the final domain and add a `?ref=` tag per channel (e.g. `?ref=ph`, `?ref=reddit_webgames`) so `marketing-plan.md` §9 can attribute traffic. Prices match `monetization.md`: free core game, $3.99 packs, $14.99 lifetime Party Pass ($11.99 until Jan 6, 2027).

Rules for every post: say you're the developer, don't ask for upvotes, answer comments for 48 hours.

---

## 1. Product Hunt

**Name:** Once a Liar

**Tagline (≤ 60 chars):**
- Primary: `Find the liar. A party game that runs in any browser.` (54)
- Alt: `Everyone knows the secret word. Except the liar.` (48)
- Alt: `The no-app social deduction party game for 3–12` (47)

**Topics:** Games · Party Games · Web App · Social

**Description (≤ 260 chars):**
> A social-deduction party game for 3–12 people in the same room. The host opens it on a phone or laptop, everyone scans a QR code, and one player secretly doesn't know the word. Give clues, bluff, vote. Free, no app, no sign-up, no ads.

**Gallery (in order):**
1. Hero: dark Midnight Masquerade background, phone showing "YOU ARE THE LIAR" card, tagline.
2. 3-step "Host → Scan → Bluff" graphic.
3. 16-word topic grid with secret word highlighted (civilian view) vs. "?" (liar view).
4. Vote screen + "Caught! One last guess…" moment.
5. Pack showcase (free vs premium).
6. 30-second setup video (concept V4).

**Maker's first comment:**

> Hey Product Hunt 👋 — I'm [Name], the solo dev behind Once a Liar.
>
> **Why I built it:** every party I went to had the same problem: someone suggests a game, then half the room has to download an app, make an account, or wait for the one person with a Switch. I wanted something you could start in 30 seconds with whatever phones are already in the room.
>
> **How it plays:**
> 1. One person hosts from a phone or laptop.
> 2. Everyone else scans the QR code (or types a 4-letter code). It opens in the browser, no install.
> 3. Everyone sees a secret word from a 16-word topic grid… except the **liar**, who only sees the grid.
> 4. Each player gives a one-word clue. Too obvious and the liar figures out the word; too vague and *you* look like the liar.
> 5. Discuss, vote. If the liar is caught, they get one last guess at the word to steal the win.
>
> **What's free:** the full game, 3–12 players, 45 topics across two packs, no ads, ever. Guests never pay.
> **What's paid:** if you host a lot, you can unlock themed packs (Pop Culture, Around the World, Throwback, Family Night, Office, After Dark 18+) for $3.99 each, or everything forever with the Party Pass ($11.99 launch price through Jan 6).
>
> Built with React + Socket.IO, runs in any modern browser. Works great cast to a TV.
>
> I'd love feedback on: the onboarding (is it really 30 seconds for you?), topic ideas, and which pack you'd want next. I'm here all day. Ask me anything!

---

## 2. Reddit posts (three subs, three angles)

> Check each sub's rules and pinned posts the day you post; rules change. See `marketing-plan.md` §5.1.

### 2a. r/WebGames (dev-friendly, play-it-now angle)

**Title:** `Once a Liar: a social deduction party game you play in the browser with friends in the same room (no app, QR join, free)`

**Body:**
> I'm the dev. Once a Liar is a Chameleon/Spyfall-style word game for 3–12 people:
>
> - One person hosts on a phone/laptop (cast it to a TV if you have one)
> - Everyone else scans a QR or enters a 4-letter code. It opens in the browser, no install, no account
> - All players see the secret word on a 16-word grid, except the liar
> - One-word clues → discussion → vote → a caught liar gets one guess to steal the win
>
> Free to play with 45 topics, no ads. There are optional paid packs for hosts, but you don't need them.
>
> It's built for in-person, but it works on a video call too if one person shares the host screen.
>
> Link: https://oncealiar.com/?ref=reddit_webgames
>
> I'd genuinely love feedback on the clue phase timing and on whether 16 words is the right grid size. Happy to answer anything about the tech (React + Socket.IO).

### 2b. r/partygames (host-perspective, feedback angle)

**Title:** `I made a free "find the liar" word game for when you don't want to set up Jackbox. Looking for hosts to try it this holiday`

**Body:**
> Hi all, solo dev here. I host a lot of game nights and kept hitting the same wall: great games, but setup kills the energy (console, downloads, explaining rules for 10 minutes).
>
> So I made **Once a Liar**:
> - Host opens it on a phone or laptop, guests scan a QR, done. Phones are just secret cards
> - Each round everyone sees the same secret word… except one liar
> - Everyone gives a one-word clue, then you argue and vote
> - Caught liar gets one last guess. If they name the word, they still win
>
> Works with 3–12 players. Rounds take about 3–5 minutes. Family-friendly by default (there's an optional 18+ pack for adult parties, off unless the host picks it).
>
> Core game is free with 45 topics and no ads. Guests never pay for anything.
>
> If you're hosting Friendsgiving / a holiday party and try it, I'd love to hear:
> 1. how long it took from "let's play" to the first round,
> 2. what topics you wish existed.
>
> https://oncealiar.com/?ref=reddit_partygames

### 2c. r/boardgames (design-discussion angle, only if the rules/mods allow digital-adaptation posts)

**Title:** `Design question: how much information should the "liar" get in a Chameleon-style word game? (I built a browser version and tested three options)`

**Body:**
> Long-time lurker, and I've played a lot of The Chameleon. Disclosure: I'm making a browser-based game in the same family called Once a Liar.
>
> The core tension in these games is the liar's information. In my playtests I tried:
>
> 1. **Liar sees the 16-word topic grid, no word.** Classic. Liar can bluff "in-topic" and has a 1-in-16 guess at worst.
> 2. **Liar sees a decoy word from the same grid.** The liar might not know they're the liar. Hilarious, but quieter players hated it.
> 3. **Liar sees only the topic name, no grid.** Way too hard for the liar under ~6 players.
>
> We kept #1, plus a rule that a caught liar gets one final guess. That keeps the liar in the game until the very end, and clue-givers have to balance "prove I know it" against "don't give it away."
>
> Questions for the hive mind:
> - At 3–4 players, the liar seems to win too often for us. Do you house-rule anything at small counts?
> - Is 16 the right grid size, or does 12 play tighter?
>
> (If a link is OK under the sub rules, I'll put it in a comment. Mods, happy to remove if not.)

---

## 3. TikTok / Reels / Shorts scripts (5)

Format: 9:16, 15–30 s, burned-in captions, hook on screen within 1.5 s. Caption CTA: *"Free in your browser, no app. Link in bio. 🎭"* Hashtags (rotate 3–5): #partygames #gamenight #friendsgiving #familygamenight #findtheliar #boardgametok #holidayparty

### Script 1: "One of us is lying"
- **0.0–1.5s HOOK** (on-screen text + VO): *"Everyone here knows the secret word. Except one."*
- **1.5–8s:** Rapid cuts, 5 friends each say one word to camera: "Crust." "Hot." "Round." "…Delivery?" "Triangle."
- **8–12s:** Text: *"Who's the liar? 👀 Comment before the reveal."* Freeze on the group.
- **12–18s:** Host flips phone: "The word was PEPPERONI." Camera snaps to "Delivery?" friend, who grins.
- **18–22s:** Text: *"Once a Liar. Free, in your browser."*

### Script 2: "The liar gets one guess" (twist)
- **HOOK 0–1.5s:** *"We caught her. Then she did THIS."*
- **1.5–6s:** Group points at Maya, shouting "LIAR!" Phone shows CAUGHT.
- **6–14s:** Close-up of Maya's phone: 16-word grid. Tension music. Her finger hovers… taps "Lasagna".
- **14–18s:** Phone: "CORRECT. THE LIAR WINS." Room erupts, someone falls off the couch.
- **18–22s:** Text: *"Caught liars get one last guess. Never relax."*

### Script 3: "30 seconds, no app" (product demo)
- **HOOK 0–1.5s:** *"How long does it take 8 people to start a party game?"* Stopwatch overlay starts.
- **1.5–10s:** Screen-record: tap "Host" → QR fills screen → hands with phones scan → names pop into lobby.
- **10–14s:** Host taps "Start". Every phone flips to a role card. Stopwatch stops at ~0:28.
- **14–20s:** VO: *"No app. No sign-up. Just scan and lie."* End card with URL.

### Script 4: "Grandma was the liar" (holiday)
- **HOOK 0–1.5s:** *"We played a lying game at Thanksgiving and Grandma…"*
- **1.5–10s:** Family clues around the table. Grandma, deadpan: "Gravy."
- **10–15s:** Everyone votes Uncle Dave. Dave protests. Reveal: it was Grandma. Grandma sips her wine.
- **15–20s:** Text: *"Trust no one. Especially Grandma. 🦃"* + *"Free party game, link in bio."*

### Script 5: "Solo dev story"
- **HOOK 0–1.5s:** Face cam: *"My friends refused to download one more app, so I built a game that doesn't need one."*
- **1.5–10s:** B-roll: code editor, then a real group playing, laughing.
- **10–18s:** VO: *"One person hosts, everyone scans a QR, and one of you is secretly the liar. It's free, no ads, and it runs in any browser."*
- **18–25s:** *"I'm one person building this. Tell me what topic pack I should make next."* (comment bait)

---

## 4. X / Bluesky thread

**1/**
I built a party game you can start in 30 seconds with whatever phones are in the room.

No app. No sign-up. No console.

It's called Once a Liar. 🎭🧵

**2/**
How it works:
• One person hosts on a phone or laptop
• Everyone scans a QR code
• Everyone sees a secret word… except the liar
• One-word clues. Argue. Vote.

**3/**
The twist: if you catch the liar, they get ONE last guess at the word.

Guess right and they still win. So you can't give clues that are too obvious, or the liar steals it.

**4/**
It's built for the room you're in: Friendsgiving, a dorm floor, an office party, cousins at Christmas. 3–12 players. Rounds take a few minutes.

Cast the host screen to a TV and it gets loud fast.

**5/**
The whole game is free with 45 topics and no ads. Guests never pay for anything, ever.

If you host a lot, you can unlock themed packs (Pop Culture, Throwback, Office, Family Night, After Dark 18+…).

**6/**
Solo dev, built with React + Socket.IO. Feedback is gold: what topic pack should exist?

Play free → oncealiar.com

---

## 5. App-store-style descriptions (future PWA / Play Store listing)

**App name:** Once a Liar: Party Game
**Subtitle (≤ 30 chars):** `Find the liar. No app needed.` (29)

**Short description (≤ 80 chars, Google Play):**
`Social deduction party game for 3–12. Guests join by QR code, in the browser.` (79)

**Long description:**

> **Everyone knows the secret word. Except the liar.**
>
> Once a Liar is the social-deduction party game for friends, families and coworkers in the same room. One person hosts. Everyone else scans a QR code and plays in their phone's browser, so guests don't need to download anything.
>
> **HOW TO PLAY**
> • Everyone sees a topic grid of 16 words and the secret word, except the liar, who only sees the grid.
> • Take turns giving a one-word clue that proves you know the word without giving it away.
> • Discuss, accuse, and vote for who you think is lying.
> • Caught liars get one last guess at the secret word. Guess right, and the liar still wins.
>
> **WHY PEOPLE LOVE IT**
> • 🎭 **Ready in 30 seconds**: scan, join, play. No accounts, no installs for guests.
> • 👥 **3 to 12 players**: perfect for game nights, holidays, parties and icebreakers.
> • 📺 **Cast it to the TV** or play around a table with just phones.
> • 🃏 **45 free topics** across the Starter and House Party packs.
> • 🚫 **No ads. Ever.** Guests always play free.
>
> **PREMIUM PACKS (optional, for the host)**
> Pop Culture · Around the World · Throwback · Family Night · Office · After Dark (18+)
> Unlock one pack, or get every pack and theme forever with the Party Pass.
>
> **PRIVACY**
> No sign-up. We don't sell data and we don't use advertising trackers.
>
> Gather your friends. Trust no one. Find the liar.

*(If shipped through Apple/Google with in-app purchase, the store's own payment rules apply. See `monetization.md` §4.)*

---

## 6. Press / blogger pitch email

**Subject line options:**
- `A free "find the liar" party game for your holiday games roundup (no app needed)`
- `For your Jackbox-alternatives list: Once a Liar, a party game that runs in any browser`
- `Story idea: the party game guests can join with a QR code`

**Body:**

> Hi [First name],
>
> I enjoyed your [article title] (especially [specific detail]). I'm a solo developer and I just launched a party game that might fit your next [holiday games / Jackbox alternatives / family game night] roundup.
>
> **Once a Liar** is a social-deduction word game for 3–12 people in the same room. The host opens it on a phone or laptop, everyone else scans a QR code, and it runs in the browser. Nobody installs an app or makes an account. Everyone gets a secret word except one player, the liar, who has to bluff through a round of one-word clues. If they're caught, they get one last guess to steal the win.
>
> A few things that might matter for your readers:
> - **Free to play**: 45 topics, no ads, guests never pay.
> - **Family-friendly by default**, with an optional 18+ pack for adult parties.
> - **Works anywhere**: around a table with phones, cast to a TV, or over a video call.
> - Optional premium packs for hosts ($3.99 each, or $11.99 for everything during the holidays).
>
> Happy to send you a free Party Pass code to try every pack, plus screenshots and a 30-second gameplay clip. Press kit: [link].
>
> Play: https://oncealiar.com/?ref=press
>
> Thanks for reading!
> [Name]
> Creator, Once a Liar
> [email] · [X/Bluesky handle]
