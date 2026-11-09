// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Landing } from './Landing';

const assign = vi.fn();
beforeEach(() => {
  assign.mockClear();
  Object.defineProperty(window, 'location', { value: { ...window.location, assign }, writable: true });
});
afterEach(cleanup);

describe('Landing', () => {
  it('leads with the promise and the two ways in', () => {
    render(<Landing />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/everyone knows the codeword\. except the spy/i);
    expect(screen.getAllByRole('button', { name: /start a game/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText(/room code/i).length).toBe(2);
  });

  it('"Start a game" opens the app at /start', () => {
    render(<Landing />);
    fireEvent.click(screen.getAllByRole('button', { name: /start a game/i })[0]);
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

  it('states the real player range, not a stale one', () => {
    render(<Landing />);
    expect(screen.getAllByText(/3–12/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/3–18|3-18/)).toBeNull();
  });
});
