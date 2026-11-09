import { beforeEach, describe, expect, it } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { CoachTip } from './CoachTip';
import { loadCoach } from './coachStore';

beforeEach(() => localStorage.clear());

describe('CoachTip (editor’s note strip)', () => {
  it('renders compact: TIP label, no emoji, clamped text, turn-off hidden until expanded', () => {
    const { container } = render(<CoachTip phase="lobby" role={null} />);
    const note = screen.getByRole('note', { name: 'Tip' });
    expect(note).toHaveTextContent(/^Tip/);
    expect(note.textContent).not.toMatch(/💡/u);
    const main = screen.getByRole('button', { expanded: false });
    expect(main).toHaveTextContent(/room code/i);
    expect(screen.queryByRole('button', { name: /turn off/i })).not.toBeInTheDocument();
    fireEvent.click(main);
    expect(main).toHaveAttribute('aria-expanded', 'true');
    expect(container.querySelector('.coach-tip.is-open')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /turn off all tips/i })).toBeInTheDocument();
  });

  it('dismisses with the 44px close button and remembers it', () => {
    render(<CoachTip phase="clues" role="liar" />);
    fireEvent.click(screen.getByRole('button', { name: /dismiss tip/i }));
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
    expect(loadCoach().dismissed).toContain('clues:any');
  });
});
