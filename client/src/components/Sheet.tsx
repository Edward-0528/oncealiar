import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import './Sheet.css';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  variant?: 'sheet' | 'modal';
  hideTitle?: boolean;
}

/** Accessible bottom sheet (phones) / centered modal (desktop). */
export function Sheet({ open, onClose, title, children, footer, variant = 'sheet', hideTitle }: Props) {
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    lastFocus.current = document.activeElement as HTMLElement;
    const t = setTimeout(() => {
      const el = panel.current?.querySelector<HTMLElement>('[data-autofocus], button, input, [tabindex="0"]');
      el?.focus();
    }, 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && panel.current) {
        const f = panel.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), [tabindex="0"], a[href]');
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      lastFocus.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className={`sheet-root sheet-root--${variant}`} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={panel} className="sheet" role="dialog" aria-modal="true" aria-labelledby={id}>
        <div className="sheet__grab" aria-hidden="true" />
        <header className={`sheet__head ${hideTitle ? 'sr-only' : ''}`}>
          <h2 id={id} className="display h3">
            {title}
          </h2>
          <button className="icon-btn sheet__close" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </header>
        <div className="sheet__body">{children}</div>
        {footer && <footer className="sheet__foot">{footer}</footer>}
      </div>
    </div>,
    document.body
  );
}
