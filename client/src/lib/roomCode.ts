/**
 * Room-code parsing shared by the code boxes, deep links and paste handling.
 * Mirrors server/src/validation.ts: 4 letters, no I or O, no digits.
 */
export const CODE_LENGTH = 4;
export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
/** characters people type by mistake (look-alikes); never valid in a code */
export const CONFUSABLE = /[IO01]/;

export const isValidCode = (c: string | null | undefined): c is string =>
  !!c && c.length === CODE_LENGTH && [...c].every((ch) => CODE_ALPHABET.includes(ch));

export interface ParsedCodeInput {
  /** valid letters only, uppercased, max 4 */
  code: string;
  /** look-alike characters that were dropped (I, O, 0, 1) */
  rejected: string[];
  /** true when the text looked like an invite link */
  fromLink: boolean;
}

/** Pull a room code out of anything a person might type or paste:
 *  "abcd", "AB CD", "https://host/ABCD", "https://host/?room=abcd", "Join my game — room ABCD!" */
export function parseCodeInput(text: string): ParsedCodeInput {
  const raw = text.trim();
  const link = codeFromUrlish(raw);
  if (link) return { code: link, rejected: [], fromLink: true };
  // a sentence containing a 4-letter uppercase word ("…room ABCD!")
  if (raw.length > 8) {
    const word = raw.match(/\b([A-Z]{4})\b(?!.*\b[A-Z]{4}\b)/);
    if (word && isValidCode(word[1])) return { code: word[1], rejected: [], fromLink: false };
  }
  const up = raw.toUpperCase();
  const rejected: string[] = [];
  let code = '';
  for (const ch of up) {
    if (code.length >= CODE_LENGTH) break;
    if (CODE_ALPHABET.includes(ch)) code += ch;
    else if (CONFUSABLE.test(ch)) rejected.push(ch);
  }
  return { code, rejected, fromLink: false };
}

function codeFromUrlish(raw: string): string | null {
  if (!/[/?=]/.test(raw)) return null;
  const q = raw.match(/[?&](?:room|tv)=([A-Za-z]{4})\b/);
  if (q && isValidCode(q[1].toUpperCase())) return q[1].toUpperCase();
  const p = raw.match(/^(?:https?:\/\/)?[^/\s]+\/([A-Za-z]{4})\/?(?:[?#].*)?$/);
  if (p && isValidCode(p[1].toUpperCase())) return p[1].toUpperCase();
  return null;
}

export interface LocationRoom {
  code: string | null;
  tv: string | null;
}

/** Room requested by the current URL: `?room=ABCD`, `/ABCD`, or `?tv=ABCD` for the TV view. */
export function roomFromLocation(loc: Pick<Location, 'pathname' | 'search'> = window.location): LocationRoom {
  const params = new URLSearchParams(loc.search);
  const tv = params.get('tv')?.toUpperCase() ?? null;
  const q = params.get('room')?.toUpperCase() ?? null;
  const pm = loc.pathname.match(/^\/([A-Za-z]{4})\/?$/);
  const p = pm ? pm[1].toUpperCase() : null;
  return {
    code: isValidCode(q) ? q : isValidCode(p) ? p : null,
    tv: isValidCode(tv) ? tv : null
  };
}
