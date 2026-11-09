import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';
import type { PrivateView, PublicGameState } from '@oncealiar/shared';
import { DEFAULT_SETTINGS } from '@oncealiar/shared';
import { GameProvider, useGame } from './GameProvider';
import { PresenceBadge, ReconnectBanner, Toasts } from '../components/Overlays';
import type { ConnStatus, Transport, TransportEvent } from '../lib/transport';

function fakeTransport() {
  const subs = new Set<(e: TransportEvent) => void>();
  let status: ConnStatus = 'connecting';
  const t: Transport & { push: (e: TransportEvent) => void } = {
    kind: 'live',
    emit: vi.fn(),
    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
    status: () => status,
    willRejoin: () => false,
    push(e) {
      if (e.type === 'conn') status = e.status;
      act(() => subs.forEach((fn) => fn(e)));
    }
  };
  return t;
}

const state = (): PublicGameState => ({
  code: 'ABCD',
  players: [
    { id: 'me', name: 'Me', avatar: 'duck', color: 'coral', score: 0, connected: true, presence: 'online', isHost: true, ready: false, hasVoted: false }
  ],
  settings: DEFAULT_SETTINGS,
  round: { number: 0, phase: 'lobby', phaseEndsAt: null, serverNow: Date.now(), topic: null, turnOrder: [], currentTurn: 0, clues: [], result: null },
  packs: []
});
const you: PrivateView = { playerId: 'me', role: null, secretWord: null, myVote: null, token: 'tok' };

function Probe() {
  const { game } = useGame();
  return <div data-testid="room">{game?.code ?? 'none'}</div>;
}

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('reconnect indicator', () => {
  function mount() {
    const t = fakeTransport();
    render(
      <GameProvider transport={t}>
        <ReconnectBanner />
        <Probe />
        <Toasts />
      </GameProvider>
    );
    t.push({ type: 'conn', status: 'connected' });
    t.push({ type: 'state', state: state(), you });
    return t;
  }

  it('stays invisible for a very short blip', () => {
    const t = mount();
    t.push({ type: 'conn', status: 'reconnecting' });
    act(() => vi.advanceTimersByTime(300));
    t.push({ type: 'conn', status: 'connected' });
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.queryByText(/reconnecting/i)).toBeNull();
    expect(screen.queryByText(/back in the game/i)).toBeNull();
    expect(screen.getByTestId('room')).toHaveTextContent('ABCD'); // game state kept through the blip
  });

  it('shows a calm pill after 400ms that says buttons are paused, then "Back in the game!" on rejoin', () => {
    const t = mount();
    t.push({ type: 'conn', status: 'reconnecting' });
    act(() => vi.advanceTimersByTime(400));
    expect(screen.getByText('Reconnecting… buttons paused')).toBeInTheDocument();
    t.push({ type: 'conn', status: 'connected' });
    expect(screen.queryByText('Reconnecting… buttons paused')).toBeNull();
    expect(screen.getByText('Back in the game!')).toBeInTheDocument();
  });

  it('a dead session sends you home with an explanation', () => {
    const t = mount();
    t.push({ type: 'session-invalid', code: 'ABCD', error: 'Room not found' });
    expect(screen.getByTestId('room')).toHaveTextContent('none');
    expect(screen.getByText('That game has ended')).toBeInTheDocument();
  });
});

describe('PresenceBadge', () => {
  it('renders nothing when online, "texting…" when away, "offline" after grace', () => {
    const { container, rerender } = render(<PresenceBadge presence="online" />);
    expect(container).toBeEmptyDOMElement();
    rerender(<PresenceBadge player={{ connected: true, presence: 'away' }} />);
    expect(screen.getByText('texting…')).toBeInTheDocument();
    rerender(<PresenceBadge player={{ connected: false }} />);
    expect(screen.getByText('offline')).toBeInTheDocument();
  });
});
