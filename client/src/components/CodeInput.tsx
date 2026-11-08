import React, { useEffect, useRef, useState } from 'react';
import { CODE_LENGTH as LEN, parseCodeInput } from '../lib/roomCode';
import './CodeInput.css';

interface Props {
  value: string;
  onChange: (v: string) => void;
  /** fired when the 4th valid letter lands (typing, paste or invite-link paste) */
  onComplete?: (v: string) => void;
  /** look-alike characters (I, O, 0, 1) that were refused */
  onReject?: (chars: string[]) => void;
  autoFocus?: boolean;
  disabled?: boolean;
  /** visual error state (e.g. room not found) */
  invalid?: boolean;
}

/**
 * Four auto-advancing boxes. Case-insensitive, handles typing, backspace, arrows,
 * paste of a code, a sentence with a code, or a full invite link.
 * Room codes never contain I, O or digits — those are refused with a gentle hint.
 */
export function CodeInput({ value, onChange, onComplete, onReject, autoFocus, disabled, invalid }: Props) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const chars = Array.from({ length: LEN }, (_, i) => value[i] ?? '');
  const [hint, setHint] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (!hint) return;
    const t = setTimeout(() => setHint(null), 2600);
    return () => clearTimeout(t);
  }, [hint]);

  const reject = (bad: string[]) => {
    if (!bad.length) return;
    setHint(`Codes never use ${bad.some((c) => c === 'O' || c === '0') ? 'O or 0' : 'I or 1'} — check the letter`);
    setShake(true);
    setTimeout(() => setShake(false), 400);
    onReject?.(bad);
  };

  const set = (next: string, focusIdx?: number) => {
    const v = next.slice(0, LEN);
    onChange(v);
    if (focusIdx !== undefined) refs.current[Math.min(LEN - 1, Math.max(0, focusIdx))]?.focus();
    if (v.length === LEN) onComplete?.(v);
  };

  const accept = (i: number, text: string) => {
    const parsed = parseCodeInput(text);
    if (parsed.fromLink || parsed.code.length === LEN) {
      // whole code / invite link pasted anywhere: replace everything
      set(parsed.code, LEN - 1);
      return;
    }
    reject(parsed.rejected);
    if (!parsed.code) return;
    const arr = chars.slice();
    const merged = (arr.slice(0, i).join('') + parsed.code).slice(0, LEN);
    set(merged + value.slice(merged.length), Math.min(merged.length, LEN - 1));
  };

  return (
    <div className="code-input-wrap">
      <div className={`code-input ${shake ? 'is-shaking' : ''} ${invalid ? 'is-invalid' : ''}`} role="group" aria-label="Room code">
        {chars.map((c, i) => (
          <input
            key={i}
            ref={(el) => (refs.current[i] = el)}
            className={`code-input__box ${c ? 'is-filled' : ''}`}
            value={c}
            inputMode="text"
            enterKeyHint="go"
            autoCapitalize="characters"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            autoCorrect="off"
            spellCheck={false}
            autoFocus={autoFocus && i === 0}
            disabled={disabled}
            aria-label={`Room code character ${i + 1}`}
            aria-invalid={invalid || undefined}
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => {
              const typed = e.target.value;
              if (!typed) return;
              // typing over a filled box gives "AB" — keep only the new character
              const fresh = typed.length === 2 && c && typed.toUpperCase().startsWith(c) ? typed.slice(1) : typed;
              accept(i, fresh);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Backspace') {
                e.preventDefault();
                const arr = chars.slice();
                if (arr[i]) {
                  arr[i] = '';
                  set(arr.join(''), i);
                } else if (i > 0) {
                  arr[i - 1] = '';
                  set(arr.join(''), i - 1);
                }
              } else if (e.key === 'ArrowLeft') refs.current[i - 1]?.focus();
              else if (e.key === 'ArrowRight') refs.current[i + 1]?.focus();
            }}
            onPaste={(e) => {
              e.preventDefault();
              accept(0, e.clipboardData.getData('text'));
            }}
          />
        ))}
      </div>
      <p className={`code-input__hint ${hint ? 'is-on' : ''}`} role="status" aria-live="polite">
        {hint ?? ''}
      </p>
    </div>
  );
}
