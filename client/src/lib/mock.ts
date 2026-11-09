/**
 * DEV-ONLY fake server. `?mock=<phase>` renders any screen with believable
 * state, and the fake server keeps playing (bots get ready, give clues, vote,
 * react) so the full flow can be reviewed without the real backend.
 *
 * Params: mock=home|profile|lobby|briefing|role-reveal|clues|discussion|voting|liar-guess|results|game-over
 *         role=liar|truth  host=0|1  clue=spoken|typed  n=3..12  caught=0|1  topic=0 (liar doesn't see topic)
 *         runoff=1 (voting opens as a sudden-death re-vote)  away=1 (one bot keeps stepping away)
 *         demo=2.3 (briefing: freeze the tutorial on scene 2, step 3)
 *         warmup=0 (no warm-up / practice round)  briefing=0 (no tutorial before the first game)
 *
 * Mirrors the server rules in shared/src/rules.ts: presence (away/offline),
 * sudden-death re-vote, Spy early lock-in, score breakdown, awards.
 */
import {
  AVATARS,
  AWAY_TURN_MS,
  AWARDS,
  DEFAULT_SETTINGS,
  PLAYER_COLORS,
  REACTIONS,
  RUNOFF_MS,
  SCORE,
  WARMUP_FACTOR,
  type Award,
  type PackSummary,
  type Phase,
  type Player,
  type PlayerID,
  type PlayerProfile,
  type PrivateView,
  type PublicGameState,
  type RoundResult,
  type ScoreLine,
  type ScoreRuleId,
  type Topic
} from '@oncealiar/shared';
import type { Transport, TransportEvent } from './transport';

const TOPICS: Pick<Topic, 'id' | 'name' | 'emoji' | 'words'>[] = [
  {
    id: 'pizza',
    name: 'Pizza Toppings',
    emoji: '🍕',
    words: ['Pepperoni', 'Mushroom', 'Pineapple', 'Olives', 'Basil', 'Anchovy', 'Jalapeño', 'Sausage', 'Onion', 'Ham', 'Spinach', 'Bacon', 'Garlic', 'Peppers', 'Ricotta', 'Arugula']
  },
  {
    id: 'vacation',
    name: 'Vacation Spots',
    emoji: '🏝️',
    words: ['Paris', 'Tokyo', 'Bali', 'Iceland', 'Cancún', 'Rome', 'Las Vegas', 'Disneyland', 'Safari', 'Cruise', 'Ski Resort', 'Camping', 'New York', 'Hawaii', 'Santorini', 'Machu Picchu']
  },
  {
    id: 'superpowers',
    name: 'Superpowers',
    emoji: '🦸',
    words: ['Flight', 'Invisibility', 'Telepathy', 'Super Speed', 'Time Travel', 'Teleport', 'Shapeshift', 'X-ray Vision', 'Immortality', 'Healing', 'Strength', 'Talk to Animals', 'Freeze Time', 'Mind Control', 'Fire', 'Luck']
  }
];
const SECRETS = ['Pineapple', 'Iceland', 'Time Travel'];

const PACKS: PackSummary[] = [
  { id: 'starter', name: 'Starter Party', tagline: 'Crowd-pleasers for any group', emoji: '🎉', premium: false, topicCount: 40 },
  { id: 'world', name: 'Around the World', tagline: 'Places, foods & landmarks', emoji: '🌍', premium: false, topicCount: 24 },
  { id: 'screen', name: 'Movie Night', tagline: 'Films, shows & icons', emoji: '🍿', premium: true, topicCount: 30 },
  { id: 'nerd', name: 'Nerd Out', tagline: 'Games, sci-fi & fandoms', emoji: '🧙', premium: true, topicCount: 30 },
  { id: 'afterdark', name: 'After Dark', tagline: 'Spicy topics for grown-ups', emoji: '🌶️', premium: true, mature: true, topicCount: 25 }
];

const BOT_NAMES = ['Maya', 'Jonah', 'Priya', 'Leo', 'Sam', 'Ava', 'Kai', 'Zoe', 'Omar', 'Lin', 'Ruby'];
const BOT_CLUES = ['Tropical', 'Sweet', 'Spiky', 'Divisive', 'Yellow', 'Juicy', 'Rings', 'Hawaii', 'Upside', 'Golden', 'Fresh'];
const ME = 'p-me';

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = <T,>(arr: T[]) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

function makePlayer(i: number, profile?: PlayerProfile): Player {
  const isMe = i === 0;
  return {
    id: isMe ? ME : `p${i}`,
    name: isMe ? profile?.name || 'You' : BOT_NAMES[(i - 1) % BOT_NAMES.length],
    avatar: isMe ? profile?.avatar ?? 'chancla' : AVATARS[(i * 5) % AVATARS.length],
    color: isMe ? profile?.color ?? 'coral' : PLAYER_COLORS[(i * 3) % PLAYER_COLORS.length],
    score: 0,
    connected: true,
    presence: 'online',
    isHost: false,
    ready: false,
    hasVoted: false
  };
}

export function createMockTransport(phaseParam: string, params: URLSearchParams, profile?: PlayerProfile): Transport {
  const n = Math.min(12, Math.max(3, Number(params.get('n')) || 6));
  const iAmLiar = params.get('role') === 'liar';
  const iAmHost = params.get('host') !== '0';
  const clueMode = params.get('clue') === 'typed' ? 'typed' : 'spoken';
  const forceCaught = params.get('caught');
  const forceRunoff = params.get('runoff') === '1';
  const flakyBot = params.get('away') === '1';
  const warmupOn = params.get('warmup') !== '0';
  const briefingOn = params.get('briefing') !== '0';
  const subs = new Set<(e: TransportEvent) => void>();

  let st: PublicGameState | null = null;
  let me: PrivateView = { playerId: ME, role: null, secretWord: null, myVote: null, token: 'mock-token' };
  let liarIds: PlayerID[] = [];
  let secret = '';
  let botVotes: Record<PlayerID, PlayerID> = {};
  let targetPlayers = n;
  let phaseStartedAt = Date.now();
  let pendingResult: RoundResult | null = null;
  /** early lock-ins this round (spy → word) */
  let locks: Record<PlayerID, string> = {};
  let runoff: PlayerID[] | null = null;
  let firstVotes: Record<PlayerID, PlayerID> | null = null;
  let gamesStarted = 0;
  let turnStartedAt = 0;
  /** per-game award stats */
  let stats: Record<PlayerID, { spotted: number; spyWins: number; codewords: number; suspectVotes: number }> = {};

  const send = (e: TransportEvent) => subs.forEach((fn) => fn(e));
  const push = () => {
    if (!st) return;
    st.round.serverNow = Date.now();
    send({ type: 'state', state: view(), you: privateView() });
  };
  const S = () => st!;
  const hidesTopic = () =>
    !!st && !st.settings.liarSeesTopic && ['role-reveal', 'clues', 'discussion', 'voting'].includes(st.round.phase);
  /** mirror the server: round.topic is null while liarSeesTopic=false hides it */
  const view = (): PublicGameState => {
    const v = clone(st!);
    if (hidesTopic()) v.round.topic = null;
    return v;
  };
  const privateView = (): PrivateView => {
    const v = clone(me);
    v.lockedGuess = me.role === 'liar' ? locks[ME] ?? null : null;
    if (hidesTopic() && me.role === 'truth-teller' && st?.round.topic) v.topic = clone(st.round.topic);
    return v;
  };
  const player = (id: PlayerID) => S().players.find((p) => p.id === id)!;

  const warm = () => warmupOn && S().settings.warmupRound && gamesStarted <= 1 && S().round.number === 1;
  function setPhase(phase: Phase, seconds: number | null) {
    S().round.phase = phase;
    S().round.phaseEndsAt = seconds ? Date.now() + seconds * 1000 * (warm() ? WARMUP_FACTOR : 1) : null;
    S().round.runoff = phase === 'voting' ? runoff : null;
    S().round.warmup = warm();
    S().round.practice = warm();
    phaseStartedAt = Date.now();
  }
  const toast = (message: string) => send({ type: 'toast', message });

  function lobby(code = 'MASK', host = iAmHost, count = Math.max(2, n - 2)) {
    const players = Array.from({ length: count }, (_, i) => makePlayer(i, profile));
    players[host ? 0 : 1].isHost = true;
    st = {
      code,
      players,
      settings: { ...DEFAULT_SETTINGS, clueMode, packIds: ['starter'], liarSeesTopic: params.get('topic') !== '0', warmupRound: warmupOn, briefing: briefingOn },
      round: { number: 0, phase: 'lobby', phaseEndsAt: null, serverNow: Date.now(), topic: null, turnOrder: [], currentTurn: 0, clues: [], result: null },
      packs: PACKS,
      premium: false
    };
    me = { playerId: ME, role: null, secretWord: null, myVote: null, token: 'mock-token' };
  }

  function startRound(num: number) {
    const s = S();
    const t = (num - 1) % TOPICS.length;
    const bots = s.players.filter((p) => p.id !== ME).map((p) => p.id);
    liarIds = iAmLiar ? [ME] : [pick(bots)];
    if (s.settings.liarCount === 2) liarIds.push(pick(bots.filter((b) => !liarIds.includes(b))));
    secret = SECRETS[t];
    botVotes = {};
    pendingResult = null;
    locks = {};
    runoff = null;
    firstVotes = null;
    s.players.forEach((p) => {
      p.ready = false;
      p.hasVoted = false;
    });
    s.round = {
      number: num,
      phase: 'role-reveal',
      phaseEndsAt: null,
      serverNow: Date.now(),
      topic: TOPICS[t],
      turnOrder: shuffle(s.players.map((p) => p.id)),
      currentTurn: 0,
      clues: [],
      result: null
    };
    const liar = liarIds.includes(ME);
    me = { ...me, role: liar ? 'liar' : 'truth-teller', secretWord: liar ? null : secret, myVote: null };
    setPhase('role-reveal', null);
  }

  /** first game in a room (settings.briefing): everyone watches the tutorial, then role-reveal */
  function startBriefing() {
    const s = S();
    s.players.forEach((p) => {
      p.ready = false;
      p.hasVoted = false;
    });
    s.round = { number: 0, phase: 'briefing', phaseEndsAt: null, serverNow: Date.now(), topic: null, turnOrder: [], currentTurn: 0, clues: [], result: null };
    setPhase('briefing', null);
  }

  function botClue(id: PlayerID) {
    const s = S();
    s.round.clues.push({ playerId: id, text: s.settings.clueMode === 'typed' ? pick(BOT_CLUES) : undefined, at: Date.now() });
  }

  function nextTurn() {
    const s = S();
    if (s.round.currentTurn >= s.round.turnOrder.length - 1) {
      setPhase('discussion', s.settings.discussionSeconds);
    } else {
      s.round.currentTurn += 1;
      setPhase('clues', s.settings.clueSeconds);
      turnStartedAt = Date.now();
      // away when the turn starts → at most AWAY_TURN_MS
      const cur = player(s.round.turnOrder[s.round.currentTurn]);
      if (cur.presence === 'away' && s.round.phaseEndsAt) s.round.phaseEndsAt = Math.min(s.round.phaseEndsAt, Date.now() + AWAY_TURN_MS);
    }
  }

  function tallyVotes(): { votes: Record<PlayerID, PlayerID>; accusedId: PlayerID | null; tied: PlayerID[] } {
    const s = S();
    const votes: Record<PlayerID, PlayerID> = { ...botVotes };
    if (me.myVote) votes[ME] = me.myVote;
    const counts = new Map<PlayerID, number>();
    Object.values(votes).forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1));
    let best: PlayerID | null = null;
    let bestN = 0;
    let tie = false;
    for (const [id, c] of Array.from(counts.entries())) {
      if (c > bestN) {
        best = id;
        bestN = c;
        tie = false;
      } else if (c === bestN) tie = true;
    }
    const tied = tie ? Array.from(counts.entries()).filter(([, c]) => c === bestN).map(([id]) => id) : [];
    let accusedId: PlayerID | null = tie ? null : best;
    if (forceCaught === '1') accusedId = liarIds[0];
    if (forceCaught === '0') accusedId = s.players.find((p) => !liarIds.includes(p.id))!.id;
    return { votes, accusedId, tied: forceCaught ? [] : tied };
  }

  function startRunoff(tied: PlayerID[], votes: Record<PlayerID, PlayerID>) {
    const s = S();
    firstVotes = votes;
    runoff = tied;
    botVotes = {};
    me.myVote = null;
    s.players.forEach((p) => (p.hasVoted = false));
    setPhase('voting', RUNOFF_MS / 1000);
  }

  function endVoting() {
    const s = S();
    s.players.forEach((p) => {
      if (p.id !== ME && !p.hasVoted && p.presence === 'online') {
        castBotVote(p.id);
      }
    });
    const { votes, accusedId, tied } = tallyVotes();
    if (tied.length > 1 && !runoff) return startRunoff(tied, votes);
    const caught = !!accusedId && liarIds.includes(accusedId);
    pendingResult = {
      liarIds,
      secretWord: secret,
      accusedId,
      liarCaught: caught,
      winner: caught ? 'truth-tellers' : 'liar',
      votes: firstVotes ?? votes,
      scoreDeltas: {},
      ...(runoff ? { runoff, runoffVotes: votes } : {})
    };
    if (caught && locks[liarIds[0]] !== undefined) finish(locks[liarIds[0]], true);
    else if (caught) setPhase('liar-guess', s.settings.guessSeconds);
    else finish();
  }

  function finish(guess?: string, fromLock = false) {
    const s = S();
    const r = pendingResult!;
    if (guess !== undefined && r.liarCaught) {
      r.liarGuess = guess;
      r.liarGuessCorrect = guess === secret;
    } else if (r.liarCaught) r.liarGuessCorrect = false;
    if (r.liarCaught) r.guessLocked = fromLock;
    if (Object.keys(locks).length) r.lockedGuesses = { ...locks };
    const liarWins = !r.liarCaught || !!r.liarGuessCorrect;
    r.winner = liarWins ? 'liar' : 'truth-tellers';
    const deltas: Record<PlayerID, number> = {};
    const breakdown: Record<PlayerID, ScoreLine[]> = {};
    const received: Record<PlayerID, number> = {};
    Object.values(r.votes).forEach((t) => (received[t] = (received[t] ?? 0) + 1));
    s.players.forEach((p) => {
      const lines: ScoreLine[] = [];
      const add = (rule: ScoreRuleId) => lines.push({ rule, points: SCORE[rule] });
      const st = (stats[p.id] ??= { spotted: 0, spyWins: 0, codewords: 0, suspectVotes: 0 });
      if (r.liarIds.includes(p.id)) {
        if (!r.liarCaught) add('spy-escapes');
        else if (r.liarGuessCorrect) add('spy-cracks-codeword');
        if (locks[p.id] === secret) add('spy-early-lock');
        if (liarWins) st.spyWins++;
        if (locks[p.id] === secret || (r.liarCaught && r.liarGuessCorrect)) st.codewords++;
      } else {
        const v = r.runoffVotes?.[p.id] ?? r.votes[p.id];
        if (r.liarIds.includes(v)) {
          add('agent-spotted-spy');
          st.spotted++;
        }
        if (!liarWins) add('agent-team-win');
        st.suspectVotes += received[p.id] ?? 0;
      }
      breakdown[p.id] = lines;
      deltas[p.id] = lines.reduce((a, l) => a + l.points, 0);
      if (!s.round.practice) p.score += deltas[p.id]; // practice round: shown, not counted
    });
    r.scoreDeltas = deltas;
    r.scoreBreakdown = breakdown;
    s.round.result = r;
    setPhase('results', null);
  }

  function computeAwards(): Award[] {
    const s = S();
    const best = (id: Award['id'], key: keyof (typeof stats)[string], min: number): Award | null => {
      let top: Award | null = null;
      s.players.forEach((p) => {
        const v = stats[p.id]?.[key] ?? 0;
        if (v < min) return;
        if (!top || v > top.value) top = { id, playerIds: [p.id], value: v };
        else if (v === top.value) top.playerIds.push(p.id);
      });
      return top;
    };
    return [best('sharpest-eye', 'spotted', 1), best('smoothest-spy', 'spyWins', 1), best('codebreaker', 'codewords', 1), best('usual-suspect', 'suspectVotes', 2)].filter(
      (a): a is Award => !!a && a.id in AWARDS
    );
  }

  function castBotVote(id: PlayerID) {
    const s = S();
    const pool = runoff ?? s.players.map((p) => p.id);
    const others = pool.filter((p) => p !== id);
    if (!others.length) return;
    const smart = !liarIds.includes(id) && others.includes(liarIds[0]) && Math.random() < 0.55;
    botVotes[id] = smart ? liarIds[0] : pick(others);
    player(id).hasVoted = true;
  }

  function gameOver() {
    const s = S();
    setPhase('game-over', null);
    const top = Math.max(...s.players.map((p) => p.score));
    s.winners = s.players.filter((p) => p.score === top).map((p) => p.id);
    s.awards = computeAwards();
  }

  /** Build any phase directly (used by ?mock= and the dev bar). */
  function jump(phase: string) {
    st = null;
    if (phase === 'home' || phase === 'profile') return;
    lobby('MASK', iAmHost, phase === 'lobby' ? Math.max(2, n - 2) : n);
    if (phase === 'lobby') return;
    if (phase === 'briefing') {
      gamesStarted = 1;
      return startBriefing();
    }
    startRound(phase === 'game-over' ? 5 : 1);
    const s = S();
    s.players.forEach((p, i) => (p.score = [7, 4, 9, 3, 6, 2, 5, 1, 8, 0, 3, 2][i] ?? 0));
    if (phase === 'role-reveal') {
      s.players.forEach((p, i) => (p.ready = i > 0 && i % 2 === 0));
      return;
    }
    s.players.forEach((p) => (p.ready = true));
    if (phase === 'clues') {
      s.round.currentTurn = Math.min(1, s.round.turnOrder.length - 1);
      s.round.turnOrder.slice(0, s.round.currentTurn).forEach(botClue);
      // make sure it's someone else's turn first so both states are easy to see
      setPhase('clues', s.settings.clueSeconds);
      return;
    }
    s.round.turnOrder.forEach(botClue);
    if (phase === 'discussion') return setPhase('discussion', s.settings.discussionSeconds);
    if (phase === 'voting') {
      if (forceRunoff) {
        const tied = [liarIds[0], s.players.find((p) => !liarIds.includes(p.id) && p.id !== ME)!.id];
        const votes: Record<PlayerID, PlayerID> = {};
        s.players.forEach((p, i) => {
          if (p.id === ME) return;
          votes[p.id] = tied[i % 2] === p.id ? tied[(i + 1) % 2] : tied[i % 2];
        });
        return startRunoff(tied, votes);
      }
      setPhase('voting', s.settings.votingSeconds);
      s.players.slice(2).forEach((p, i) => i % 2 === 0 && castBotVote(p.id));
      return;
    }
    s.players.forEach((p) => p.id !== ME && castBotVote(p.id));
    me.myVote = s.players.find((p) => p.id !== ME)!.id;
    if (phase === 'liar-guess') {
      const { votes } = tallyVotes();
      pendingResult = { liarIds, secretWord: secret, accusedId: liarIds[0], liarCaught: true, winner: 'truth-tellers', votes, scoreDeltas: {} };
      return setPhase('liar-guess', s.settings.guessSeconds);
    }
    endVoting();
    if (S().round.phase === 'liar-guess') finish(pick(S().round.topic!.words));
    if (phase === 'game-over') {
      s.players.forEach((p, i) => (stats[p.id] = { spotted: (i * 3) % 5, spyWins: i % 3 === 1 ? 2 : 0, codewords: i === 2 ? 1 : 0, suspectVotes: (i * 2) % 7 }));
      gameOver();
    }
  }

  // ---- the fake server's heartbeat: bots act, timers expire ----
  setInterval(() => {
    if (!st) return;
    const s = st;
    const r = s.round;
    const since = Date.now() - phaseStartedAt;
    let changed = false;
    if (r.phase === 'lobby' && s.players.length < targetPlayers && since > 1400) {
      s.players.push(makePlayer(s.players.length, profile));
      phaseStartedAt = Date.now();
      changed = true;
    }
    if (r.phase === 'briefing') {
      // bots finish the tutorial one by one over a few seconds; the game waits for EVERYONE (you too)
      const unready = s.players.filter((p) => p.id !== ME && !p.ready && p.presence !== 'offline');
      if (unready.length && since > 1500 && Math.random() < 0.25) {
        pick(unready).ready = true;
        changed = true;
      }
      if (s.players.every((p) => p.ready || p.presence === 'offline')) {
        startRound(1);
        changed = true;
      }
    }
    if (r.phase === 'role-reveal') {
      const unready = s.players.filter((p) => p.id !== ME && !p.ready);
      if (unready.length && Math.random() < 0.3) {
        pick(unready).ready = true;
        changed = true;
      }
      if (s.players.every((p) => p.ready || p.presence !== 'online') && since > 600) {
        r.currentTurn = 0;
        setPhase('clues', s.settings.clueSeconds);
        changed = true;
      }
    }
    if (flakyBot && r.phase !== 'lobby' && Math.random() < 0.04) {
      const bot = s.players[s.players.length - 1];
      if (bot && bot.id !== ME) {
        bot.presence = bot.presence === 'away' ? 'online' : 'away';
        if (bot.presence === 'online' && r.phase === 'clues' && r.turnOrder[r.currentTurn] === bot.id && r.phaseEndsAt)
          r.phaseEndsAt = Math.max(r.phaseEndsAt, turnStartedAt + s.settings.clueSeconds * 1000);
        changed = true;
      }
    }
    if (r.phase === 'clues') {
      const cur = r.turnOrder[r.currentTurn];
      if (cur !== ME && player(cur).presence === 'online' && since > 3800) {
        botClue(cur);
        nextTurn();
        changed = true;
      }
    }
    if ((r.phase === 'discussion' || r.phase === 'voting') && liarIds[0] !== ME && locks[liarIds[0]] === undefined && Math.random() < 0.02) {
      locks[liarIds[0]] = Math.random() < 0.35 ? secret : pick(r.topic!.words); // the bot Spy locks in
    }
    if (r.phase === 'discussion' && Math.random() < 0.1) {
      send({ type: 'reaction', reaction: { playerId: pick(s.players.filter((p) => p.id !== ME)).id, emoji: pick(REACTIONS), at: Date.now() } });
    }
    if (r.phase === 'voting') {
      const pending = s.players.filter((p) => p.id !== ME && !p.hasVoted && p.presence === 'online');
      if (pending.length && Math.random() < (runoff ? 0.4 : 0.18)) {
        castBotVote(pick(pending).id);
        changed = true;
      }
      // everyone who's here has voted → don't wait for away players
      const here = s.players.filter((p) => p.presence === 'online');
      if (here.every((p) => p.hasVoted) && here.length > 0) {
        endVoting();
        changed = true;
      }
    }
    if (r.phase === 'liar-guess' && !liarIds.includes(ME) && since > 4500) {
      finish(Math.random() < 0.4 ? secret : pick(r.topic!.words));
      changed = true;
    }
    if (r.phaseEndsAt && Date.now() > r.phaseEndsAt) {
      if (r.phase === 'clues') {
        const cur = player(r.turnOrder[r.currentTurn]);
        if (cur.presence === 'away') toast(`${cur.name} stepped away — skipped`);
        nextTurn();
      } else if (r.phase === 'discussion') setPhase('voting', s.settings.votingSeconds);
      else if (r.phase === 'voting') endVoting();
      else if (r.phase === 'liar-guess') finish();
      changed = true;
    }
    if (changed) push();
  }, 500);

  jump(phaseParam);

  return {
    kind: 'mock',
    initialView: phaseParam === 'profile' ? 'profile' : 'home',
    mock: { phase: phaseParam as Phase, params },
    status: () => 'connected',
    subscribe(fn) {
      subs.add(fn);
      if (st) queueMicrotask(() => fn({ type: 'state', state: view(), you: privateView() }));
      queueMicrotask(() => fn({ type: 'conn', status: 'connected' }));
      return () => {
        subs.delete(fn);
      };
    },
    emit(event, ...args) {
      const a = args as unknown[];
      const ack = a.find((x) => typeof x === 'function') as ((r: unknown) => void) | undefined;
      const s = st;
      switch (event) {
        case 'room:create':
        case 'room:join': {
          const p = (event === 'room:create' ? a[0] : a[1]) as PlayerProfile;
          profile = p;
          targetPlayers = n;
          lobby(event === 'room:join' ? String(a[0]) : 'MASK', event === 'room:create');
          ack?.({ ok: true, code: S().code, playerId: ME, token: 'mock-token' });
          break;
        }
        case 'room:rejoin':
          ack?.({ ok: false, error: 'No such room (mock)' });
          return;
        case 'room:leave':
          st = null;
          return;
        case 'profile:update':
          if (s) Object.assign(player(ME), a[0] as PlayerProfile);
          break;
        case 'settings:update':
          if (s) Object.assign(s.settings, a[0]);
          ack?.({ ok: true });
          break;
        case 'player:kick':
          if (s) s.players = s.players.filter((p) => p.id !== a[0]);
          targetPlayers = Math.max(2, targetPlayers - 1);
          break;
        case 'game:start':
          if (s && s.players.length < s.settings.minPlayers) {
            ack?.({ ok: false, error: `Need at least ${s.settings.minPlayers} players` });
            return;
          }
          gamesStarted++;
          stats = {};
          // mirror the server: the room's first game opens with the briefing tutorial
          if (s?.settings.briefing && gamesStarted === 1) startBriefing();
          else startRound(1);
          ack?.({ ok: true });
          break;
        case 'role:ready':
          if (s) player(ME).ready = true;
          break;
        case 'briefing:ready':
          if (s && s.round.phase === 'briefing') player(ME).ready = true;
          break;
        case 'clue:submit':
          if (s) {
            s.round.clues.push({ playerId: ME, text: String(a[0]), at: Date.now() });
            nextTurn();
          }
          break;
        case 'clue:done':
          if (s) {
            s.round.clues.push({ playerId: s.round.turnOrder[s.round.currentTurn], at: Date.now() });
            nextTurn();
          }
          break;
        case 'phase:skip':
          if (!s) return;
          if (s.round.phase === 'role-reveal') {
            s.round.currentTurn = 0;
            setPhase('clues', s.settings.clueSeconds);
          }
          else if (s.round.phase === 'clues') nextTurn();
          else if (s.round.phase === 'discussion') setPhase('voting', s.settings.votingSeconds);
          else if (s.round.phase === 'voting') endVoting();
          else if (s.round.phase === 'liar-guess') finish();
          break;
        case 'vote:cast':
          if (s) {
            if (runoff && !runoff.includes(String(a[0]))) {
              toast('Sudden death: vote for one of the tied players');
              return;
            }
            me.myVote = String(a[0]);
            player(ME).hasVoted = true;
          }
          break;
        case 'guess:submit':
          if (!s) return;
          if (['clues', 'discussion', 'voting'].includes(s.round.phase)) {
            if (me.role !== 'liar' || locks[ME] !== undefined) {
              toast(me.role !== 'liar' ? 'Only the Spy can guess' : 'You already locked in a guess');
              return;
            }
            locks[ME] = String(a[0]);
          } else finish(String(a[0]));
          break;
        case 'presence':
          if (s) {
            const p = player(ME);
            p.presence = a[0] === 'hidden' ? 'away' : 'online';
          }
          break;
        case 'round:next':
          if (!s) return;
          if (s.round.number >= s.settings.roundsPerGame) gameOver();
          else startRound(s.round.number + 1);
          break;
        case 'game:restart':
          if (!s) return;
          s.players.forEach((p) => (p.score = 0));
          delete s.winners;
          delete s.awards;
          s.round = { ...s.round, number: 0, phase: 'lobby', phaseEndsAt: null, topic: null, turnOrder: [], clues: [], result: null };
          me = { ...me, role: null, secretWord: null, myVote: null };
          break;
        case 'room:unlock':
          if (s && String(a[0]).toUpperCase() === 'PARTY') {
            s.premium = true;
            ack?.({ ok: true });
          } else {
            ack?.({ ok: false, error: 'That code didn’t work (mock code: PARTY)' });
            return;
          }
          break;
        case 'reaction':
          return; // GameProvider echoes locally
      }
      push();
    }
  };
}
