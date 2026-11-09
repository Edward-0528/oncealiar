import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { DEFAULT_SETTINGS, SCORE } from '@oncealiar/shared';
import { Avatar } from '../Avatar';
import { Fingerprint, Redacted, Stamp } from '../Paper';
import { TopicGrid } from '../TopicGrid';
import { colorVar } from '../../lib/profile';
import '../../screens/RoleReveal.css';
import '../../screens/Clues.css';
import '../../screens/Discussion.css';
import '../../screens/Phases.css';
import '../Countdown.css';
import '../Dock.css';
import './GameDemo.css';

/**
 * The animated "how to play" demo: a phone-shaped frame that plays five short scenes
 * built from the game's REAL pieces (Avatar beats, Stamp, TopicGrid, the dossier, turn
 * strip, evidence board and dock status line) fed with fake data. Used by the group
 * briefing (screens/Briefing) and the How to play sheet.
 *
 * Motion ("Ink & Impact"): the scene sequence is the only thing that loops; characters
 * move only on scripted beats. Under reduced motion scenes just crossfade.
 */

/* ------------------------------------------------------------------ demo data */

type CastId = 'maya' | 'leo' | 'jonah' | 'you';
interface CastMember {
  id: CastId;
  name: string;
  avatar: string;
  color: string;
}
const CAST: Record<CastId, CastMember> = {
  maya: { id: 'maya', name: 'Maya', avatar: 'chancla', color: 'coral' },
  leo: { id: 'leo', name: 'Leo', avatar: 'duck', color: 'orchid' }, // the Spy
  jonah: { id: 'jonah', name: 'Jonah', avatar: 'pigeon', color: 'sky' },
  you: { id: 'you', name: 'You', avatar: 'gnome', color: 'lime' }
};
const TURNS: { who: CastId; word: string }[] = [
  { who: 'maya', word: 'Cheese' },
  { who: 'leo', word: 'Round' },
  { who: 'jonah', word: 'Slice' },
  { who: 'you', word: 'Delivery' }
];
export const DEMO_CODEWORD = 'Pizza';
const TOPIC = { name: 'Takeout', emoji: '🥡' };
const WORDS = ['Pizza', 'Sushi', 'Tacos', 'Burger', 'Ramen', 'Curry', 'Kebab', 'Wings', 'Pho', 'Bagel', 'Salad', 'Fries', 'Hotdog', 'Waffle', 'Nachos', 'Donut'];

/* ------------------------------------------------------------------ scenes */

export interface DemoScene {
  id: string;
  /** big plain-language caption */
  caption: string;
  /** one supporting line */
  sub: string;
  /** total length, ms */
  duration: number;
  /** ms after the scene starts at which `step` advances (step = cues passed) */
  cues: number[];
}

export const DEMO_SCENES: DemoScene[] = [
  {
    id: 'file',
    caption: 'Everyone opens a secret file',
    sub: 'Agents see the codeword. The Spy doesn’t. Closed, every file looks the same.',
    duration: 7600,
    cues: [900, 3300, 3900, 4700]
  },
  {
    id: 'clues',
    caption: 'Take turns saying ONE word',
    sub: 'Prove you know the codeword without saying it. The Spy has to bluff.',
    duration: 7600,
    cues: [700, 1700, 2400, 3400, 4100, 5100, 5800]
  },
  {
    id: 'debate',
    caption: 'Look up and argue',
    sub: 'Phones down. Who sounded vague?',
    duration: 6400,
    cues: [900, 2300, 3800]
  },
  {
    id: 'vote',
    caption: 'Vote for the Spy',
    sub: 'Most votes is accused. Votes stay secret until the reveal.',
    duration: 6800,
    cues: [900, 1900, 2900, 3900]
  },
  {
    id: 'guess',
    caption: 'Caught? The Spy gets one guess',
    sub: 'Guess the codeword and the Spy steals the round.',
    duration: 9000,
    cues: [1300, 2300, 3900]
  }
];

export const DEMO_TOTAL_MS = DEMO_SCENES.reduce((a, s) => a + s.duration, 0);
/** "40 seconds": the loop length, rounded up to the next 10 s (shown in copy). */
export const BRIEFING_SECONDS = Math.ceil(DEMO_TOTAL_MS / 10_000) * 10;

/* ------------------------------------------------------------------ player */

export interface DemoPosition {
  scene: number;
  step: number;
  /** bumps on every scene start (remount key: replays entrance animations) */
  run: number;
}

/** Drives the scene sequence: one timer at a time, loops forever, `go(i)` jumps. */
export function useDemoPlayer(scenes: DemoScene[] = DEMO_SCENES, { playing = true, start }: { playing?: boolean; start?: { scene: number; step: number } } = {}) {
  const [pos, setPos] = useState<DemoPosition>({ scene: start?.scene ?? 0, step: start?.step ?? 0, run: 0 });
  useEffect(() => {
    if (!playing) return;
    const s = scenes[pos.scene];
    const prevAt = pos.step === 0 ? 0 : s.cues[pos.step - 1];
    const nextAt = pos.step < s.cues.length ? s.cues[pos.step] : s.duration;
    const t = window.setTimeout(() => {
      setPos((p) => (p.step < scenes[p.scene].cues.length ? { ...p, step: p.step + 1 } : { scene: (p.scene + 1) % scenes.length, step: 0, run: p.run + 1 }));
    }, Math.max(0, nextAt - prevAt));
    return () => window.clearTimeout(t);
  }, [pos, playing, scenes]);
  const go = useCallback((scene: number) => setPos((p) => ({ scene: ((scene % scenes.length) + scenes.length) % scenes.length, step: 0, run: p.run + 1 })), [scenes.length]);
  return { ...pos, go, current: scenes[pos.scene] };
}

/** Dev/mock only: `?demo=2.3` freezes the demo on scene 2, step 3 (1-based scene) for screenshots. */
export function parseDemoFreeze(v: string | null | undefined): { scene: number; step: number } | null {
  const m = v?.match(/^(\d+)(?:\.(\d+))?$/);
  if (!m) return null;
  const scene = Math.min(DEMO_SCENES.length, Math.max(1, Number(m[1]))) - 1;
  return { scene, step: Math.min(DEMO_SCENES[scene].cues.length, Number(m[2] ?? 0)) };
}

/* ------------------------------------------------------------------ small pieces */

function Who({ id, size = 40, beat, mood, masked }: { id: CastId; size?: number | string; beat?: React.ComponentProps<typeof Avatar>['beat']; mood?: React.ComponentProps<typeof Avatar>['mood']; masked?: boolean }) {
  const c = CAST[id];
  return <Avatar avatar={c.avatar} color={c.color} size={size} label="" beat={beat} mood={mood} masked={masked} />;
}

/** A finger press: a ring that lands where the "player" taps. */
function Touch({ className = '' }: { className?: string }) {
  return <span className={`demo-touch ${className}`} aria-hidden="true" />;
}

/** The real dock status line look: "YOU: …" / "WAITING ON: …" + clock. */
function StatusLine({ kind, text, time, label }: { kind: 'you' | 'waiting'; text: string; time?: string; label?: string }) {
  return (
    <div className="demo-dock">
      <div className="dock__bar">
        <div className={`dock__status dock__status--${kind}`}>
          <span className="dock__status-text">
            <b>{label ?? (kind === 'you' ? 'You:' : 'Waiting on:')}</b> {text}
          </span>
          {time && <span className="dock__status-time">{time}</span>}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ scene 1: the file */

function FileScene({ step }: { step: number }) {
  // 0 Maya's closed file · 1 open (Agent) · 2 closed · 3 Leo's closed file · 4 open (Spy)
  const spy = step >= 3;
  const open = step === 1 || step === 4;
  const owner = spy ? CAST.leo : CAST.maya;
  return (
    <div className="demo-file">
      <p className="demo-file__owner type" key={owner.id}>
        <Avatar avatar={owner.avatar} color={owner.color} size={26} label="" /> {owner.name}’s phone
      </p>
      <div className={`rcard demo-rcard ${open ? 'is-flipped' : ''} ${open ? (spy ? 'rcard--liar' : 'rcard--agent') : ''}`}>
        <span className="rcard__inner">
          <span className="rcard__face rcard__back">
            <Stamp lg rot={-9} className="rcard__topsecret">
              Top secret
            </Stamp>
            <span className="rcard__eyes type">EYES ONLY: {owner.name.toUpperCase()}</span>
            <Fingerprint size={56} />
            <span className="display demo-file__hold">Press &amp; hold to open</span>
            {(step === 0 || step === 3) && <Touch className="demo-touch--file" key={`t${step}`} />}
          </span>
          <span className="rcard__face rcard__front">
            {open && !spy && (
              <span className="dossier dossier--agent">
                <span className="dossier__head">
                  <span className="dossier__lines type">
                    <span>AGENT: MAYA</span>
                    <span>TOPIC: {TOPIC.name}</span>
                  </span>
                  <Stamp tone="blue" rot={-8} className="dossier__stamp" slam>
                    Cleared
                  </Stamp>
                </span>
                <span className="dossier__role">
                  <span className="type dossier__k">CODEWORD</span>
                  <span className="display rcard__word demo-file__word hl">{DEMO_CODEWORD}</span>
                </span>
                <TopicGrid words={WORDS} highlight={DEMO_CODEWORD} compact label="Possible codewords" />
              </span>
            )}
            {open && spy && (
              <span className="dossier dossier--spy">
                <span className="dossier__role">
                  <span className="type dossier__k">ASSIGNED ROLE</span>
                  <span className="dossier__role-row">
                    <span className="display rcard__liar-title demo-file__spy">The Spy</span>
                    <Stamp rot={-8} className="dossier__stamp" slam>
                      Classified
                    </Stamp>
                  </span>
                </span>
                <span className="dossier__facts type">
                  <span className="dossier__cw">
                    CODEWORD: <Redacted text="XXXXXXXXXX" label="Codeword redacted" className="dossier__bar" />
                  </span>
                  <span className="demo-file__nope">You don’t know the word. Blend in.</span>
                </span>
                <TopicGrid words={WORDS} compact label="Possible codewords" />
              </span>
            )}
          </span>
        </span>
      </div>
      <p className="demo-file__note type">{open ? 'Only you can see inside.' : 'Closed, every file looks the same.'}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ scene 2: clues */

function CluesScene({ step }: { step: number }) {
  // turn t starts at step 2t, its word lands at step 2t+1; step 7 = everyone has spoken
  const turn = Math.min(3, Math.floor(step / 2));
  const spoke = (i: number) => step >= 2 * i + 1;
  const done = step >= 7;
  const cur = TURNS[turn];
  const mine = cur.who === 'you' && !done;
  const spyTalking = cur.who === 'leo' && spoke(1);
  return (
    <div className="demo-clues">
      <p className="demo-meta type">
        <span>Clue round</span>
        <span>
          Statement {turn + 1} of {TURNS.length}
        </span>
      </p>
      <ol className="turn-strip demo-strip">
        {TURNS.map((t, i) => {
          const state = done || i < turn ? 'is-done' : i === turn ? 'is-current' : '';
          return (
            <li key={t.who} className={`turn-strip__item ${state}`}>
              <span className={`pin ${i === turn && !done ? 'pin--red' : ''}`} aria-hidden="true" />
              <span className="turn-strip__av">
                <Who id={t.who} size={36} beat={i === turn - 1 && !done ? { id: 'gag', key: `g${turn}` } : undefined} />
              </span>
              <span className="turn-strip__name">{CAST[t.who].name}</span>
              {spoke(i) && <span className={`demo-strip__word ${t.who === 'leo' ? 'is-vague' : ''}`}>{t.word}</span>}
            </li>
          );
        })}
      </ol>
      <section className={`spotlight demo-spot ${mine ? 'spotlight--you' : ''}`} key={turn}>
        <div className="demo-spot__row">
          <span className="spotlight__photo demo-spot__photo">
            <Who id={cur.who} size={70} beat={{ id: 'nudge', key: `n${turn}` }} mood={spyTalking ? 'sus' : 'idle'} />
          </span>
          {spoke(turn) ? (
            <span className={`demo-bubble ${cur.who === 'leo' ? 'is-vague' : ''}`} key={`b${turn}`}>
              “{cur.word}”
            </span>
          ) : (
            <span className="demo-bubble demo-bubble--think" key={`t${turn}`}>
              …
            </span>
          )}
        </div>
        <p className="demo-spot__sub">{spyTalking ? 'Hmm… a bit vague?' : mine ? 'Your turn! Say ONE word.' : `${CAST[cur.who].name}’s turn`}</p>
      </section>
      {done ? (
        <StatusLine kind="waiting" label="Next:" text="Debate" />
      ) : mine ? (
        <StatusLine kind="you" text="Say your clue out loud" time="0:30" />
      ) : (
        <StatusLine kind="waiting" text={CAST[cur.who].name} time={spoke(turn) ? '0:17' : '0:28'} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ scene 3: debate */

function DemoRing({ size, total, left }: { size: number; total: number; left: number }) {
  const stroke = Math.max(6, size * 0.07);
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <div className={`ring ${left <= 5 ? 'ring--urgent' : ''}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle className="ring__track" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} />
        <circle
          className="ring__bar"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - left / total)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="ring__inner">
        <span className="discuss__clock demo-clock">0:{String(left).padStart(2, '0')}</span>
      </div>
    </div>
  );
}

function DebateScene({ step }: { step: number }) {
  // the clock is part of the scene: it counts down once per second while the scene plays
  const [left, setLeft] = useState(18);
  useEffect(() => {
    const id = window.setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(id);
  }, []);
  // one speaker at a time: Maya questions the clue, Leo (the Spy) bluffs, Jonah isn't buying it
  const lines: { who: CastId; text: string }[] = [
    { who: 'maya', text: 'Round? Really?' },
    { who: 'leo', text: 'Lots of food is round!' },
    { who: 'jonah', text: 'Sounds like a bluff…' }
  ];
  const speaking = step >= 1 ? lines[Math.min(step, 3) - 1] : null;
  return (
    <div className="demo-debate">
      <div className="demo-debate__hero">
        <DemoRing size={104} total={20} left={left} />
        <h3 className="display discuss__title demo-debate__title">
          Look up.
          <span className="discuss__title-sub">Who’s the Spy?</span>
        </h3>
      </div>
      <div className="demo-debate__table">
        {(['maya', 'leo', 'jonah'] as CastId[]).map((id) => {
          const line = speaking?.who === id ? speaking : null;
          const beat = id === 'maya' && step >= 1 ? { id: 'nudge' as const, key: 'm' } : id === 'leo' && step >= 2 ? { id: 'gag' as const, key: 'l' } : id === 'jonah' && step >= 3 ? { id: 'nudge' as const, key: 'j' } : undefined;
          return (
            <div key={id} className={`demo-debate__seat demo-debate__seat--${id}`}>
              {line && (
                <span className="demo-bubble demo-bubble--sm" key={line.text}>
                  {line.text}
                </span>
              )}
              <span className="demo-debate__av">
                <Who id={id} size={64} beat={id === 'leo' && step >= 3 ? { id: 'flinch', key: 'sus' } : beat} mood={id !== 'leo' && step >= 2 ? 'sus' : 'idle'} />
                {id === 'leo' && step >= 3 && (
                  <Stamp rot={-10} slam className="demo-debate__sus">
                    Sus
                  </Stamp>
                )}
              </span>
              <span className="demo-debate__name type">{CAST[id].name}</span>
            </div>
          );
        })}
      </div>
      <StatusLine kind="you" text="Look up and talk it out" time={`0:${String(left).padStart(2, '0')}`} />
    </div>
  );
}

/* ------------------------------------------------------------------ scene 4: vote */

const VOTERS: CastId[] = ['maya', 'jonah', 'you'];

function VoteScene({ step }: { step: number }) {
  // votes 1..3 land on Leo at steps 1..3, ACCUSED at step 4
  const votes = Math.min(3, step);
  const accused = step >= 4;
  const order: CastId[] = ['maya', 'leo', 'jonah', 'you'];
  const status = accused
    ? { kind: 'waiting' as const, label: 'Accused:', text: 'Leo, 3 votes' }
    : step >= 3
      ? { kind: 'waiting' as const, text: 'Leo', time: '0:09' }
      : { kind: 'you' as const, text: 'Vote for the Spy', time: step < 2 ? '0:21' : '0:14' };
  return (
    <div className="demo-vote">
      <p className="demo-meta type">
        <span>Who’s the spy?</span>
        <span>{accused ? 4 : votes}/4 voted</span>
      </p>
      <div className="board demo-board">
        <div className="board__grid demo-board__grid">
          {order.map((id) => {
            const isLeo = id === 'leo';
            const vi = VOTERS.indexOf(id);
            const voted = accused || (vi >= 0 && vi < votes);
            return (
              <div key={id} className={`suspect polaroid demo-suspect ${isLeo && votes > 0 ? 'is-picked' : ''}`}>
                <span className={`pin ${isLeo && votes > 0 ? 'pin--red' : ''}`} aria-hidden="true" />
                <span className="polaroid__photo">
                  <Who
                    id={id}
                    size="78%"
                    mood={isLeo ? (accused ? 'caught' : votes > 0 ? 'sus' : 'idle') : 'idle'}
                    beat={isLeo && accused ? { id: 'accused', key: 'acc' } : isLeo && votes > 0 ? { id: 'flinch', key: `f${votes}` } : undefined}
                  />
                </span>
                <span className="suspect__name">{CAST[id].name}</span>
                <span className={`suspect__status ${voted ? 'is-voted' : ''}`}>{voted ? '✓ Voted' : 'Deciding'}</span>
                {isLeo && votes > 0 && (
                  <span className="demo-votes" key={votes}>
                    {VOTERS.slice(0, votes).map((v) => (
                      <span key={v} className="demo-votes__chip" style={{ ['--pc' as string]: colorVar(CAST[v].color) }}>
                        <Who id={v} size={22} />
                      </span>
                    ))}
                  </span>
                )}
                {isLeo && accused && (
                  <Stamp rot={-10} slam className="suspect__stamp demo-accused">
                    Accused
                  </Stamp>
                )}
                {isLeo && step === 2 && <Touch className="demo-touch--vote" key="tv" />}
              </div>
            );
          })}
        </div>
      </div>
      <StatusLine {...status} />
    </div>
  );
}

/* ------------------------------------------------------------------ scene 5: guess + points */

function GuessScene({ step }: { step: number }) {
  // 0 caught, grid · 1 taps Pizza · 2 CRACKED IT · 3 the points
  if (step >= 3) {
    const rows: { who: string; what: string; pts: number; tone: 'agent' | 'spy' }[] = [
      { who: 'Agents', what: 'Voted for the Spy', pts: SCORE['agent-spotted-spy'], tone: 'agent' },
      { who: 'Spy', what: 'Escapes the vote', pts: SCORE['spy-escapes'], tone: 'spy' },
      { who: 'Spy', what: 'Caught, but steals the codeword', pts: SCORE['spy-cracks-codeword'], tone: 'spy' }
    ];
    return (
      <div className="demo-points">
        <h3 className="display demo-points__title">Points</h3>
        <ul className="demo-points__list">
          {rows.map((r, i) => (
            <li key={r.what} className="demo-points__row" style={{ animationDelay: `${i * 160}ms` }}>
              <b className="display demo-points__pts">+{r.pts}</b>
              <span>
                <span className={`demo-points__role demo-points__role--${r.tone}`}>{r.who}</span>
                {r.what}
              </span>
            </li>
          ))}
        </ul>
        <p className="demo-points__foot type">New Spy every round. First to {DEFAULT_SETTINGS.targetScore} points wins.</p>
      </div>
    );
  }
  return (
    <div className="demo-guess">
      <div className="demo-guess__head">
        <span className="demo-guess__mug">
          <Who id="leo" size={54} mood={step >= 2 ? 'win' : 'caught'} beat={step >= 2 ? { id: 'gloat', key: 'w' } : undefined} />
        </span>
        <span className="demo-guess__txt">
          <span className="display demo-guess__title">Leo was the Spy!</span>
          <span className="type">One guess to steal the round…</span>
        </span>
      </div>
      <div className="demo-guess__grid">
        <p className="demo-guess__ask type">{step === 0 ? 'Leo taps a word…' : `Leo guessed “${DEMO_CODEWORD}”`}</p>
        <TopicGrid words={WORDS} compact selectable selected={step >= 1 ? DEMO_CODEWORD : null} label="Spy's guess" />
        {step === 0 && <Touch className="demo-touch--grid" />}
        {step >= 2 && (
          <Stamp tone="solid" rot={-8} slam className="demo-guess__stamp">
            Cracked it! +{SCORE['spy-cracks-codeword']}
          </Stamp>
        )}
      </div>
    </div>
  );
}

const SCENE_VIEWS: Record<string, (p: { step: number }) => React.ReactElement> = {
  file: FileScene,
  clues: CluesScene,
  debate: DebateScene,
  vote: VoteScene,
  guess: GuessScene
};

/* ------------------------------------------------------------------ frame + dots */

/** The phone frame. Purely visual (inert + aria-hidden): the caption carries the meaning. */
export function DemoPhone({ scene, step, run, className = '' }: { scene: number; step: number; run: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    ref.current?.setAttribute('inert', '');
  }, []);
  const s = DEMO_SCENES[scene];
  const View = SCENE_VIEWS[s.id];
  return (
    <div className={`demo-phone ${className}`} ref={ref} aria-hidden="true" data-scene={s.id} data-step={step}>
      <span className="demo-phone__notch" />
      <div className="demo-phone__screen">
        <div className="demo-scene" key={run}>
          <View step={step} />
        </div>
      </div>
    </div>
  );
}

export function DemoDots({ scene, onGo, scenes = DEMO_SCENES }: { scene: number; onGo: (i: number) => void; scenes?: DemoScene[] }) {
  return (
    <div className="demo-dots" role="group" aria-label="Tutorial scenes">
      {scenes.map((s, i) => (
        <button key={s.id} type="button" className={`demo-dot ${i === scene ? 'is-on' : ''}`} aria-label={`Scene ${i + 1} of ${scenes.length}: ${s.caption}`} aria-current={i === scene ? 'step' : undefined} onClick={() => onGo(i)}>
          <span className="demo-dot__n">{i + 1}</span>
        </button>
      ))}
    </div>
  );
}

/** Self-contained player (How to play sheet): caption, phone, dots. */
export function GameDemo({ className = '' }: { className?: string }) {
  const p = useDemoPlayer();
  return (
    <div className={`demo ${className}`}>
      <div className="demo__cap" aria-live="polite">
        <span className="eyebrow">
          Step {p.scene + 1} of {DEMO_SCENES.length}
        </span>
        <h3 className="display demo__caption">{p.current.caption}</h3>
        <p className="demo__sub">{p.current.sub}</p>
      </div>
      <DemoPhone scene={p.scene} step={p.step} run={p.run} />
      <DemoDots scene={p.scene} onGo={p.go} />
    </div>
  );
}

