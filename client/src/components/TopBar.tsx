import React, { useState } from 'react';
import { useGame, usePlayers } from '../state/GameProvider';
import { Icon } from './Icon';
import { MuteButton } from './Overlays';
import { HowToPlay } from './HowToPlay';
import { Sheet } from './Sheet';
import { ReactionStampLayer } from './Paper';
import { WarmupBadge } from './mechanics';
import { Toggle } from '../screens/SettingsSheet';
import { coachTipsEnabled, setCoachTipsEnabled } from './coach/coachStore';
import { THEMES, applyTheme, loadTheme, type ThemeId } from '../lib/theme';
import './TopBar.css';

export function ThemePicker() {
  const [theme, setTheme] = useState<ThemeId>(loadTheme);
  return (
    <div className="theme-picker" role="radiogroup" aria-label="Theme">
      {THEMES.map((t) => (
        <button
          key={t.id}
          role="radio"
          aria-checked={theme === t.id}
          className={`theme-opt ${theme === t.id ? 'is-on' : ''}`}
          onClick={() => {
            setTheme(t.id);
            applyTheme(t.id);
          }}
        >
          <span className="theme-opt__sw" aria-hidden="true">
            {t.swatch.map((c) => (
              <span key={c} style={{ background: c }} />
            ))}
          </span>
          <span className="theme-opt__txt">
            <b>{t.name}</b>
            <small>{t.blurb}</small>
          </span>
          {t.premium ? <span className="chip chip--gold">Preview</span> : <span className="chip">Standard</span>}
        </button>
      ))}
    </div>
  );
}

function CoachToggle() {
  const [on, setOn] = useState(coachTipsEnabled);
  return (
    <Toggle
      label="Coach tips"
      hint="Short how-to-play hints during each phase."
      checked={on}
      onChange={(v) => {
        setCoachTipsEnabled(v);
        setOn(v);
      }}
    />
  );
}

export function TopBar() {
  const { game, actions } = useGame();
  const { isHost } = usePlayers();
  const [help, setHelp] = useState(false);
  const [menu, setMenu] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const r = game?.round;

  return (
    <header className="topbar">
      {game ? (
        <div className="topbar__room">
          <span className="topbar__code display" aria-label={`Room code ${game.code.split('').join(' ')}`}>
            {game.code}
          </span>
          {r && r.number > 0 && r.phase !== 'game-over' && (
            <span className="chip">
              Rd {r.number}/{game.settings.roundsPerGame}
            </span>
          )}
        </div>
      ) : (
        <span aria-hidden="true" />
      )}
      <div className="topbar__actions">
        <button className="icon-btn" onClick={() => setHelp(true)} aria-label="How to play">
          <Icon name="help" />
        </button>
        <MuteButton />
        <button className="icon-btn" onClick={() => setMenu(true)} aria-label="Menu">
          <Icon name="menu" />
        </button>
      </div>

      {r && r.phase !== 'lobby' && r.phase !== 'game-over' && (
        <div className="topbar__warm">
          <WarmupBadge round={r} />
        </div>
      )}
      <ReactionStampLayer />
      <HowToPlay open={help} onClose={() => setHelp(false)} />

      <Sheet open={menu} onClose={() => setMenu(false)} title="Menu">
        <div className="stack">
          <span className="eyebrow">Theme</span>
          <ThemePicker />
          <p className="faint" style={{ fontSize: 13 }}>
            Alternate themes preview upcoming premium cosmetics. Only you see them.
          </p>
        </div>
        <CoachToggle />
        {game && (
          <button className="btn btn--ghost btn--block" onClick={() => setConfirmLeave(true)}>
            <Icon name="door" /> Leave room
          </button>
        )}
      </Sheet>

      <Sheet
        open={confirmLeave}
        onClose={() => setConfirmLeave(false)}
        title="Leave this game?"
        variant="modal"
        footer={
          <>
            <button className="btn btn--secondary btn--sm" onClick={() => setConfirmLeave(false)}>
              Stay
            </button>
            <button
              className="btn btn--primary btn--sm"
              onClick={() => {
                setConfirmLeave(false);
                setMenu(false);
                actions.leave();
              }}
            >
              Leave
            </button>
          </>
        }
      >
        <p className="dim">{isHost ? 'You’re the host — someone else will take over.' : 'You can rejoin with the room code while the game is running.'}</p>
      </Sheet>
    </header>
  );
}
