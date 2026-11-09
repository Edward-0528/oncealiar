import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import React from 'react';
import { App } from '../ui/App';
import { createMockTransport } from '../lib/mock';
import { DEMO_SCENES, GameDemo, parseDemoFreeze } from '../components/demo/GameDemo';
import { WarmupBadge } from '../components/mechanics';

function mockApp(phase: string, extra: Record<string, string> = {}) {
  const params = new URLSearchParams({ mock: phase, ...extra });
  const transport = createMockTransport(phase, params, { name: 'Tester', avatar: 'owl', color: 'sky' });
  const emit = vi.spyOn(transport, 'emit');
  return { ...render(<App transport={transport} />), transport, emit };
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  window.scrollTo = () => {};
  window.matchMedia =
    window.matchMedia ||
    ((q: string) =>
      ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false }) as unknown as MediaQueryList);
});
/** advance fake time in small slices so chained timers (scene beats) get re-armed between them */
function tick(ms: number) {
  for (let t = 0; t < ms; t += 100) {
    act(() => {
      vi.advanceTimersByTime(Math.min(100, ms - t));
    });
  }
}
async function tickAsync(ms: number) {
  for (let t = 0; t < ms; t += 250) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(Math.min(250, ms - t));
    });
  }
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('Briefing screen', () => {
  it('shows the ready count and who we are waiting on', async () => {
    mockApp('briefing', { n: '5' });
    expect(await screen.findByText(/how to play · 40 seconds/i)).toBeInTheDocument();
    expect(screen.getByText('0/5 ready · waiting on you, Maya +3')).toBeInTheDocument();
    expect(screen.getByText('The game starts when everyone’s ready.')).toBeInTheDocument();
    // no host skip on this screen
    expect(screen.queryByRole('button', { name: /start anyway|skip/i })).toBeNull();
  });

  it('"I’m ready" emits briefing:ready, then becomes a disabled "You’re ready"', async () => {
    const { emit } = mockApp('briefing', { n: '4' });
    const btn = await screen.findByRole('button', { name: /i’m ready/i });
    fireEvent.click(btn);
    expect(emit).toHaveBeenCalledWith('briefing:ready');
    const done = await screen.findByRole('button', { name: /you’re ready/i });
    expect(done).toBeDisabled();
    expect(screen.getByText(/1\/4 ready · waiting on Maya, Jonah \+1/)).toBeInTheDocument();
  });

  it('waits for everyone, including you, then starts the game (role reveal)', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0); // bots confirm on every tick
    mockApp('briefing', { n: '3' });
    await tickAsync(10_000);
    // bots are ready, but the game must not start without you
    expect(screen.getByText(/2\/3 ready · waiting on you/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /i’m ready/i }));
    await tickAsync(1_000);
    expect(screen.getByRole('button', { name: /hold to reveal your role/i })).toBeInTheDocument();
  });

  it('the first game from the lobby opens with the briefing (settings.briefing)', async () => {
    mockApp('lobby', { n: '5' });
    expect(await screen.findByText(/starts with a 40-second tutorial/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /start game/i }));
    expect(await screen.findByRole('button', { name: /i’m ready/i })).toBeInTheDocument();
  });

  it('briefing=0 skips straight to the role reveal', async () => {
    mockApp('lobby', { n: '5', briefing: '0' });
    fireEvent.click(await screen.findByRole('button', { name: /start game/i }));
    expect(await screen.findByRole('button', { name: /hold to reveal your role/i })).toBeInTheDocument();
  });
});

describe('GameDemo', () => {
  const caption = () => screen.getByRole('heading', { level: 3 });

  it('cycles through the five scenes and loops', () => {
    vi.useFakeTimers();
    render(<GameDemo />);
    expect(caption()).toHaveTextContent(DEMO_SCENES[0].caption);
    for (let i = 1; i <= DEMO_SCENES.length; i++) {
      tick(DEMO_SCENES[i - 1].duration);
      expect(caption()).toHaveTextContent(DEMO_SCENES[i % DEMO_SCENES.length].caption);
    }
  });

  it('steps through the scene beats (the file flips open, then the Spy file)', () => {
    vi.useFakeTimers();
    const { container } = render(<GameDemo />);
    const phone = () => container.querySelector('.demo-phone') as HTMLElement;
    expect(phone().querySelector('.rcard.is-flipped')).toBeNull();
    tick(DEMO_SCENES[0].cues[0]);
    expect(phone().querySelector('.rcard--agent.is-flipped')).not.toBeNull();
    expect(within(phone()).getByText('Pizza', { selector: '.rcard__word' })).toBeInTheDocument();
    tick(DEMO_SCENES[0].cues[3] - DEMO_SCENES[0].cues[0]);
    expect(phone().querySelector('.rcard--liar.is-flipped')).not.toBeNull();
    expect(within(phone()).getByText('The Spy')).toBeInTheDocument();
  });

  it('dots jump to a scene; the phone is inert and hidden from AT', () => {
    vi.useFakeTimers();
    const { container } = render(<GameDemo />);
    fireEvent.click(screen.getByRole('button', { name: /scene 4 of 5/i }));
    expect(caption()).toHaveTextContent('Vote for the Spy');
    expect(screen.getByRole('button', { name: /scene 4 of 5/i })).toHaveAttribute('aria-current', 'step');
    const phone = container.querySelector('.demo-phone')!;
    expect(phone).toHaveAttribute('aria-hidden', 'true');
    expect(phone).toHaveAttribute('inert');
    // votes land one by one, then ACCUSED
    tick(DEMO_SCENES[3].cues[3]);
    expect(within(phone as HTMLElement).getByText('Accused')).toBeInTheDocument();
  });

  it('parses the ?demo= freeze param', () => {
    expect(parseDemoFreeze('2.3')).toEqual({ scene: 1, step: 3 });
    expect(parseDemoFreeze('9')).toEqual({ scene: 4, step: 0 });
    expect(parseDemoFreeze('x')).toBeNull();
    expect(parseDemoFreeze(null)).toBeNull();
  });
});

describe('Practice round', () => {
  it('badge says points don’t count (falls back to warm-up wording)', () => {
    const { rerender } = render(<WarmupBadge round={{ practice: true, warmup: true }} />);
    expect(screen.getByText('Practice round · points don’t count')).toBeInTheDocument();
    rerender(<WarmupBadge round={{ warmup: true }} />);
    expect(screen.getByText('Warm-up round · extra time')).toBeInTheDocument();
    rerender(<WarmupBadge round={{}} />);
    expect(screen.queryByText(/round ·/)).toBeNull();
  });

  it('Results labels the first round’s points as not counted', async () => {
    vi.useFakeTimers();
    mockApp('results', { caught: '0' });
    await tickAsync(15_000);
    expect(screen.getByText('Practice — not counted')).toBeInTheDocument();
  });
});
