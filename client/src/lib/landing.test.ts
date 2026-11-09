import { describe, expect, it } from 'vitest';
import { shouldShowLanding, type LandingContext } from './landing';

const stranger: LandingContext = { pathname: '/', search: '', hasSession: false, hasName: false, hasPlayed: false, standalone: false };
const at = (over: Partial<LandingContext>) => shouldShowLanding({ ...stranger, ...over });

describe('shouldShowLanding', () => {
  it('shows strangers the landing page on the bare domain', () => {
    expect(at({})).toBe(true);
    expect(at({ search: '?utm_source=tiktok&ref=card' })).toBe(true);
  });
  it('never hides an invite: /ABCD, ?room=, ?tv=, ?code=', () => {
    expect(at({ pathname: '/ABCD' })).toBe(false);
    expect(at({ search: '?room=ABCD' })).toBe(false);
    expect(at({ search: '?tv=ABCD' })).toBe(false);
    expect(at({ search: '?code=ABCD' })).toBe(false);
  });
  it('the app lives at /start', () => {
    expect(at({ pathname: '/start' })).toBe(false);
  });
  it('returning players and installed apps go straight to the app', () => {
    expect(at({ hasSession: true })).toBe(false);
    expect(at({ hasName: true })).toBe(false);
    expect(at({ hasPlayed: true })).toBe(false);
    expect(at({ standalone: true })).toBe(false);
    expect(at({ search: '?source=pwa' })).toBe(false);
  });
  it('dev and mock screens are untouched', () => {
    expect(at({ search: '?mock=lobby' })).toBe(false);
    expect(at({ search: '?player=2' })).toBe(false);
  });
  it('?landing=1 forces the page for previews', () => {
    expect(at({ search: '?landing=1', hasName: true, standalone: true })).toBe(true);
    expect(at({ pathname: '/start', search: '?landing=1' })).toBe(true);
  });
});
