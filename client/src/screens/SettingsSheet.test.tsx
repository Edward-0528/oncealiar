import { describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React, { useState } from 'react';
import { DEFAULT_SETTINGS, type GameSettings } from '@oncealiar/shared';
import { WinCondition } from './SettingsSheet';

function Harness({ spy }: { spy: (p: Partial<GameSettings>) => void }) {
  const [s, setS] = useState<GameSettings>({ ...DEFAULT_SETTINGS, targetScore: 15 });
  return (
    <WinCondition
      settings={s}
      onChange={(p) => {
        spy(p);
        setS((cur) => ({ ...cur, ...p }));
      }}
    />
  );
}

describe('Settings: win condition', () => {
  it('offers First to 10/15/20 + Fixed rounds and updates targetScore', () => {
    const spy = vi.fn();
    render(<Harness spy={spy} />);
    const group = screen.getByRole('radiogroup', { name: 'Win condition' });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'First to 15' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.queryByRole('button', { name: /more rounds/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: 'First to 20' }));
    expect(spy).toHaveBeenLastCalledWith({ targetScore: 20 });
    expect(screen.getByRole('radio', { name: 'First to 20' })).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(screen.getByRole('radio', { name: 'Fixed rounds' }));
    expect(spy).toHaveBeenLastCalledWith({ targetScore: 0 });
    // fixed rounds reveals the rounds stepper
    fireEvent.click(screen.getByRole('button', { name: /more rounds/i }));
    expect(spy).toHaveBeenLastCalledWith({ roundsPerGame: DEFAULT_SETTINGS.roundsPerGame + 1 });
  });
});
