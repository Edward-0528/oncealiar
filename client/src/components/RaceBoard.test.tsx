import { beforeEach, describe, expect, it } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import type { Player } from '@oncealiar/shared';
import { RaceBoard, barPct, raceScale } from './RaceBoard';

beforeEach(() => {
  window.matchMedia =
    window.matchMedia ||
    ((q: string) =>
      ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false }) as unknown as MediaQueryList);
});

const P = (id: string, score: number): Player =>
  ({ id, name: id.toUpperCase(), avatar: 'owl', color: 'sky', score, isHost: false, ready: true, presence: 'online', hasVoted: false }) as unknown as Player;

describe('RaceBoard', () => {
  it('bar widths are proportional to the target, with a finish line label', () => {
    const rows = [P('a', 12), P('b', 6), P('c', 0)].map((player) => ({ player, score: player.score }));
    const { container } = render(<RaceBoard rows={rows} target={15} rounds={4} />);
    const widths = screen.getAllByTestId('race-bar').map((b) => b.style.width);
    expect(widths).toEqual(['80%', '40%', '0%']);
    expect(container.querySelector('.race__finish-label')).toHaveTextContent('Finish 15');
    expect(container.querySelector('.race__row.is-lead')).toHaveTextContent('A');
  });

  it('a score past the target rescales so the leader fills the track', () => {
    expect(raceScale(15, [18, 9])).toBe(18);
    expect(barPct(9, 18)).toBe(50);
  });

  it('fixed rounds (target 0) scale to the top score and say "after N rounds"', () => {
    const rows = [P('a', 8), P('b', 2)].map((player) => ({ player, score: player.score }));
    const { container } = render(<RaceBoard rows={rows} target={0} rounds={5} />);
    expect(screen.getAllByTestId('race-bar').map((b) => b.style.width)).toEqual(['100%', '25%']);
    expect(container.querySelector('.race__finish-label')).toBeNull();
    expect(screen.getByText('After 5 rounds')).toBeInTheDocument();
  });

  it('marks the winner with a crown', () => {
    const rows = [P('a', 15), P('b', 3)].map((player) => ({ player, score: player.score }));
    render(<RaceBoard hero rows={rows} target={15} rounds={6} winnerIds={['a']} />);
    expect(screen.getByLabelText('Winner')).toBeInTheDocument();
  });
});
