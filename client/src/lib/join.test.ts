import { describe, it, expect } from 'vitest';
import { parseCodeInput, roomFromLocation, isValidCode } from './roomCode';
import { codename, dedupeName, isPremiumAvatar, profileForRoom, sanitizeProfile } from './profile';

describe('room code parsing', () => {
  it('is case-insensitive and strips junk', () => {
    expect(parseCodeInput('ab cd').code).toBe('ABCD');
    expect(parseCodeInput(' wxyz ').code).toBe('WXYZ');
  });
  it('rejects look-alike characters gracefully', () => {
    const r = parseCodeInput('AO1B');
    expect(r.code).toBe('AB');
    expect(r.rejected).toEqual(['O', '1']);
  });
  it('accepts full invite links and shared messages', () => {
    expect(parseCodeInput('https://oncealiar.app/QRST').code).toBe('QRST');
    expect(parseCodeInput('https://oncealiar.app/?room=qrst').code).toBe('QRST');
    expect(parseCodeInput('localhost:5173/abcd?player=2').code).toBe('ABCD');
    expect(parseCodeInput('Join my Once a Liar game — room WXYZ!').code).toBe('WXYZ');
  });
  it('reads the room from ?room=, /CODE and ?tv=', () => {
    expect(roomFromLocation({ pathname: '/', search: '?room=abcd' })).toEqual({ code: 'ABCD', tv: null });
    expect(roomFromLocation({ pathname: '/WXYZ', search: '' })).toEqual({ code: 'WXYZ', tv: null });
    expect(roomFromLocation({ pathname: '/', search: '?tv=WXYZ' })).toEqual({ code: null, tv: 'WXYZ' });
    expect(roomFromLocation({ pathname: '/OOPS', search: '' }).code).toBeNull(); // O is never in a code
    expect(roomFromLocation({ pathname: '/healthz', search: '' }).code).toBeNull();
  });
  it('validates codes', () => {
    expect(isValidCode('ABCD')).toBe(true);
    expect(isValidCode('ABIO')).toBe(false);
    expect(isValidCode('ABC')).toBe(false);
  });
});

describe('zero-typing profiles', () => {
  it('generates a fun codename matching the avatar', () => {
    const n = codename('duck');
    expect(n).toMatch(/ Duck$/);
    expect(n.length).toBeLessThanOrEqual(16);
  });
  it('avoids codenames already in the room', () => {
    const taken = Array.from({ length: 40 }, (_, i) => codename('pigeon', [], () => (i % 40) / 40));
    const n = codename('pigeon', taken);
    expect(taken.map((t) => t.toLowerCase())).not.toContain(n.toLowerCase());
  });
  it('suffixes duplicate names nicely', () => {
    expect(dedupeName('Sam', ['sam'])).toBe('Sam 2');
    expect(dedupeName('Sam', ['Sam', 'Sam 2'])).toBe('Sam 3');
    expect(dedupeName('Maximilianopolis', ['maximilianopolis'])).toBe('Maximilianopol 2');
    expect(dedupeName('Ana', ['Bob'])).toBe('Ana');
  });
  it('first-timers get a free character; returning visitors keep theirs', () => {
    const taken = { names: ['Sneaky Duck'], avatars: ['duck', 'cat'], colors: ['coral'] };
    const fresh = profileForRoom({ name: '', avatar: 'duck', color: 'coral' }, taken);
    expect(fresh.generated).toBe(true);
    expect(['duck', 'cat']).not.toContain(fresh.profile.avatar);
    expect(fresh.profile.color).not.toBe('coral');
    expect(fresh.profile.name.length).toBeGreaterThan(0);
    const back = profileForRoom({ name: 'Sneaky Duck', avatar: 'duck', color: 'coral' }, taken);
    expect(back.generated).toBe(false);
    expect(back.profile).toEqual({ name: 'Sneaky Duck 2', avatar: 'duck', color: 'coral' });
  });
  it('drops old avatar ids and swaps premium characters in free rooms', () => {
    expect(sanitizeProfile({ name: 'X', avatar: 'fox', color: 'coral' }).avatar).not.toBe('fox');
    const p = profileForRoom({ name: 'Ana', avatar: 'abuela', color: 'sky' }, { names: [], avatars: [], colors: [] });
    expect(isPremiumAvatar(p.profile.avatar)).toBe(false);
    const prem = profileForRoom({ name: 'Ana', avatar: 'abuela', color: 'sky' }, { names: [], avatars: [], colors: [] }, Math.random, true);
    expect(prem.profile.avatar).toBe('abuela');
  });
});
