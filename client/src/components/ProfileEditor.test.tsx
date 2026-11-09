import React, { useState } from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { AVATARS, type PlayerProfile } from '@oncealiar/shared';
import { ProfileEditor, CURTAIN_BEAT_MS, CURTAIN_MS, type ProfileEditorProps } from './ProfileEditor';
import { isCodename } from '../lib/profile';

function setReducedMotion(reduce: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: reduce && query.includes('reduce'),
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false
  })) as unknown as typeof window.matchMedia;
}

type Extra = Partial<Omit<ProfileEditorProps, 'value' | 'onChange'>>;
function Harness({ initial, spy, ...props }: Extra & { initial: PlayerProfile; spy?: (p: PlayerProfile) => void }) {
  const [v, setV] = useState(initial);
  return (
    <ProfileEditor
      value={v}
      onChange={(p) => {
        spy?.(p);
        setV(p);
      }}
      ctaLabel={(noun) => `Places, everyone! Join as ${noun}`}
      onSubmit={() => {}}
      {...props}
    />
  );
}

const sam: PlayerProfile = { name: 'Sam', avatar: 'chancla', color: 'coral' };
const stageName = () => screen.getByText(/^as /).textContent;

describe('ProfileEditor (Backstage picker)', () => {
  beforeEach(() => setReducedMotion(true));

  it('shows all 12 free characters at once and selects one', () => {
    const spy = vi.fn();
    render(<Harness initial={sam} spy={spy} />);
    const tiles = screen.getAllByRole('button', { name: /^wear /i });
    expect(tiles).toHaveLength(AVATARS.length);
    expect(screen.getByRole('button', { name: 'Wear La Chancla' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Wear The Pigeon' }));
    expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ avatar: 'pigeon', name: 'Sam' }));
    expect(screen.getByRole('button', { name: 'Wear The Pigeon' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Wear La Chancla' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: /join as pigeon/i })).toBeInTheDocument();
  });

  it('uses tablist semantics for the case-file tabs', () => {
    render(<Harness initial={sam} premium={false} />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual([expect.stringMatching(/suspects/i), expect.stringMatching(/disguise/i), expect.stringMatching(/familia/i)]);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(tabs[0], { key: 'ArrowRight' });
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toBeInTheDocument();
  });

  it('previews a premium character on stage without selecting it', () => {
    const spy = vi.fn();
    const submit = vi.fn();
    render(<Harness initial={sam} spy={spy} onSubmit={submit} premium={false} host={false} />);
    fireEvent.click(screen.getByRole('tab', { name: /disguise/i }));
    expect(screen.getByText(/the host unlocks the pack for the whole room/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /try on le waiter/i }));
    expect(spy).not.toHaveBeenCalledWith(expect.objectContaining({ avatar: 'penguin' }));
    expect(stageName()).toBe('as Le Waiter');
    expect(screen.getByRole('button', { name: /try on le waiter/i })).toHaveAttribute('aria-pressed', 'true');

    const cta = screen.getByRole('button', { name: /ask the host to unlock/i });
    fireEvent.click(cta);
    expect(submit).not.toHaveBeenCalled();

    // back to the free rack: the preview ends and your own character returns
    fireEvent.click(screen.getByRole('tab', { name: /suspects/i }));
    expect(stageName()).toBe('as La Chancla');
    expect(screen.getByRole('button', { name: /join as chancla/i })).toBeInTheDocument();
  });

  it('lets premium rooms select premium characters', () => {
    const spy = vi.fn();
    render(<Harness initial={sam} spy={spy} premium />);
    fireEvent.click(screen.getByRole('tab', { name: /familia/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Wear La Abuela' }));
    expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ avatar: 'abuela' }));
  });

  it('CTA submits a trimmed name, and auto-fills a codename instead of being disabled', () => {
    const submit = vi.fn();
    const { unmount } = render(<Harness initial={{ ...sam, name: '  Sam  ' }} onSubmit={submit} ctaLabel="Save" />);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(submit).toHaveBeenCalledWith({ name: 'Sam', avatar: 'chancla', color: 'coral' });
    unmount();

    const submit2 = vi.fn();
    render(<Harness initial={{ ...sam, name: '' }} onSubmit={submit2} ctaLabel="Save" />);
    const cta = screen.getByRole('button', { name: 'Save' });
    expect(cta).toBeEnabled();
    fireEvent.click(cta);
    const sent = submit2.mock.calls[0][0] as PlayerProfile;
    expect(sent.name.length).toBeGreaterThan(0);
    expect(sent.name.length).toBeLessThanOrEqual(16);
    expect(isCodename(sent.name)).toBe(true);
  });

  it('has an always-visible name field, and tapping the marquee name focuses it', () => {
    const submit = vi.fn();
    render(<Harness initial={sam} onSubmit={submit} ctaLabel="Save" />);
    const input = screen.getByRole('textbox', { name: /your name/i });
    expect(input).toHaveAttribute('maxLength', '16');
    fireEvent.click(screen.getByRole('button', { name: /tap to change it/i }));
    expect(input).toHaveFocus();
    fireEvent.change(input, { target: { value: 'Velvet Ninja' } });
    expect(screen.getByRole('button', { name: /your name: velvet ninja/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(submit).toHaveBeenCalledWith(expect.objectContaining({ name: 'Velvet Ninja' }));
  });

  it('the dice next to the name gives a fresh codename', () => {
    const spy = vi.fn();
    render(<Harness initial={sam} spy={spy} />);
    fireEvent.click(screen.getByRole('button', { name: /random codename/i }));
    const p = spy.mock.calls.at(-1)![0] as PlayerProfile;
    expect(isCodename(p.name)).toBe(true);
    expect(p.name).not.toBe(sam.name);
  });

  it('shuffle never lands on a character someone else already wears', () => {
    const free = AVATARS.filter((a) => a !== 'chancla' && a !== 'duck');
    const taken = free.slice(1); // only `free[0]` (and our current/duck) are left
    for (let i = 0; i < 10; i++) {
      const spy = vi.fn();
      const { unmount } = render(<Harness initial={sam} spy={spy} takenAvatars={[...taken, 'duck']} premium={false} />);
      fireEvent.click(screen.getByRole('button', { name: /shuffle/i }));
      const p = spy.mock.calls.at(-1)![0] as PlayerProfile;
      expect(p.avatar).toBe(free[0]);
      expect(p.color).not.toBe('coral');
      unmount();
    }
  });

  it('reduced motion: swaps the character immediately, no curtain timers', () => {
    vi.useFakeTimers();
    try {
      render(<Harness initial={sam} />);
      const stage = screen.getByRole('region', { name: 'Stage' });
      expect(stage).not.toHaveClass('is-closed');
      expect(vi.getTimerCount()).toBe(0);
      fireEvent.click(screen.getByRole('button', { name: 'Wear Ghosted' }));
      expect(stageName()).toBe('as Ghosted');
      expect(stage).not.toHaveClass('is-closed');
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('with motion: curtains close, swap while hidden, then reopen; the last rapid pick wins', () => {
    setReducedMotion(false);
    vi.useFakeTimers();
    try {
      render(<Harness initial={sam} />);
      const stage = screen.getByRole('region', { name: 'Stage' });
      expect(stage).toHaveClass('is-closed'); // opening reveal
      act(() => void vi.advanceTimersByTime(400));
      expect(stage).not.toHaveClass('is-closed');

      fireEvent.click(screen.getByRole('button', { name: 'Wear Ghosted' }));
      expect(stage).toHaveClass('is-closed');
      expect(stageName()).toBe('as La Chancla'); // still hidden behind the curtain
      act(() => void vi.advanceTimersByTime(100));
      fireEvent.click(screen.getByRole('button', { name: 'Wear Cat Burglar' }));
      act(() => void vi.advanceTimersByTime(100));
      fireEvent.click(screen.getByRole('button', { name: 'Wear Don Nopal' }));

      act(() => void vi.advanceTimersByTime(CURTAIN_MS + 30));
      expect(stageName()).toBe('as Don Nopal');
      expect(stage).toHaveClass('is-closed');
      act(() => void vi.advanceTimersByTime(CURTAIN_BEAT_MS));
      expect(stage).not.toHaveClass('is-closed');
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
