import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
let socket = null;
export const App = () => {
    const [connected, setConnected] = useState(false);
    const [game, setGame] = useState(null);
    const [you, setYou] = useState(null);
    const [round, setRound] = useState(null);
    const [name, setName] = useState('');
    const [avatar, setAvatar] = useState('😀');
    useEffect(() => {
        socket = io({ autoConnect: true });
        socket.on('connect', () => setConnected(true));
        socket.on('game:update', (state, youId) => {
            setGame(structuredClone(state));
            setYou(youId);
        });
        socket.on('round', r => setRound(r));
        socket.on('error', msg => alert(msg));
        return () => { socket?.disconnect(); };
    }, []);
    function join() {
        if (!socket)
            return;
        socket.emit('player', name || 'Player', avatar);
    }
    function start() {
        socket?.emit('start');
    }
    function vote(pid) {
        socket?.emit('vote', pid);
    }
    const isHost = you && game?.hostId === you;
    return (_jsxs("div", { style: { fontFamily: 'system-ui, sans-serif', padding: 16 }, children: [_jsx("h1", { children: "Once A Liar" }), !game && (_jsxs("div", { children: [_jsx("input", { placeholder: "Name", value: name, onChange: e => setName(e.target.value) }), ' ', _jsx("input", { placeholder: "Avatar", value: avatar, onChange: e => setAvatar(e.target.value) }), ' ', _jsx("button", { onClick: join, disabled: !connected, children: "Join" })] })), game && (_jsxs("div", { style: { display: 'flex', gap: 24 }, children: [_jsxs("div", { children: [_jsxs("h2", { children: ["Players (", Object.keys(game.players).length, ")"] }), _jsx("ul", { children: game && Object.values(game.players).map(pRaw => {
                                    const p = pRaw;
                                    return (_jsxs("li", { children: [p.avatar, " ", p.name, " ", p.id === you && '(You)', " ", p.vote && '🔍', round?.phase === 'voting' && p.id !== you && (_jsx("button", { onClick: () => vote(p.id), children: "Vote" }))] }, p.id));
                                }) }), isHost && game.round.phase === 'lobby' && (_jsx("button", { onClick: start, children: "Start Round" }))] }), _jsxs("div", { children: [_jsx("h2", { children: "Round" }), round && (_jsxs("div", { children: [_jsxs("p", { children: ["Phase: ", round.phase] }), !round.youAreSpy && round.secretWord && _jsxs("p", { children: ["Secret Word: ", _jsx("strong", { children: round.secretWord })] }), round.youAreSpy && _jsx("p", { children: "You are the SPY! Blend in." })] }))] })] }))] }));
};
