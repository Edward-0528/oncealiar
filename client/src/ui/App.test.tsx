import { describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { App } from './App';
import { createMockTransport } from '../lib/mock';

function renderMock(phase: string, extra: Record<string, string> = {}) {
  const params = new URLSearchParams({ mock: phase, ...extra });
  const transport = createMockTransport(phase, params, { name: 'Tester', avatar: 'owl', color: 'sky' });
  return render(<App transport={transport} />);
}

beforeEach(() => {
  localStorage.clear();
  // jsdom lacks matchMedia
  window.matchMedia =
    window.matchMedia ||
    ((q: string) =>
      ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false }) as unknown as MediaQueryList);
});

describe('App (mock mode)', () => {
  it('renders the home screen with host + join', () => {
    renderMock('home');
    expect(screen.getByRole('button', { name: /host a game/i })).toBeInTheDocument();
    expect(screen.getAllByLabelText(/room code character/i)).toHaveLength(4);
  });

  it('?mock=profile shows the Backstage picker (premium=1 unlocks the packs)', () => {
    const { unmount } = renderMock('profile');
    expect(screen.getByRole('tablist', { name: /case files/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
    fireEvent.click(screen.getByRole('tab', { name: /disguise/i }));
    expect(screen.getByRole('button', { name: /try on le waiter/i })).toBeInTheDocument();
    unmount();
    renderMock('profile', { premium: '1' });
    fireEvent.click(screen.getByRole('tab', { name: /disguise/i }));
    expect(screen.getByRole('button', { name: 'Wear Le Waiter' })).toBeInTheDocument();
  });

  it('auto-uppercases and advances the code boxes', () => {
    renderMock('home');
    const boxes = screen.getAllByLabelText(/room code character/i) as HTMLInputElement[];
    fireEvent.change(boxes[0], { target: { value: 'm' } });
    expect(boxes[0].value).toBe('M');
    expect(document.activeElement).toBe(boxes[1]);
    fireEvent.change(boxes[1], { target: { value: 'ask' } });
    expect(screen.getByRole('button', { name: /join mask/i })).toBeEnabled();
  });

  it('renders the lobby with room code and players', async () => {
    renderMock('lobby');
    expect(await screen.findByLabelText(/room code M A S K/i, { selector: '.lobby__code' })).toBeInTheDocument();
    expect(screen.getByText('Tester')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start game|need/i })).toBeInTheDocument();
  });

  it('shows the codeword for an agent after peeking', async () => {
    renderMock('role-reveal');
    const card = await screen.findByRole('button', { name: /hold to reveal your role/i });
    act(() => {
      fireEvent.pointerDown(card);
    });
    expect(screen.getAllByText('Pineapple').length).toBeGreaterThan(0);
  });

  it('shows the spy treatment for the spy', async () => {
    renderMock('role-reveal', { role: 'liar' });
    const card = await screen.findByRole('button', { name: /hold to reveal your role/i });
    act(() => {
      fireEvent.pointerDown(card);
    });
    expect(screen.getByText(/the spy/i, { selector: '.rcard__liar-title' })).toBeInTheDocument();
  });

  it.each([
    ['clues', /turn/i],
    ['discussion', /who’s the spy/i],
    ['voting', /tap a player to accuse/i],
    ['liar-guess', /the spy is making their last guess/i],
    ['results', /the votes are in/i],
    ['game-over', /game over/i]
  ])('renders the %s phase', async (phase, text) => {
    // `caught` makes the mock's vote decisive (no random runoff tie)
    renderMock(phase, phase === 'results' ? { caught: '1' } : {});
    expect((await screen.findAllByText(text)).length).toBeGreaterThan(0);
  });

  it('lets the spy pick and confirm a guess', async () => {
    renderMock('liar-guess', { role: 'liar' });
    fireEvent.click(await screen.findByRole('radio', { name: 'Basil' }));
    expect(screen.getByRole('button', { name: /lock it in/i })).toBeInTheDocument();
  });

  it('stamps CLASSIFIED on the spy file and redacts the codeword', async () => {
    renderMock('role-reveal', { role: 'liar' });
    const card = await screen.findByRole('button', { name: /hold to reveal your role/i });
    act(() => {
      fireEvent.pointerDown(card);
    });
    expect(await screen.findByText(/classified/i)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /codeword redacted/i })).toBeInTheDocument();
  });

  it('stamps CLEARED on the agent file', async () => {
    renderMock('role-reveal');
    const card = await screen.findByRole('button', { name: /hold to reveal your role/i });
    act(() => {
      fireEvent.pointerDown(card);
    });
    expect(await screen.findByText(/cleared/i)).toBeInTheDocument();
  });

  it('renders reactions as rubber stamps', async () => {
    renderMock('discussion');
    expect(await screen.findByRole('button', { name: /stamp lol/i })).toHaveTextContent('LOL');
    expect(screen.getByRole('button', { name: /stamp lies!/i })).toBeInTheDocument();
  });

  it('prints a tabloid headline on the results summary', async () => {
    renderMock('results', { caught: '1' });
    fireEvent.click(await screen.findByRole('button', { name: /skip/i }));
    expect(await screen.findByText(/exposed!|escaped!|the code!/i)).toBeInTheDocument();
    expect(screen.getByText(/the scoreboard/i)).toBeInTheDocument();
  });
});
