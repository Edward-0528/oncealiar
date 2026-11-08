import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { Transport, RoomPeek } from '../lib/transport';
import { Avatar } from '../components/Avatar';
import { PresenceBadge } from '../components/Overlays';
import { inviteUrl, shortInviteUrl } from '../lib/share';
import { colorVar } from '../lib/profile';
import './TvView.css';

const POLL_MS = 2000;

const PHASE_LABEL: Record<RoomPeek['phase'], string> = {
  lobby: 'Waiting for players',
  'role-reveal': 'Checking secret roles…',
  clues: 'Clue time',
  discussion: 'Interrogation in progress',
  voting: 'Voting!',
  'liar-guess': 'The liar is guessing…',
  results: 'The truth comes out',
  'game-over': 'Game over'
};

/**
 * Read-only "cast to TV" lobby at `?tv=ABCD`: big room code + QR + who's in.
 * Uses the public `room:peek` snapshot only — it never joins the room, so it can't leak
 * roles or words and doesn't take a seat.
 */
export function TvView({ code, transport }: { code: string; transport: Transport }) {
  const [room, setRoom] = useState<RoomPeek | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      const r = transport.peek ? await transport.peek(code) : null;
      if (!alive) return;
      setRoom((prev) => (r === null && prev ? prev : r)); // keep the last good snapshot through blips
      timer = setTimeout(poll, POLL_MS);
    };
    void poll();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [code, transport]);

  useEffect(() => {
    document.title = `Room ${code} — Once a Liar`;
  }, [code]);

  const url = inviteUrl(code);
  return (
    <main className="tv">
      <header className="tv__mast">
        <span className="tv__paper display">The Daily Fib</span>
        <span className="tv__edition">Special edition · Room {code}</span>
      </header>

      <section className="tv__join">
        <div className="tv__code-block">
          <span className="tv__eyebrow">Join on your phone</span>
          <div className="tv__code display" aria-label={`Room code ${code.split('').join(' ')}`}>
            {code}
          </div>
          <span className="tv__url">{shortInviteUrl(code)}</span>
        </div>
        <div className="tv__qr">
          <QRCodeSVG value={url} size={320} level="M" bgColor="#ffffff" fgColor="#111111" style={{ width: '100%', height: 'auto' }} />
          <span className="tv__qr-cap">Scan to play</span>
        </div>
      </section>

      <section className="tv__players">
        <h2 className="tv__status display">
          {room === undefined ? 'Connecting…' : room === null ? 'Room not found' : PHASE_LABEL[room.phase]}
          {room && room.phase !== 'lobby' && room.phase !== 'game-over' && room.settings && (
            <span className="tv__round"> · Round {room.round} of {room.settings.roundsPerGame}</span>
          )}
        </h2>
        {room === null && <p className="tv__empty">Check the code, or start a new game on a phone.</p>}
        {room && (
          <ul className="tv__grid">
            {room.players.map((p) => (
              <li key={p.id} className="tv__player" style={{ ['--pc' as string]: colorVar(p.color) }}>
                <span className="tv__avatar">
                  <Avatar avatar={p.avatar} color={p.color} size={84} label="" />
                </span>
                <span className="tv__name">{p.name}</span>
                {room.phase !== 'lobby' && <span className="tv__score">{p.score} pts</span>}
                {p.isHost && <span className="tv__host">Host</span>}
                <PresenceBadge player={p} className="tv__presence" />
              </li>
            ))}
            {room.phase === 'lobby' &&
              Array.from({ length: Math.max(0, 3 - room.players.length) }, (_, i) => (
                <li key={`e${i}`} className="tv__player tv__player--empty" aria-hidden="true">
                  <span className="tv__avatar" />
                  <span className="tv__name">waiting…</span>
                </li>
              ))}
          </ul>
        )}
      </section>
    </main>
  );
}
