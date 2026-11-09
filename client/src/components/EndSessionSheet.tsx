import React from 'react';
import { Sheet } from './Sheet';

/**
 * Host-only confirm. In the lobby the room closes and every phone goes home; mid-game
 * (`midGame`) the server ends the session and every phone lands on the final scores.
 */
export function EndSessionSheet({ open, onClose, onConfirm, midGame = false }: { open: boolean; onClose: () => void; onConfirm: () => void; midGame?: boolean }) {
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
      <p className="dim">
        {midGame
          ? 'Everyone goes to the final scores. The game can’t be resumed after.'
          : 'The room closes and every phone goes back to the home screen. Anyone can host a new game after.'}
      </p>
    </Sheet>
  );
}
