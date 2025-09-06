import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { io } from 'socket.io-client';
let socket = null;
export const App = () => {
    const [connected, setConnected] = useState(false);
    const [game, setGame] = useState(null);
    const [you, setYou] = useState(null);
    const [round, setRound] = useState(null);
    const [name, setName] = useState('');
    const [avatar, setAvatar] = useState('😀');
    const [roomCode, setRoomCode] = useState('');
    const [joinCodeInput, setJoinCodeInput] = useState('');
    const [qrDataUrl, setQrDataUrl] = useState('');
    const attemptedAutoJoinRef = useRef(false);
    const reclaimTriedRef = useRef(false);
    // Read ?room=CODE from URL once
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const urlCode = (params.get('room') || '').toUpperCase();
        if (urlCode && !roomCode)
            setRoomCode(urlCode);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    // Persist roomCode
    useEffect(() => {
        if (roomCode)
            localStorage.setItem('oncealiar_room', roomCode);
    }, [roomCode]);
    useEffect(() => {
        if (!socket) {
            socket = io({ autoConnect: true });
            socket.on('connect', () => setConnected(true));
            socket.on('game:update', (state, youId) => {
                setGame(structuredClone(state));
                setYou(youId);
                if (state.code)
                    setRoomCode(state.code);
                // persist latest identity
                try {
                    localStorage.setItem('oncealiar_player', youId);
                }
                catch { }
            });
            socket.on('round', r => setRound(r));
            socket.on('error', msg => alert(msg));
            socket.on('room:created', (code, youId) => { setRoomCode(code); if (youId)
                setYou(youId); generateQr(code); pushCodeToUrl(code); });
            socket.on('room:joined', (code, youId) => { setRoomCode(code); if (youId)
                setYou(youId); generateQr(code); pushCodeToUrl(code); });
        }
        return () => { };
    }, [roomCode]);
    // Auto attempt join if we have a code but not yet in a game (fresh page load or reconnect)
    useEffect(() => {
        if (!socket || !connected)
            return;
        // First, attempt reclaim if not done
        if (!reclaimTriedRef.current) {
            reclaimTriedRef.current = true;
            const storedPlayer = localStorage.getItem('oncealiar_player');
            if (storedPlayer) {
                socket.emit('player:reclaim', storedPlayer, (ok, code) => {
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
        if (!roomCode)
            return;
        if (game)
            return; // already in game
        if (attemptedAutoJoinRef.current)
            return;
        attemptedAutoJoinRef.current = true;
        socket.emit('room:join', roomCode);
    }, [connected, roomCode, game]);
    function pushCodeToUrl(code) {
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
        if (!roomCode)
            return; // safeguard
        socket?.emit('player', name || 'Player', avatar);
    }
    function start() { socket?.emit('start'); }
    function vote(pid) { socket?.emit('vote', pid); }
    const isHost = you && game?.hostId === you;
    const playerCount = game ? Object.keys(game.players).length : 0;
    const minPlayers = game?.settings?.minPlayers ?? 3;
    const now = Date.now();
    const timeRemaining = useMemo(() => {
        if (!round?.endsAt)
            return null;
        return Math.max(0, round.endsAt - now);
    }, [round, now]);
    function generateQr(code) {
        // Derive a shareable base URL. If running on localhost but we have a stored lanHost in localStorage, use it.
        const stored = localStorage.getItem('oncealiar_lan_host');
        const loc = window.location;
        let origin = loc.origin;
        if (stored && /^(https?:)?\/\//.test(stored)) {
            origin = stored.replace(/\/$/, '');
        }
        else if (stored) {
            origin = `${loc.protocol}//${stored}`;
        }
        const shareUrl = `${origin}?room=${code}`;
        // Use quick chart API for dev; could swap to local QR lib later.
        const api = 'https://chart.googleapis.com/chart';
        setQrDataUrl(`${api}?cht=qr&chs=220x220&chl=${encodeURIComponent(shareUrl)}&chld=H|0`);
    }
    return (_jsxs("div", { style: { fontFamily: 'system-ui, sans-serif', padding: 16, maxWidth: 960, margin: '0 auto' }, children: [_jsxs("header", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("h1", { style: { margin: 0 }, children: "Once A Liar" }), _jsxs("div", { style: { fontSize: 12, opacity: 0.8 }, children: ["Status: ", connected ? 'Online' : 'Connecting…'] })] }), _jsx("hr", {}), !roomCode && (_jsxs("section", { style: { display: 'flex', gap: 24, flexWrap: 'wrap' }, children: [_jsxs("div", { children: [_jsx("h2", { children: "Create Room" }), _jsx("button", { onClick: createRoom, disabled: !connected, children: "New Room" })] }), _jsxs("div", { children: [_jsx("h2", { children: "Join Room" }), _jsx("input", { placeholder: "ABC123", value: joinCodeInput, onChange: e => setJoinCodeInput(e.target.value.toUpperCase()), maxLength: 6, style: { textTransform: 'uppercase', letterSpacing: 2 } }), ' ', _jsx("button", { onClick: joinRoom, disabled: !connected || joinCodeInput.length < 4, children: "Join" })] })] })), roomCode && !game && (_jsxs("section", { style: { marginTop: 24 }, children: [_jsxs("h2", { children: ["Room Code: ", _jsx("code", { style: { fontSize: 24, letterSpacing: 4 }, children: roomCode })] }), qrDataUrl && _jsx("img", { alt: "QR Code", src: qrDataUrl, style: { background: '#fff', padding: 8, borderRadius: 8 } }), _jsxs("details", { style: { marginTop: 12 }, children: [_jsx("summary", { style: { cursor: 'pointer' }, children: "Mobile / LAN Help" }), _jsxs("div", { style: { fontSize: 12, lineHeight: 1.4, marginTop: 8 }, children: [_jsxs("p", { style: { margin: '4px 0' }, children: ["If phones can't scan or connect, ensure you started with the LAN script (", _jsx("code", { children: "npm run dev:lan" }), ") so this page is served on your local IP instead of just ", _jsx("code", { children: "localhost" }), "."] }), _jsx("p", { style: { margin: '4px 0' }, children: "To force a specific host/IP (e.g. 192.168.1.42:5173) enter it here (with or without protocol) then refresh the QR:" }), _jsx(LanHostSetter, { onRefresh: () => roomCode && generateQr(roomCode) })] })] }), _jsx("p", { style: { opacity: 0.8 }, children: "Share the code or QR. When ready, enter your player details:" }), _jsxs("div", { children: [_jsx("input", { placeholder: "Name", value: name, onChange: e => setName(e.target.value) }), ' ', _jsx("input", { placeholder: "Avatar", value: avatar, onChange: e => setAvatar(e.target.value), style: { width: 60 } }), ' ', _jsx("button", { onClick: join, disabled: !connected || !roomCode, children: "Join Lobby" })] }), _jsxs("p", { style: { fontSize: 12, opacity: 0.6 }, children: ["If you refresh, you'll auto-rejoin room ", roomCode, "."] })] })), game && (_jsxs("div", { style: { display: 'flex', gap: 32, marginTop: 32, alignItems: 'flex-start' }, children: [_jsxs("div", { style: { flex: 1 }, children: [_jsxs("h2", { style: { marginTop: 0 }, children: ["Lobby / Players (", Object.keys(game.players).length, ")"] }), _jsxs("p", { style: { marginTop: 0 }, children: ["Room: ", _jsx("strong", { children: game.code })] }), _jsx("ul", { children: Object.values(game.players).map(p => {
                                    return (_jsxs("li", { style: { marginBottom: 4 }, children: [p.avatar, " ", _jsx("strong", { children: p.name }), " ", p.id === you && _jsx("em", { children: "(You)" }), " ", p.vote && '🔍'] }, p.id));
                                }) }), isHost && game.round.phase === 'lobby' && (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }, children: [_jsx("button", { onClick: start, disabled: playerCount < minPlayers, children: "Start Round" }), playerCount < minPlayers && (_jsxs("span", { style: { fontSize: 12, opacity: 0.7 }, children: ["Need ", minPlayers, " players (have ", playerCount, ")."] }))] })), isHost && (_jsx("div", { style: { marginTop: 16 }, children: _jsxs("details", { children: [_jsx("summary", { style: { cursor: 'pointer', fontSize: 12, opacity: 0.8 }, children: "Host Tools (testing)" }), _jsxs("div", { style: { display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }, children: [_jsx(PhaseButton, { phase: "in-progress", label: "Force Start" }), _jsx(PhaseButton, { phase: "voting", label: "To Voting" }), _jsx(PhaseButton, { phase: "reveal", label: "Reveal" }), _jsx(PhaseButton, { phase: "lobby", label: "Reset Lobby" })] })] }) }))] }), _jsxs("div", { style: { flex: 2 }, children: [_jsx("h2", { style: { marginTop: 0 }, children: "Round" }), round ? (_jsxs("div", { style: { background: '#1b2230', padding: 16, borderRadius: 8 }, children: [_jsxs("p", { style: { margin: '4px 0' }, children: ["Phase: ", _jsx("strong", { children: round.phase })] }), timeRemaining !== null && (_jsxs("p", { style: { margin: '4px 0' }, children: ["Time Left: ", Math.ceil(timeRemaining / 1000), "s"] })), !round.youAreSpy && round.secretWord && (_jsxs("p", { style: { margin: '8px 0' }, children: ["Secret Word: ", _jsx("strong", { children: round.secretWord })] })), round.youAreSpy && _jsx("p", { style: { margin: '8px 0' }, children: "You are the SPY! Blend in." }), round.phase === 'voting' && (_jsxs("div", { children: [_jsx("h3", { children: "Accuse" }), Object.values(game.players).filter(p => p.id !== you).map(p => (_jsx("button", { onClick: () => vote(p.id), style: { margin: 4 }, children: p.name }, p.id)))] }))] })) : (_jsx("p", { children: "No round yet." }))] })] }))] }));
};
const LanHostSetter = ({ onRefresh }) => {
    const [value, setValue] = React.useState(() => localStorage.getItem('oncealiar_lan_host') || '');
    function save() {
        if (value.trim()) {
            localStorage.setItem('oncealiar_lan_host', value.trim());
        }
        else {
            localStorage.removeItem('oncealiar_lan_host');
        }
        onRefresh();
    }
    return (_jsxs("div", { style: { display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }, children: [_jsx("input", { placeholder: "192.168.1.42:5173", value: value, onChange: e => setValue(e.target.value), style: { width: 180 } }), _jsx("button", { onClick: save, children: "Apply" }), _jsx("button", { onClick: () => { setValue(''); localStorage.removeItem('oncealiar_lan_host'); onRefresh(); }, children: "Clear" })] }));
};
const PhaseButton = ({ phase, label }) => {
    function send() {
        socket?.emit('round:phase', phase);
    }
    return _jsx("button", { onClick: send, style: { fontSize: 12 }, children: label });
};
