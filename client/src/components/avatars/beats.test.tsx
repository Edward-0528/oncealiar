import React from 'react';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, act, renderHook } from '@testing-library/react';
import { Avatar, SWAP_GAG_DELAY_MS } from '../Avatar';
import { useBeat, useBeatCues, beatLayerKey, BEAT_IDS, BEAT_MS } from './beats';
import { staggerDelay, STAGGER_CAP } from '../../lib/motion';

const layer = (c: HTMLElement) => c.querySelector('.av-beat-layer') as SVGGElement;

describe('Avatar beats', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('is still at rest: no beat class and no looping classes by default', () => {
    const { container } = render(<Avatar avatar="chancla" color="sky" animated />);
    expect(layer(container).getAttribute('class')).toBe('av-beat-layer');
    expect(container.querySelector('.av--animated')).toBeNull();
  });

  it('applies the beat class and restarts (remounts the layer) only when the key changes', () => {
    const { container, rerender } = render(<Avatar avatar="chancla" color="sky" beat={{ id: 'drop', key: 1 }} />);
    const first = layer(container);
    expect(first.getAttribute('class')).toContain('av-beat--drop');
    rerender(<Avatar avatar="chancla" color="sky" beat={{ id: 'drop', key: 1 }} mood="sus" />);
    expect(layer(container)).toBe(first);
    rerender(<Avatar avatar="chancla" color="sky" beat={{ id: 'drop', key: 2 }} />);
    expect(layer(container)).not.toBe(first);
    expect(layer(container).getAttribute('class')).toContain('av-beat--drop');
  });

  it('passes the delay as a CSS variable and marks held beats on the root', () => {
    const { container } = render(<Avatar avatar="duck" color="sky" beat={{ id: 'slump', key: 'x', delay: 300 }} />);
    expect(layer(container).style.getPropertyValue('--beat-delay')).toBe('300ms');
    expect(container.querySelector('svg')!.getAttribute('class')).toContain('av--beat-slump');
  });

  it('animated={false} suppresses beats', () => {
    const { container } = render(<Avatar avatar="duck" color="sky" animated={false} beat={{ id: 'gloat', key: 1 }} />);
    expect(container.querySelector('.av-beat')).toBeNull();
  });

  it('an animated avatar plays its gag once when the character is swapped (not on mount)', () => {
    const { container, rerender } = render(<Avatar avatar="chancla" color="sky" animated />);
    expect(container.querySelector('.av-beat--gag')).toBeNull();
    rerender(<Avatar avatar="duck" color="sky" animated />);
    const l = layer(container);
    expect(l.getAttribute('class')).toContain('av-beat--gag');
    expect(l.style.getPropertyValue('--beat-delay')).toBe(`${SWAP_GAG_DELAY_MS}ms`);
  });

  it('useBeat fires with a fresh key every time, even for the same beat', () => {
    const { result } = renderHook(() => useBeat());
    expect(result.current[0]).toBeUndefined();
    act(() => result.current[1]('gag'));
    const k1 = beatLayerKey(result.current[0]);
    act(() => result.current[1]('gag'));
    expect(beatLayerKey(result.current[0])).not.toBe(k1);
    expect(result.current[0]?.id).toBe('gag');
  });

  it('useBeatCues plays a scripted sequence of beats', () => {
    vi.useFakeTimers();
    const cues = [
      { at: 100, id: 'flinch' as const },
      { at: 300, id: 'flinch' as const },
      { at: 500, id: 'accused' as const }
    ];
    const { result } = renderHook(() => useBeatCues(cues));
    expect(result.current).toBeUndefined();
    act(() => void vi.advanceTimersByTime(100));
    const a = result.current;
    expect(a?.id).toBe('flinch');
    act(() => void vi.advanceTimersByTime(200));
    expect(result.current?.id).toBe('flinch');
    expect(result.current?.key).not.toBe(a?.key);
    act(() => void vi.advanceTimersByTime(200));
    expect(result.current?.id).toBe('accused');
  });

  it('every beat is a short one-shot', () => {
    for (const id of BEAT_IDS) {
      expect(BEAT_MS[id]).toBeGreaterThanOrEqual(260);
      expect(BEAT_MS[id]).toBeLessThanOrEqual(700);
    }
  });
});

describe('motion helpers', () => {
  it('caps the entrance stagger', () => {
    expect(staggerDelay(0)).toBe(0);
    expect(staggerDelay(2)).toBe(80);
    expect(staggerDelay(50)).toBe(STAGGER_CAP * 40);
  });
});

describe('no ambient loops', () => {
  // Only real progress indicators may loop forever.
  const ALLOWED = new Set(['components/Overlays.css', 'components/WakeUp.css']);
  const root = join(__dirname, '..', '..');
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((f) => {
      const p = join(dir, f);
      return statSync(p).isDirectory() ? walk(p) : p.endsWith('.css') ? [p] : [];
    });

  it('has no `infinite` animations outside loading spinners', () => {
    const offenders = walk(root)
      .filter((f) => !ALLOWED.has(relative(root, f)))
      .filter((f) => /animation(-iteration-count)?\s*:[^;}]*\binfinite\b/.test(readFileSync(f, 'utf8')))
      .map((f) => relative(root, f));
    expect(offenders).toEqual([]);
  });
});
