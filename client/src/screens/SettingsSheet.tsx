import React, { useState } from 'react';
import { TARGET_SCORES, type GameSettings } from '@oncealiar/shared';
import { targetOf } from '../lib/gameEnd';
import { useGame, usePlayers } from '../state/GameProvider';
import { Sheet } from '../components/Sheet';
import { Icon } from '../components/Icon';
import { PremiumModal } from '../components/PremiumModal';
import { PresetPicker } from '../components/mechanics';
import './SettingsSheet.css';

function Segmented<T extends string | number>({ label, value, options, onChange, format }: { label: string; value: T; options: readonly T[]; onChange: (v: T) => void; format?: (v: T) => string }) {
  return (
    <div className="field">
      <span className="field__label">{label}</span>
      <div className="seg" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button key={String(o)} role="radio" aria-checked={o === value} className={`seg__opt ${o === value ? 'is-on' : ''}`} onClick={() => onChange(o)}>
            {format ? format(o) : String(o)}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle">
      <span className="toggle__txt">
        <b>{label}</b>
        {hint && <small>{hint}</small>}
      </span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle__track" aria-hidden="true" />
    </label>
  );
}

type WinChoice = number | 'rounds';

/** First to 10 / 15 / 20 points, or a fixed number of rounds (shows the rounds stepper). */
export function WinCondition({ settings: s, onChange: set }: { settings: GameSettings; onChange: (patch: Partial<GameSettings>) => void }) {
  const target = targetOf(s);
  const value: WinChoice = target > 0 ? target : 'rounds';
  const options: WinChoice[] = [...TARGET_SCORES, 'rounds'];
  return (
    <>
      <div className="field">
        <span className="field__label">Win condition</span>
        <div className="seg seg--win" role="radiogroup" aria-label="Win condition">
          {options.map((o) => (
            <button
              key={String(o)}
              role="radio"
              aria-checked={o === value}
              className={`seg__opt ${o === value ? 'is-on' : ''}`}
              onClick={() => set({ targetScore: o === 'rounds' ? 0 : o })}
            >
              {o === 'rounds' ? 'Fixed rounds' : `First to ${o}`}
            </button>
          ))}
        </div>
        <small className="faint">{target > 0 ? `First to ${target} points wins. A tie at the top plays one more round.` : `Highest score after ${s.roundsPerGame} round${s.roundsPerGame === 1 ? '' : 's'} wins.`}</small>
      </div>
      {target === 0 && (
        <div className="field">
          <span className="field__label">Rounds</span>
          <div className="stepper">
            <button className="icon-btn" onClick={() => set({ roundsPerGame: Math.max(1, s.roundsPerGame - 1) })} aria-label="Fewer rounds" disabled={s.roundsPerGame <= 1}>
              <Icon name="minus" />
            </button>
            <output className="display h2 stepper__val" aria-live="polite">
              {s.roundsPerGame}
            </output>
            <button className="icon-btn" onClick={() => set({ roundsPerGame: Math.min(10, s.roundsPerGame + 1) })} aria-label="More rounds" disabled={s.roundsPerGame >= 10}>
              <Icon name="plus" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export function SettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { game, actions } = useGame();
  const { players } = usePlayers();
  const [premium, setPremium] = useState(false);
  if (!game) return null;
  const s = game.settings;
  const set = (patch: Partial<GameSettings>) => actions.updateSettings(patch);
  const secs = (v: number) => `${v}s`;
  const canTwoLiars = players.length >= 7;

  return (
    <>
      <Sheet open={open} onClose={onClose} title="Mission settings" footer={<button className="btn btn--primary" onClick={onClose}>Done</button>}>
        <div className="field">
          <span className="field__label">Quick setup</span>
          <PresetPicker playerCount={players.length} settings={s} onApply={set} />
        </div>

        <WinCondition settings={s} onChange={set} />

        <Segmented label="Clue mode" value={s.clueMode} options={['spoken', 'typed'] as const} onChange={(v) => set({ clueMode: v })} format={(v) => (v === 'spoken' ? 'Say it out loud' : 'Type it')} />
        <Segmented label="Time per clue" value={s.clueSeconds} options={[15, 20, 30, 45, 60]} onChange={(v) => set({ clueSeconds: v })} format={secs} />
        <Segmented label="Discussion" value={s.discussionSeconds} options={[60, 90, 120, 180]} onChange={(v) => set({ discussionSeconds: v })} format={secs} />
        <Segmented label="Voting" value={s.votingSeconds} options={[30, 45, 60, 90]} onChange={(v) => set({ votingSeconds: v })} format={secs} />
        <Segmented label="Spy’s final guess" value={s.guessSeconds} options={[20, 30, 45]} onChange={(v) => set({ guessSeconds: v })} format={secs} />

        <div className="field">
          <span className="field__label">Spies</span>
          <div className="seg" role="radiogroup" aria-label="Number of spies">
            {([1, 2] as const).map((n) => (
              <button key={n} role="radio" aria-checked={s.liarCount === n} className={`seg__opt ${s.liarCount === n ? 'is-on' : ''}`} disabled={n === 2 && !canTwoLiars} onClick={() => set({ liarCount: n })}>
                {n > 1 ? `${n} spies` : '1 spy'}
              </button>
            ))}
          </div>
          {!canTwoLiars && <small className="faint">Two spies unlocks at 7+ players.</small>}
        </div>

        <Toggle label="Tutorial before first game" hint="A 40-second animated how-to on every phone. Starts when everyone taps ready." checked={s.briefing} onChange={(v) => set({ briefing: v })} />
        <Toggle label="Practice round" hint="First round: 50% more time, points don't count." checked={s.warmupRound} onChange={(v) => set({ warmupRound: v })} />
        <Toggle label="Spy sees the topic" hint="Classic rules. Turn off for hard mode." checked={s.liarSeesTopic} onChange={(v) => set({ liarSeesTopic: v })} />
        <Toggle label="Family friendly" hint="Hides mature packs." checked={s.familyFriendly} onChange={(v) => set({ familyFriendly: v, packIds: v ? s.packIds.filter((id) => !game.packs.find((p) => p.id === id)?.mature) : s.packIds })} />

        <div className="field">
          <span className="field__label">Word packs</span>
          <div className="packs">
            {game.packs.map((p) => {
              const locked = p.premium && !game.premium;
              const hidden = p.mature && s.familyFriendly;
              const on = s.packIds.includes(p.id);
              return (
                <div key={p.id} className={`pack ${on ? 'is-on' : ''} ${locked ? 'is-locked' : ''} ${hidden ? 'is-hidden' : ''}`}>
                  <span className="pack__emoji" aria-hidden="true">
                    {p.emoji}
                  </span>
                  <span className="pack__txt">
                    <b>
                      {p.name} {p.mature && <span className="chip chip--accent">18+</span>}
                    </b>
                    <small>
                      {p.tagline} · {p.topicCount} topics
                    </small>
                  </span>
                  {locked ? (
                    <button className="btn btn--gold btn--sm" onClick={() => setPremium(true)}>
                      <Icon name="lock" size={16} /> Unlock
                    </button>
                  ) : (
                    <input
                      type="checkbox"
                      className="pack__check"
                      checked={on}
                      disabled={hidden || (on && s.packIds.length === 1)}
                      aria-label={`Use ${p.name}`}
                      onChange={(e) => set({ packIds: e.target.checked ? [...s.packIds, p.id] : s.packIds.filter((x) => x !== p.id) })}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Sheet>
      <PremiumModal open={premium} onClose={() => setPremium(false)} />
    </>
  );
}
