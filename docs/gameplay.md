# Once a Liar — gameplay deep dive

Goal from the owner: **fun for everyone, not hard to learn, difficult to master** — and nobody falls out of the game because they answered a text.

Rule constants and every player-facing rule sentence live in `shared/src/rules.ts`. The engine is `server/src/engine/game.ts`.

---

## 1. The loop as it was (v1)

| Phase | Timer | Who acts | Who waits | Notes |
|---|---|---|---|---|
| Lobby | — | host | everyone | fine |
| Role reveal | 15s or all ready | everyone | — | short and tense; good |
| Clues | 30s × N turns | 1 player | N−1 players | **longest phase**: 12 players means up to 6 min. Spoken mode keeps it lively (people talk over each other); typed mode is quieter |
| Discussion | 90s | everyone | — | the best part. **The Spy has the least to do**: they can only defend |
| Voting | 45s or all voted | everyone | early voters | ok |
| Liar guess | 30s | the Spy | everyone else | high drama, but only when the Spy is caught |
| Results | — | host taps next | everyone | the reveal is fun; scoring was opaque ("why did I get 3?") |

### How the Spy wins and loses
* **Escape** (not the plurality, or a tie, or nobody votes): +3.
* **Caught** → one guess from the 16-word grid. Right: +2 and the round. Wrong: Agents win.
* With 16 words, a Spy who heard decent clues can usually narrow it to 2–4 words. So the real game is **clue calibration**: Agents must be specific enough to prove they know, vague enough not to hand the Spy the codeword.

### Degenerate strategies / problems found
1. **Too-obvious clue** ("Hawaiian" for Pineapple): proves innocence but gives the round away if the Spy is caught. This is *correctly* punished by the last guess — keep it, it's the core skill.
2. **Too-vague clue** ("food"): Agents look like the Spy. Also correctly punished (you get voted).
3. **Ties = free escape.** In 4–6 player games a 2–2 or 2–2–1 split is common, and a tie meant "Spy escapes" with no drama. Groups learn to dread splitting votes, which pushes them to herd onto the first accusation — the Spy's favourite outcome.
4. **Snowballing team points.** Old scoring: every Agent got +1 for a team win and +2 more if they voted for the Spy *only if the Spy was caught and missed*. A sharp Agent who read the Spy correctly while the room was fooled got **0**. Individual skill was invisible.
5. **Spy dead time in discussion.** The Spy's only action is talking. A quiet Spy is a suspicious Spy, but they have no in-app agency until (maybe) the final guess.
6. **Scoring was not explainable** from the results screen. Points appeared with no reason.
7. **Leaving the app = leaving the game.** A socket drop for 30s marked you disconnected; the host migrated after 30s; your clue turn was skipped instantly; a disconnected Spy kept the round alive with nobody to guess.

### Group size
* **3–4 players.** Each Agent's clue matters a lot; the Spy has a 1-in-3/4 role chance so roles repeat often. Discussion of 90s is too long — people run out of things to say. Ties are frequent (2 voters vs 1).
* **10–12 players.** Clue phase drags (12 turns), the grid gets "used up" so late clue-givers are squeezed, and one Spy is easy to lose in the crowd — two Spies keeps it interesting. Discussion needs more time (more suspects).

---

## 2. What the classics teach

| Game | Easy to learn because… | Hard to master because… | Steal |
|---|---|---|---|
| **The Chameleon** | grid + one word clue; nearly identical to us | calibrating a clue for an audience that includes the enemy | the caught-Spy guess (we have it) |
| **Spyfall** | everyone knows the location except the spy; just ask questions | the spy can *win early* by naming the location at any time — huge tension | **an early guess for the Spy** → our *early lock-in* |
| **Insider** | 3 roles but one sentence each | the insider must steer without being noticed; a second vote after the answer | a short follow-up vote only when it adds drama → our *sudden-death re-vote* |
| **Werewords** | yes/no questions to a mayor | information leaks both ways; timing | timers that feel generous the first time |
| **Wavelength** | one dial, one clue | reading *this* group's mind | feedback after each round on how your clue landed |
| **Codenames** | clue = word + number | risk vs reward of a greedy clue; reading the opponent spymaster | clear, per-player accounting of what each clue earned |

Common pattern: **one core rule, depth from calibration, and fast feedback**. Nobody adds phases.

---

## 3. Chosen improvements (implemented)

Every rule has one sentence (see `RULES_ONE_LINERS` / `SCORE_RULES` in `rules.ts`). None adds a phase that makes people wait.

### A. Presence: "step away" without leaving (owner requirement)
*Stepped away to answer a text? You keep your seat for 2 minutes; your turn waits up to 20 seconds.*
* Hidden tab or dropped socket → **away** (still connected, still in the round, seat/vote/score kept). Visible again or reconnect → **online**. Away for `AWAY_GRACE_MS` (120s) → **offline** (the old "disconnected" rules).
* Nobody waits for away players to ready up or vote (voting ends when everyone *here* has voted; an away player's earlier vote still counts).
* Clue turn: if you're away when your turn starts, the turn is capped at 20s, then skipped with a toast *"X stepped away — skipped"*. Come back in time and you get your full turn back. Going away mid-turn doesn't shorten it.
* Host migrates only once the host is offline. A Spy who is merely away is waited for; a Spy who goes offline re-deals the round. A caught Spy who goes offline forfeits the guess.

### B. Spy early lock-in (from Spyfall) — kills Spy dead time, adds mastery
*The Spy may lock in a guess early for +1 — it becomes their final answer if caught.*
During clues/discussion/voting the Spy can lock one word from the grid (same `guess:submit` event). Correct = +1 bonus whether or not they're caught. If caught, the lock *is* the final guess — so the liar-guess phase is skipped entirely (less waiting). The tension: lock early for the bonus and certainty, or wait for discussion to leak more information? Hidden from everyone until results.

### C. Fairer, explainable scoring
| Rule | Points |
|---|---|
| Spy: not the most-voted player | +3 |
| Spy: caught, but guesses the codeword (wins the round) | +2 |
| Spy: correct early lock-in (bonus) | +1 |
| Agent: your vote was on the Spy — even if the group got it wrong | +1 |
| Agents: Spy caught and misses the codeword | +1 each |

The sharp Agent who read the Spy in a fooled room now scores. Max per round: Agent 2, Spy 4 (escape + lock), so a single round can't decide a game and there's no snowball. **No comeback bonus**: the rotating Spy role *is* the comeback (any player can grab 3–4 points in a round), and a separate catch-up rule would fail the one-sentence test. Results carry a `scoreBreakdown` so the screen can say exactly why ("+1 Spotted the Spy, +1 Team win").

### D. Sudden-death re-vote on ties (from Insider)
*Tied vote? A 10-second sudden-death re-vote between the tied players; still tied, the Spy slips away.*
Implemented inside the `voting` phase (`round.runoff`), so no new Phase value. Max 10s of extra time and only when there was a tie — and it's the most dramatic 10 seconds of the round. Agents' "spotted the Spy" uses their final vote.

### E. Game-over awards (Codenames/Wavelength-style feedback)
Sharpest Eye (most votes on the Spy), Smoothest Spy (most Spy wins, fewest votes as tie-break), Codebreaker (most codewords cracked incl. lock-ins), Usual Suspect (innocent but most voted, min 2). Computed server-side, zero waiting, gives the quiet good players a moment and makes the loser laugh.

### F. Learning: warm-up round + coach tips + presets
* **Warm-up round**: *the very first round in a room has 50% more time.* (`settings.warmupRound`, default on.)
* **CoachTip**: one short, role-specific line per phase (e.g. Spy in discussion learns about lock-in exactly when it matters). Dismissible per tip, "Turn off tips", remembered in localStorage, auto-off after the player's 2nd game.
* **Presets + group-size scaling** (`presetSettings`): Quick (3 rounds) / Full (5 rounds); discussion +10s per player above 6 and −15s at 3–4 players; 2 Spies suggested from 8 players.

### Considered and rejected (for now)
* **Double Agent** twist: a third role with hidden information about the Spy doubles the rules to explain and makes votes unreadable. Revisit as an unlockable once groups ask for more.
* **Silent / speed rounds**: fun but they're house rules a group can play today with `clueMode` and the timers; a toggle adds settings noise.
* **"Too obvious / Smooth" per-clue badges**: we can't attribute a Spy's correct guess to a specific clue, so a badge would often be wrong. The score breakdown + Usual Suspect cover the feedback need honestly.
* **Interrogation micro-phase**: adds waiting time for N−2 players.
* **Comeback bonus**: see C.

---

## 4. Timing after the changes (6 players, Full preset)
Role reveal ≤15s · clues ~1–2 min spoken · discussion 90s (Spy now has a decision to make) · voting ≤45s (+10s only on a tie) · liar-guess ≤30s, skipped when the Spy pre-locked · results. A round is ~4–5 minutes; Quick game ≈ 10 minutes.


---

## 5. Round 2 tuning (simulated with the engine, no human playtests yet)

Changes made after simulating scoring and game length:

* **Default length is 5 rounds**, not first-to-15. First-to-15 took about 12 rounds (~55 min) at every group size. First-to-10 is ~8 rounds; both stay as options.
* **Spy is random** (never the same player twice in a row). The strict rotation made the last Spy of every cycle certain, because past Spies are revealed each round.
* **Early lock-in bonus shrinks**: +2 in clues, +1 in the debate, +0 in voting. Before, locking at the last second was free and strictly best.
* **Ready to vote**: the debate ends early once every human who is here taps it. The host can add 30s, twice (clears ready taps). Bots don't need to tap.
* **Typed clues**: Agents can't type the codeword (checked for Agents only, so a refusal never reveals it to the Spy); repeats of an earlier clue are refused.
* **Two Spies from 10 players** (was 8). In simulation two Spies, with two guesses at the codeword, lifted the Spy win rate from ~62% to ~75%+.

Still worth measuring with real games: Spy win rate by group size, game length, and early quits.
