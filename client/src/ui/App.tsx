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
      });
      socket.on('round', r => setRound(r));
      socket.on('error', msg => alert(msg));
      socket.on('room:created', code => { setRoomCode(code); generateQr(code); pushCodeToUrl(code); });
      socket.on('room:joined', code => { setRoomCode(code); generateQr(code); pushCodeToUrl(code); });
    }
    return () => { /* keep socket persistent */ };
  }, [roomCode]);

  // Auto attempt join if we have a code but not yet in a game (fresh page load or reconnect)
  useEffect(() => {
    if (!socket || !connected) return;
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
  const now = Date.now();
  const timeRemaining = useMemo(() => {
    if (!round?.endsAt) return null;
    return Math.max(0, round.endsAt - now);
  }, [round, now]);

  function generateQr(code: string) {
    // Lightweight inline QR alternative (no dependency) using a free API (could later swap to local lib to avoid external call)
    const url = `${window.location.origin}?room=${code}`;
    // Use Google Chart quick API (for dev only). Replace with local generator before production.
    setQrDataUrl(`https://chart.googleapis.com/chart?cht=qr&chs=180x180&chl=${encodeURIComponent(url)}`);
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
              {Object.values(game.players).map(pRaw => {
                const p = pRaw as Player;
                return (
                  <li key={p.id} style={{ marginBottom: 4 }}>
                    {p.avatar} <strong>{p.name}</strong> {p.id === you && <em>(You)</em>} {p.vote && '🔍'}
                  </li>
                );
              })}
            </ul>
            {isHost && game.round.phase === 'lobby' && (
              <button onClick={start} style={{ marginTop: 8 }}>Start Round</button>
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
                    {Object.values(game.players).filter(p => p.id !== you).map(p => (
                      <button key={p.id} onClick={() => vote(p.id)} style={{ margin: 4 }}>{(p as Player).name}</button>
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
