import React from 'react';
import { Sheet } from './Sheet';

/** Host-only confirm: closes the room and sends every phone back to the home screen. */
export function EndSessionSheet({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: () => void }) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="End the session for everyone?"
      variant="modal"
      footer={
        <>
          <button className="btn btn--secondary btn--sm" onClick={onClose}>
            Keep playing
          </button>
          <button className="btn btn--primary btn--sm" onClick={onConfirm}>
            End session
          </button>
        </>
      }
    >
      <p className="dim">The room closes and every phone goes back to the home screen. Anyone can host a new game after.</p>
    </Sheet>
  );
}
