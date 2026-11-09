import React, { useEffect, useMemo, useState } from 'react';
import type { Player, RoundResult } from '@oncealiar/shared';
import { useGame, usePlayers } from '../state/GameProvider';
import { useReducedMotion } from '../state/hooks';
import { Avatar } from '../components/Avatar';
import { useBeatCues, type BeatCue } from '../components/avatars/beats';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { Icon } from '../components/Icon';
import { ReactionBar } from '../components/Dock';
import { sfx } from '../lib/sound';
import { haptic } from '../lib/haptics';
import { colorVar } from '../lib/profile';
import { staggerDelay } from '../lib/motion';
import { CoachTip } from '../components/coach/CoachTip';
import { Stamp } from '../components/Paper';
import { RoundNotes, ScoreBreakdown } from '../components/mechanics';
import './Results.css';

const STAGES = ['votes', 'unmask', 'word', 'winner', 'scores'] as const;
type Stage = (typeof STAGES)[number];
const DURATION: Record<Stage, number> = { votes: 2800, unmask: 2600, word: 2400, winner: 2200, scores: 0 };

function VotesStage({ result, players }: { result: RoundResult; players: Player[] }) {
  const tally = useMemo(() => {
    const m = new Map<string, string[]>();
    Object.entries(result.votes).forEach(([voter, target]) => m.set(target, [...(m.get(target) ?? []), voter]));
    return m;
  }, [result.votes]);
  const targets = players.filter((p) => tally.has(p.id)).sort((a, b) => (tally.get(b.id)!.length - tally.get(a.id)!.length));
  const byId = (id: string) => players.find((p) => p.id === id);
  // vote chips land one after another (160ms apart); the target flinches as each lands,
  // and the accused recoils when the ACCUSED stamp slams.
  let delay = 0;
  const chipDelays = new Map<string, number[]>();
  targets.forEach((t) => chipDelays.set(t.id, tally.get(t.id)!.filter((v) => byId(v)).map(() => (delay += 160))));
  const stampAt = delay + 400;
  return (
    <div className="stage stage--votes">
      <h2 className="display h2">The votes are in</h2>
      {targets.length === 0 && <p className="dim">Nobody voted!</p>}
      <div className="vote-targets">
        {targets.map((t) => (
          <VoteTarget key={t.id} target={t} voters={tally.get(t.id)!.map(byId).filter((p): p is Player => !!p)} chipDelays={chipDelays.get(t.id)!} accused={t.id === result.accusedId} stampAt={stampAt} />
        ))}
      </div>
      {!result.accusedId && <p className="display h3 anim-pop" style={{ animationDelay: `${stampAt}ms` }}>Hung jury! Nobody was accused.</p>}
    </div>
  );
}

function VoteTarget({ target: t, voters, chipDelays, accused, stampAt }: { target: Player; voters: Player[]; chipDelays: number[]; accused: boolean; stampAt: number }) {
  // chip lands ~60% into its 0.6s fly; the stamp's impact frame is ~55% into its 0.48s slam
  const cues = useMemo<BeatCue[]>(
    () => [...chipDelays.map((d) => ({ at: d + 360, id: 'flinch' as const })), ...(accused ? [{ at: stampAt + 260, id: 'accused' as const }] : [])],
    [chipDelays.join(','), accused, stampAt] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const beat = useBeatCues(cues);
  return (
    <div className={`vote-target polaroid ${accused ? 'is-accused' : ''}`} style={{ ['--pc' as string]: colorVar(t.color) }}>
      <span className="polaroid__photo">
        <Avatar avatar={t.avatar} color={t.color} size={72} label={t.name} mood={accused ? 'caught' : 'idle'} beat={beat} />
      </span>
      <b className="vote-target__name">{t.name}</b>
      <div className="vote-target__voters" aria-label={`${voters.length} vote${voters.length > 1 ? 's' : ''}`}>
        {voters.map((vp, i) => (
          <span key={vp.id} className="vote-chip" style={{ animationDelay: `${chipDelays[i]}ms` }} title={vp.name}>
            <Avatar avatar={vp.avatar} color={vp.color} size={24} label={`${vp.name} voted`} />
          </span>
        ))}
      </div>
      {accused && (
        <Stamp rot={-10} slam delay={stampAt} className="vote-target__stamp">
          Accused
        </Stamp>
      )}
    </div>
  );
}

/** spin/scale reveal, on the camera-flash frame (sfx.flash at 950ms; mask comes off at 1s) */
const UNMASK_BEAT = { id: 'unmask', key: 'reveal', delay: 950 } as const;

function WantedPoster({ liar, size = 150, unmask, mood, caption }: { liar: Player; size?: number; unmask?: boolean; mood?: 'caught' | 'win'; caption?: React.ReactNode }) {
  return (
    <div className={`wanted ${unmask ? 'wanted--unmask' : ''}`}>
      <span className="wanted__title">Wanted</span>
      <span className="wanted__photo">
        {unmask && <span className="wanted__flash" aria-hidden="true" />}
        <Avatar avatar={liar.avatar} color={liar.color} size={size} masked={unmask} maskClassName="unmask__mask" label={liar.name} mood={mood} beat={unmask ? UNMASK_BEAT : undefined} />
      </span>
      <span className="wanted__name">{liar.name}</span>
      {caption && <span className="wanted__cap">{caption}</span>}
    </div>
  );
}

function UnmaskStage({ liars, caught }: { liars: Player[]; caught: boolean }) {
  useEffect(() => {
    const t = setTimeout(() => sfx.flash(), 950);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="stage stage--unmask">
      <h2 className="display h2">{liars.length > 1 ? 'The spies were…' : 'The spy was…'}</h2>
      <div className="unmask__row">
        {liars.map((l) => (
          <WantedPoster key={l.id} liar={l} unmask mood={caught ? 'caught' : 'win'} caption="For lying to their friends" />
        ))}
      </div>
      <p className="display h3 unmask__verdict">{caught ? 'Caught red-handed!' : '…and nobody suspected a thing.'}</p>
    </div>
  );
}

function WordStage({ result, liarName }: { result: RoundResult; liarName: string }) {
  return (
    <div className="stage stage--word">
      <h2 className="display h2">The codeword was</h2>
      <div className="word-card">
        <span className="display hl">{result.secretWord}</span>
      </div>
      {result.liarGuess !== undefined && (
        <p className={`word-guess ${result.liarGuessCorrect ? 'is-right' : 'is-wrong'}`}>
          <span className="type">
            {liarName} guessed <b className={result.liarGuessCorrect ? '' : 'word-guess__strike'}>“{result.liarGuess}”</b>
          </span>
          <Stamp tone={result.liarGuessCorrect ? 'green' : 'red'} rot={-8} lg slam delay={1100}>
            {result.liarGuessCorrect ? 'Correct!' : 'Wrong!'}
          </Stamp>
        </p>
      )}
      {result.liarCaught && result.liarGuess === undefined && <p className="type">The spy ran out of time to guess.</p>}
    </div>
  );
}

export function Results() {
  const { game, you, actions } = useGame();
  const { players, isHost, byId } = usePlayers();
  const reduced = useReducedMotion();
  const [stage, setStage] = useState<Stage>(reduced ? 'scores' : 'votes');
  const result = game?.round.result;

  useEffect(() => {
    if (stage === 'scores') return;
    const t = setTimeout(() => setStage(STAGES[STAGES.indexOf(stage) + 1]), DURATION[stage]);
    return () => clearTimeout(t);
  }, [stage]);

  const liarIds = result?.liarIds ?? [];
  const iWon = !!result && !!you && (result.winner === 'liar' ? liarIds.includes(you.playerId) : !liarIds.includes(you.playerId));

  useEffect(() => {
    if (!result) return;
    if (stage === 'votes') sfx.paper();
    if (stage === 'unmask') {
      sfx.liar();
      haptic('slam');
    }
    if (stage === 'votes') window.setTimeout(() => sfx.stamp(), 1400);
    if (stage === 'word') {
      sfx.reveal();
      if (result.liarGuess !== undefined) window.setTimeout(() => sfx.stamp(), 1150);
    }
    if (stage === 'winner') {
      sfx.stamp();
      if (iWon) sfx.win();
      else sfx.lose();
      haptic(iWon ? 'win' : 'lose');
    }
  }, [stage, result, iWon]);

  if (!game || !you || !result) return null;
  const liars = liarIds.map((id) => byId(id)).filter(Boolean) as Player[];
  const liarName = liars.map((l) => l.name).join(' & ') || 'The spy';
  const liarWins = result.winner === 'liar';
  const last = game.round.number >= game.settings.roundsPerGame;
  const ranked = [...players].sort((a, b) => b.score - a.score);
  const showSummary = stage === 'winner' || stage === 'scores';
  const many = liars.length > 1;
  const headline: [string, string] = liarWins
    ? result.liarCaught
      ? [many ? 'Spies cracked' : 'Spy cracked', 'the code!']
      : [many ? 'Spies' : 'Spy', 'escaped!']
    : [many ? 'Spies' : 'Spy', 'exposed!'];
  const summary = liarWins
    ? result.liarCaught
      ? `${liarName} got caught, then guessed “${result.liarGuess ?? result.secretWord}”. Unbelievable.`
      : `${liarName} slipped away. Nobody suspected a thing.`
    : result.liarGuess !== undefined
      ? `${liarName}’s last-ditch guess: “${result.liarGuess}”. Wrong. The agents win.`
      : `The agents caught ${liarName}. Justice is served.`;
  const votesFor = (id: string) => Object.values(result.votes).filter((t) => t === id).length;
  const top = Math.max(1, ...players.map((p) => p.score));

  return (
    <main className="screen screen--wide results">
      {!showSummary && (
        <div className="results__stage" key={stage}>
          {stage === 'votes' && <VotesStage result={result} players={players} />}
          {stage === 'unmask' && <UnmaskStage liars={liars} caught={result.liarCaught} />}
          {stage === 'word' && <WordStage result={result} liarName={liarName} />}
          <button className="btn btn--quiet btn--sm results__skip" onClick={() => setStage('scores')}>
            Skip <Icon name="skip" size={16} />
          </button>
        </div>
      )}

      {showSummary && (
        <>
          <header className="masthead">
            <div className="masthead__meta">
              <span>The Daily Fib · Extra!</span>
              <span>
                Round {game.round.number} results
              </span>
            </div>
          </header>
          <CoachTip phase="results" role={you.role} />
          <h1 className={`results__headline display ${liarWins ? 'is-liar' : 'is-truth'}`}>
            {headline[0]}
            <br />
            <span className="results__headline-hi">{headline[1]}</span>
          </h1>
          <RoundNotes result={result} nameOf={(id) => byId(id)?.name ?? 'Someone'} />
          <p className={`results__you type ${iWon ? 'is-win' : ''}`}>{iWon ? '★ You win this round' : 'You lose this round'}</p>

          <section className="results__story">
            <div className="results__posters">
              {liars.map((l) => (
                <WantedPoster
                  key={l.id}
                  liar={l}
                  size={liars.length > 1 ? 70 : 96}
                  mood={result.liarCaught ? 'caught' : 'win'}
                  caption={`${votesFor(l.id)} of ${Object.keys(result.votes).length} votes`}
                />
              ))}
            </div>
            <div className="results__word">
              <span className="eyebrow">The codeword was</span>
              <span className="display results__cw">{result.secretWord}</span>
              <p className="results__sub">{summary}</p>
            </div>
          </section>

          {stage === 'scores' && (
            <section className="scoreboard" aria-labelledby="scoreboard-h">
              <h2 className="display h3" id="scoreboard-h">
                The scoreboard
              </h2>
              <ol className="scores__list">
                {ranked.map((p, i) => {
                  const d = result.scoreDeltas[p.id] ?? 0;
                  const spy = liarIds.includes(p.id);
                  return (
                    <li
                      key={p.id}
                      className={`scores__row ${p.id === you.playerId ? 'is-you' : ''} ${spy ? 'is-spy' : ''}`}
                      style={{ animationDelay: `${staggerDelay(i, 70)}ms`, ['--to' as string]: `${(p.score / top) * 100}%`, ['--d' as string]: `${400 + staggerDelay(i, 90)}ms`, ['--k' as string]: p.score > 0 ? Math.max(0, (p.score - d) / p.score) : 0 }}
                    >
                      <span className="scores__name">
                        {p.name}
                        {spy && <span className="scores__tag">Spy</span>}
                      </span>
                      <span className="scores__track" aria-hidden="true">
                        <span className="scores__bar" />
                      </span>
                      <span className="scores__nums">
                        <span className={`scores__delta ${d > 0 ? '' : 'is-zero'}`}>+{d}</span>
                        <span className="scores__total display" aria-label={`${p.score} points`}>
                          <AnimatedNumber from={p.score - d} to={p.score} delay={500 + staggerDelay(i, 90)} />
                        </span>
                      </span>
                      <span className="scores__why">
                        <ScoreBreakdown result={result} playerId={p.id} compact />
                      </span>
                    </li>
                  );
                })}
              </ol>
            </section>
          )}

          <div className="discuss__react">
            <span className="eyebrow center">Stamp a reaction</span>
            <ReactionBar />
          </div>
          <div className="results__next">
            {isHost ? (
              <button
                className="btn btn--primary btn--lg btn--block"
                onClick={() => {
                  sfx.paper();
                  actions.next();
                }}
              >
                {last ? 'Print the final edition' : 'Next round'} <Icon name="right" />
              </button>
            ) : (
              <div className="waitbar">
                <span className="waitbar__dot" aria-hidden="true" />
                Waiting for the host…
              </div>
            )}
          </div>
        </>
      )}
    </main>
  );
}
