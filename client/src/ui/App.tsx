import React, { useEffect, useState, useMemo, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { GameState, PlayerID, ClientVisibleRound, Player } from '@oncealiar/shared';

let socket: Socket | null = null;

export const App: React.FC = () => {
  const [connected, setConnected] = useState(false);
  const [game, setGame] = useState<GameState | null>(null);
  const [you, setYou] = useState<PlayerID | null>(null);
  const [round, setRound] = useState<ClientVisibleRound | null>(null);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('😀');
  const [roomCode, setRoomCode] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const attemptedAutoJoinRef = useRef(false);
  const reclaimTriedRef = useRef(false);

  // Read ?room=CODE from URL once
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlCode = (params.get('room') || '').toUpperCase();
    if (urlCode && !roomCode) setRoomCode(urlCode);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist roomCode
  useEffect(() => {
    if (roomCode) localStorage.setItem('oncealiar_room', roomCode);
  }, [roomCode]);

  useEffect(() => {
    if (!socket) {
      socket = io({ autoConnect: true });
      socket.on('connect', () => setConnected(true));
      socket.on('game:update', (state, youId) => {
        setGame(structuredClone(state));
        setYou(youId);
        if (state.code) setRoomCode(state.code);
        // persist latest identity
        try {
          localStorage.setItem('oncealiar_player', youId);
        } catch {}
      });
      socket.on('round', r => setRound(r));
      socket.on('error', msg => alert(msg));
  socket.on('room:created', (code, youId) => { setRoomCode(code); if (youId) setYou(youId); generateQr(code); pushCodeToUrl(code); });
  socket.on('room:joined', (code, youId) => { setRoomCode(code); if (youId) setYou(youId); generateQr(code); pushCodeToUrl(code); });
    }
    return () => { /* keep socket persistent */ };
  }, [roomCode]);

  // Auto attempt join if we have a code but not yet in a game (fresh page load or reconnect)
  useEffect(() => {
    if (!socket || !connected) return;
    // First, attempt reclaim if not done
    if (!reclaimTriedRef.current) {
      reclaimTriedRef.current = true;
      const storedPlayer = localStorage.getItem('oncealiar_player');
      if (storedPlayer) {
        socket.emit('player:reclaim', storedPlayer, (ok: boolean, code?: string) => {
          if (ok && code) {
            // success: roomCode will arrive via game:update
            return;
          }
          // fallback to join if we already have a stored room
          const storedRoom = localStorage.getItem('oncealiar_room');
          if (storedRoom) {
            socket?.emit('room:join', storedRoom);
          }
        });
        return;
      }
    }
    if (!roomCode) return;
    if (game) return; // already in game
    if (attemptedAutoJoinRef.current) return;
    attemptedAutoJoinRef.current = true;
    socket.emit('room:join', roomCode);
  }, [connected, roomCode, game]);

  function pushCodeToUrl(code: string) {
    const params = new URLSearchParams(window.location.search);
    if (params.get('room') !== code) {
      params.set('room', code);
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState(null, '', newUrl);
    }
  }

  function createRoom() {
    socket?.emit('room:create');
  }
  function joinRoom() {
    socket?.emit('room:join', joinCodeInput.trim());
  }
  function join() {
    if (!roomCode) return; // safeguard
    socket?.emit('player', name || 'Player', avatar);
  }
  function start() { socket?.emit('start'); }
  function vote(pid: PlayerID) { socket?.emit('vote', pid); }

  const isHost = you && game?.hostId === you;
  const playerCount = game ? Object.keys(game.players).length : 0;
  const minPlayers = (game as any)?.settings?.minPlayers ?? 3;
  const now = Date.now();
  const timeRemaining = useMemo(() => {
    if (!round?.endsAt) return null;
    return Math.max(0, round.endsAt - now);
  }, [round, now]);

  function generateQr(code: string) {
    // Derive a shareable base URL. If running on localhost but we have a stored lanHost in localStorage, use it.
    const stored = localStorage.getItem('oncealiar_lan_host');
    const loc = window.location;
    let origin = loc.origin;
    if (stored && /^(https?:)?\/\//.test(stored)) {
      origin = stored.replace(/\/$/, '');
    } else if (stored) {
      origin = `${loc.protocol}//${stored}`;
    }
    const shareUrl = `${origin}?room=${code}`;
    // Use quick chart API for dev; could swap to local QR lib later.
    const api = 'https://chart.googleapis.com/chart';
    setQrDataUrl(`${api}?cht=qr&chs=220x220&chl=${encodeURIComponent(shareUrl)}&chld=H|0`);
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: 16, maxWidth: 960, margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>Once A Liar</h1>
        <div style={{ fontSize: 12, opacity: 0.8 }}>Status: {connected ? 'Online' : 'Connecting…'}</div>
      </header>
      <hr />

      {!roomCode && (
        <section style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div>
            <h2>Create Room</h2>
            <button onClick={createRoom} disabled={!connected}>New Room</button>
          </div>
          <div>
            <h2>Join Room</h2>
            <input
              placeholder="ABC123"
              value={joinCodeInput}
              onChange={e => setJoinCodeInput(e.target.value.toUpperCase())}
              maxLength={6}
              style={{ textTransform: 'uppercase', letterSpacing: 2 }}
            />{' '}
            <button onClick={joinRoom} disabled={!connected || joinCodeInput.length < 4}>Join</button>
          </div>
        </section>
      )}

      {roomCode && !game && (
        <section style={{ marginTop: 24 }}>
          <h2>Room Code: <code style={{ fontSize: 24, letterSpacing: 4 }}>{roomCode}</code></h2>
          {qrDataUrl && <img alt="QR Code" src={qrDataUrl} style={{ background: '#fff', padding: 8, borderRadius: 8 }} />}
          <details style={{ marginTop: 12 }}>
            <summary style={{ cursor: 'pointer' }}>Mobile / LAN Help</summary>
            <div style={{ fontSize: 12, lineHeight: 1.4, marginTop: 8 }}>
              <p style={{ margin: '4px 0' }}>If phones can't scan or connect, ensure you started with the LAN script (<code>npm run dev:lan</code>) so this page is served on your local IP instead of just <code>localhost</code>.</p>
              <p style={{ margin: '4px 0' }}>To force a specific host/IP (e.g. 192.168.1.42:5173) enter it here (with or without protocol) then refresh the QR:</p>
              <LanHostSetter onRefresh={() => roomCode && generateQr(roomCode)} />
            </div>
          </details>
          <p style={{ opacity: 0.8 }}>Share the code or QR. When ready, enter your player details:</p>
          <div>
            <input placeholder="Name" value={name} onChange={e => setName(e.target.value)} />{' '}
            <input placeholder="Avatar" value={avatar} onChange={e => setAvatar(e.target.value)} style={{ width: 60 }} />{' '}
            <button onClick={join} disabled={!connected || !roomCode}>Join Lobby</button>
          </div>
          <p style={{ fontSize: 12, opacity: 0.6 }}>If you refresh, you'll auto-rejoin room {roomCode}.</p>
        </section>
      )}

      {game && (
        <div style={{ display: 'flex', gap: 32, marginTop: 32, alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ marginTop: 0 }}>Lobby / Players ({Object.keys(game.players).length})</h2>
            <p style={{ marginTop: 0 }}>Room: <strong>{game.code}</strong></p>
            <ul>
              {Object.values<Player>(game.players as Record<string, Player>).map(p => {
                return (
                  <li key={p.id} style={{ marginBottom: 4 }}>
                    {p.avatar} <strong>{p.name}</strong> {p.id === you && <em>(You)</em>} {p.vote && '🔍'}
                  </li>
                );
              })}
            </ul>
            {isHost && game.round.phase === 'lobby' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                <button onClick={start} disabled={playerCount < minPlayers}>Start Round</button>
                {playerCount < minPlayers && (
                  <span style={{ fontSize: 12, opacity: 0.7 }}>Need {minPlayers} players (have {playerCount}).</span>
                )}
              </div>
            )}
            {isHost && (
              <div style={{ marginTop: 16 }}>
                <details>
                  <summary style={{ cursor: 'pointer', fontSize: 12, opacity: 0.8 }}>Host Tools (testing)</summary>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                    <PhaseButton phase="in-progress" label="Force Start" />
                    <PhaseButton phase="voting" label="To Voting" />
                    <PhaseButton phase="reveal" label="Reveal" />
                    <PhaseButton phase="lobby" label="Reset Lobby" />
                  </div>
                </details>
              </div>
            )}
          </div>
          <div style={{ flex: 2 }}>
            <h2 style={{ marginTop: 0 }}>Round</h2>
            {round ? (
              <div style={{ background: '#1b2230', padding: 16, borderRadius: 8 }}>
                <p style={{ margin: '4px 0' }}>Phase: <strong>{round.phase}</strong></p>
                {timeRemaining !== null && (
                  <p style={{ margin: '4px 0' }}>Time Left: {Math.ceil(timeRemaining / 1000)}s</p>
                )}
                {!round.youAreSpy && round.secretWord && (
                  <p style={{ margin: '8px 0' }}>Secret Word: <strong>{round.secretWord}</strong></p>
                )}
                {round.youAreSpy && <p style={{ margin: '8px 0' }}>You are the SPY! Blend in.</p>}
                {round.phase === 'voting' && (
                  <div>
                    <h3>Accuse</h3>
                    {Object.values<Player>(game.players as Record<string, Player>).filter(p => p.id !== you).map(p => (
                      <button key={p.id} onClick={() => vote(p.id)} style={{ margin: 4 }}>{p.name}</button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p>No round yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const LanHostSetter: React.FC<{ onRefresh: () => void }> = ({ onRefresh }) => {
  const [value, setValue] = React.useState<string>(() => localStorage.getItem('oncealiar_lan_host') || '');
  function save() {
    if (value.trim()) {
      localStorage.setItem('oncealiar_lan_host', value.trim());
    } else {
      localStorage.removeItem('oncealiar_lan_host');
    }
    onRefresh();
  }
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
      <input
        placeholder="192.168.1.42:5173"
        value={value}
        onChange={e => setValue(e.target.value)}
        style={{ width: 180 }}
      />
      <button onClick={save}>Apply</button>
      <button onClick={() => { setValue(''); localStorage.removeItem('oncealiar_lan_host'); onRefresh(); }}>Clear</button>
    </div>
  );
};

const PhaseButton: React.FC<{ phase: any; label: string }> = ({ phase, label }) => {
  function send() {
    socket?.emit('round:phase', phase);
  }
  return <button onClick={send} style={{ fontSize: 12 }}>{label}</button>;
};
