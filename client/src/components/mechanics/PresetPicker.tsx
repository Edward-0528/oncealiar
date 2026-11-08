import { GAME_PRESETS, presetSettings, recommendedSpyCount, TWO_SPIES_MIN, type GamePreset, type GameSettings } from '@oncealiar/shared';
import './mechanics.css';

/**
 * Quick / Full game presets for the host's SettingsSheet, scaled to the player count
 * (discussion time, 2 Spies from 8). Place at the top of SettingsSheet.
 * onApply should call actions.updateSettings(patch).
 */
export function PresetPicker({ playerCount, settings, onApply }: { playerCount: number; settings: GameSettings; onApply: (patch: Partial<GameSettings>) => void }) {
  const active = (Object.keys(GAME_PRESETS) as GamePreset[]).find((k) => {
    const p = presetSettings(k, playerCount);
    return p.roundsPerGame === settings.roundsPerGame && p.discussionSeconds === settings.discussionSeconds && p.clueSeconds === settings.clueSeconds;
  });
  const spies = recommendedSpyCount(playerCount);
  return (
    <div className="mx-presets">
      <div className="mx-presets__row" role="radiogroup" aria-label="Game length">
        {(Object.keys(GAME_PRESETS) as GamePreset[]).map((k) => (
          <button key={k} type="button" role="radio" aria-checked={active === k} className={`mx-preset ${active === k ? 'is-on' : ''}`} onClick={() => onApply(presetSettings(k, playerCount))}>
            <b>{GAME_PRESETS[k].label}</b>
            <span>{GAME_PRESETS[k].blurb}</span>
          </button>
        ))}
      </div>
      {spies === 2 && settings.liarCount !== 2 && playerCount >= TWO_SPIES_MIN && (
        <button type="button" className="mx-hint" onClick={() => onApply({ liarCount: 2 })}>
          {playerCount} players? Try <b>2 Spies</b> — tap to switch.
        </button>
      )}
    </div>
  );
}
