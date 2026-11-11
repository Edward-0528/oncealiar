// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Landing } from './Landing';

vi.mock('../state/account', () => ({
  useAccount: () => ({ enabled: true, session: null, me: null, purchase: false, priceLabel: '', client: {} })
}));
vi.mock('../components/AccountSheet', () => ({
  AccountSheet: ({ open }: { open: boolean }) => (open ? <div role="dialog">Sign in sheet</div> : null)
}));

const assign = vi.fn();
beforeEach(() => {
  assign.mockClear();
  Object.defineProperty(window, 'location', { value: { ...window.location, assign }, writable: true });
});
afterEach(cleanup);

describe('Landing', () => {
  it('leads with the promise and the two ways in', () => {
    render(<Landing />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/game night, sorted in 30 seconds/i);
    for (const o of ['Living room', 'Video call', 'Road trip', 'Pub table']) expect(screen.getByText(o)).toBeTruthy();
    expect(screen.getByRole('button', { name: /host a new game/i })).toBeTruthy();
    expect(screen.getAllByLabelText(/room code/i).length).toBe(1);
  });

  it('"Host a new game" opens the app at /start', () => {
    render(<Landing />);
    fireEvent.click(screen.getByRole('button', { name: /host a new game/i }));
    expect(assign).toHaveBeenCalledWith('/start');
  });

  it('joins with a typed or pasted code, straight into the invite flow', () => {
    render(<Landing />);
    const input = screen.getAllByLabelText(/room code/i)[0];
    fireEvent.change(input, { target: { value: 'wxyz' } });
    fireEvent.submit(input.closest('form')!);
    expect(assign).toHaveBeenCalledWith('/?room=WXYZ');
    fireEvent.change(input, { target: { value: 'Join my Once a Liar game — room ABCD!' } });
    fireEvent.submit(input.closest('form')!);
    expect(assign).toHaveBeenLastCalledWith('/?room=ABCD');
  });

  it('explains a bad code instead of doing nothing', () => {
    render(<Landing />);
    const input = screen.getAllByLabelText(/room code/i)[0];
    fireEvent.change(input, { target: { value: 'ab' } });
    fireEvent.submit(input.closest('form')!);
    expect(screen.getByRole('alert')).toHaveTextContent(/4 letters/i);
    expect(assign).not.toHaveBeenCalled();
  });

  it('offers optional sign-in from the header and the save card', () => {
    render(<Landing />);
    expect(screen.getByText(/guests play free/i)).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button', { name: /sign in/i })[0]);
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('states the real player range, not a stale one', () => {
    render(<Landing />);
    expect(screen.getAllByText(/3–12/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/3–18|3-18/)).toBeNull();
  });
});
