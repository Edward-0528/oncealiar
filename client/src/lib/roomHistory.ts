/**
 * Has this browser seen a game start in room `code`? The contract has no "games played"
 * counter, so the lobby uses this to tell the host the first game opens with the briefing
 * tutorial. sessionStorage: a fresh tab in an old room just assumes a first game.
 */
const KEY = 'oal.played.';

export function markRoomPlayed(code: string): void {
  try {
    sessionStorage.setItem(KEY + code, '1');
  } catch {
    /* storage blocked: harmless */
  }
}

export function hasRoomPlayed(code: string): boolean {
  try {
    return sessionStorage.getItem(KEY + code) === '1';
  } catch {
    return false;
  }
}
