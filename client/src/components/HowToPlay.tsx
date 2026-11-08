import React, { useRef, useState } from 'react';
import { RULES_ONE_LINERS, SCORE, SCORE_RULES } from '@oncealiar/shared';
import { Sheet } from './Sheet';
import { Avatar } from './Avatar';
import { Icon } from './Icon';
import './HowToPlay.css';

function MiniCard({ liar, word = 'Pineapple' }: { liar?: boolean; word?: string }) {
  return (
    <div className={`htp-card ${liar ? 'htp-card--liar' : ''}`}>
      {liar ? (
        <>
          <svg viewBox="0 0 64 40" width="40" aria-hidden="true">
            <path d="M3 9 Q17 1 32 9 Q47 1 61 9 Q61 31 45 33 Q36 34 32 25 Q28 34 19 33 Q3 31 3 9 Z" fill="var(--on-accent)" />
          </svg>
          <b>SPY</b>
        </>
      ) : (
        <>
          <span className="htp-card__emoji">🍕</span>
          <b>{word}</b>
        </>
      )}
    </div>
  );
}

const STEPS: { title: string; body: string; tail?: string; art: React.ReactNode }[] = [
  {
    title: 'One Spy, one codeword',
    body: 'Everyone sees the same 16-word grid. Agents also see the secret codeword.',
    tail: '…the Spy doesn\u2019t, and has to bluff.',
    art: (
      <div className="htp-art htp-art--cards">
        <MiniCard />
        <MiniCard liar />
        <MiniCard />
      </div>
    )
  },
  {
    title: 'One clue each, then vote',
    body: `${RULES_ONE_LINERS.clues} Then discuss and vote: most votes is accused. Tied? A 10-second sudden-death re-vote.`,
    art: (
      <div className="htp-art htp-art--clues">
        {[
          ['chancla', 'coral', 'Tropical'],
          ['pigeon', 'sky', 'Sweet'],
          ['duck', 'orchid', 'Hmm… cheesy?']
        ].map(([a, c, w], i) => (
          <div key={a} className="htp-clue" style={{ animationDelay: `${i * 0.15}s` }}>
            <Avatar avatar={a} color={c} size={48} label="" />
            <span className="htp-bubble">{w}</span>
          </div>
        ))}
      </div>
    )
  },
  {
    title: 'Caught? One last guess',
    body: `${RULES_ONE_LINERS.lastGuess} Sure early? The Spy can lock in a guess for +${SCORE['spy-early-lock']} — it becomes their final answer.`,
    art: (
      <div className="htp-art htp-art--vote">
        <Avatar avatar="gnome" color="lime" size={52} label="" />
        <span className="htp-arrow" aria-hidden="true">→</span>
        <div className="htp-accused">
          <Avatar avatar="duck" color="orchid" size={72} label="" masked />
          <span className="htp-votes">×3</span>
        </div>
        <span className="htp-arrow" aria-hidden="true">←</span>
        <Avatar avatar="pina" color="tangerine" size={52} label="" />
      </div>
    )
  },
  {
    title: 'Scoring',
    body: 'The Spy changes every round, so everyone gets a shot at the big points.',
    tail: 'Stepped away to answer a text? Your seat is kept for 2 minutes.',
    art: (
      <ul className="htp-score">
        {SCORE_RULES.map((r) => (
          <li key={r.id}>
            <b>+{r.points}</b>
            <span>
              <span className={`htp-role htp-role--${r.role}`}>{r.role === 'spy' ? 'Spy' : 'Agent'}</span> {r.rule.replace(/^(Spy|Agents?): /, '')}
            </span>
          </li>
        ))}
      </ul>
    )
  }
];

export function HowToPlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [idx, setIdx] = useState(0);
  const track = useRef<HTMLDivElement>(null);
  const go = (i: number) => {
    const n = Math.max(0, Math.min(STEPS.length - 1, i));
    setIdx(n);
    const el = track.current;
    if (el) el.scrollTo({ left: n * el.clientWidth, behavior: 'smooth' });
  };
  const last = idx === STEPS.length - 1;
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="How to play"
      footer={
        <>
          <button className="btn btn--ghost btn--sm" onClick={() => go(idx - 1)} disabled={idx === 0} aria-label="Previous step">
            <Icon name="left" size={18} /> Back
          </button>
          <button className="btn btn--primary btn--sm" onClick={() => (last ? onClose() : go(idx + 1))}>
            {last ? "Let's play" : 'Next'} {!last && <Icon name="right" size={18} />}
          </button>
        </>
      }
    >
      <div
        className="htp-track"
        ref={track}
        onScroll={(e) => {
          const el = e.currentTarget;
          const n = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
          if (n !== idx) setIdx(n);
        }}
      >
        {STEPS.map((s, i) => (
          <section key={s.title} className="htp-step" aria-roledescription="slide" aria-label={`Step ${i + 1} of ${STEPS.length}`} aria-hidden={i !== idx}>
            {s.art}
            <span className="eyebrow">{i === STEPS.length - 1 ? 'Points' : `Step ${i + 1}`}</span>
            <h3 className="display h2">{s.title}</h3>
            <p className="dim">{s.body}</p>
            {s.tail && <p className="accent htp-tail">{s.tail}</p>}
          </section>
        ))}
      </div>
      <div className="htp-dots" role="tablist" aria-label="Steps">
        {STEPS.map((s, i) => (
          <button key={s.title} role="tab" aria-selected={i === idx} aria-label={`Step ${i + 1}`} className={`htp-dot ${i === idx ? 'is-on' : ''}`} onClick={() => go(i)} />
        ))}
      </div>
    </Sheet>
  );
}
