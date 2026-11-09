// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ActionButton } from './ActionButton';

const toast = vi.fn();
let conn: 'connected' | 'reconnecting' = 'connected';
vi.mock('../state/GameProvider', () => ({
  useGame: () => ({ conn, toast, transport: { kind: 'live' } })
}));

describe('ActionButton', () => {
  it('shows a pending label and ignores double taps until the server answers', async () => {
    let resolve!: (v: boolean) => void;
    const onAct = vi.fn(() => new Promise<boolean>((r) => (resolve = r)));
    render(<ActionButton onAct={onAct} pendingLabel="Starting…">Start</ActionButton>);
    const btn = screen.getByRole('button');
    fireEvent.click(btn);
    fireEvent.click(btn);
    expect(onAct).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Starting…')).toBeInTheDocument();
    resolve(true);
    await waitFor(() => expect(screen.getByText('Start')).toBeInTheDocument());
  });

  it('explains why when blocked, instead of doing nothing', () => {
    toast.mockClear();
    const onAct = vi.fn();
    render(<ActionButton onAct={onAct} blockedReason="Need 1 more suspect to start">Start</ActionButton>);
    fireEvent.click(screen.getByRole('button'));
    expect(onAct).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith('Need 1 more suspect to start', 'error');
  });

  it('refuses while the connection is down and says so', () => {
    toast.mockClear();
    conn = 'reconnecting';
    const onAct = vi.fn();
    render(<ActionButton onAct={onAct} showReason>Go</ActionButton>);
    expect(screen.getByRole('status')).toHaveTextContent(/reconnecting/i);
    fireEvent.click(screen.getByRole('button'));
    expect(onAct).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalled();
    conn = 'connected';
  });
});
