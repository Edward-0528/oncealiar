import React, { useEffect, useRef, useState } from 'react';
import { useGame } from '../state/GameProvider';

type Props = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'disabled'> & {
  /** the action; resolve true when the server accepted it (false/throw = it failed, toast already shown) */
  onAct: () => Promise<boolean> | boolean | void;
  /** label while waiting for the server ("Starting…") */
  pendingLabel?: React.ReactNode;
  /** when set, the button looks dimmed but stays tappable: tapping it explains why in a toast */
  blockedReason?: string | null;
  /** also print the reason under the button */
  showReason?: boolean;
  /** hard-disable (use only when there is nothing useful to say) */
  disabled?: boolean;
};

/**
 * A button that is never silently dead:
 *  - while the link is down it says so (and does not queue a tap that could replay later),
 *  - while the server is answering it shows a pending label and ignores double taps,
 *  - when blocked it dims but explains why on tap (and optionally prints the reason).
 */
export function ActionButton({ onAct, pendingLabel, blockedReason, showReason, disabled, children, className = '', ...rest }: Props) {
  const { conn, toast, transport } = useGame();
  const [pending, setPending] = useState(false);
  const alive = useRef(true);
  useEffect(() => () => void (alive.current = false), []);

  const offline = transport.kind === 'live' && conn !== 'connected';
  const reason = blockedReason || (offline ? 'Reconnecting… hold tight' : null);

  const click = async () => {
    if (pending || disabled) return;
    if (reason) {
      toast(reason, 'error');
      return;
    }
    setPending(true);
    try {
      await onAct();
    } finally {
      if (alive.current) setPending(false);
    }
  };

  return (
    <>
      <button
        {...rest}
        type={rest.type ?? 'button'}
        className={`${className} ${reason ? 'is-blocked' : ''} ${pending ? 'is-pending' : ''}`.trim()}
        aria-disabled={!!reason || undefined}
        aria-busy={pending || undefined}
        disabled={disabled}
        onClick={click}
      >
        {pending && pendingLabel ? pendingLabel : children}
      </button>
      {showReason && reason && <p className="action-reason" role="status">{reason}</p>}
    </>
  );
}
