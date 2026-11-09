import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Ack, GameSettings, JoinResult, PlayerID, PlayerProfile, PrivateView, PublicGameState } from '@oncealiar/shared';
import type { ConnStatus, Transport } from '../lib/transport';
import { bumpStat, clearSession, forgetRoom, getFlag, loadSession, rememberRoom, saveSession, setFlag } from '../lib/storage';
import { codename, dedupeName, freeAvatarFallback, loadProfile, profileForRoom, randomProfile, saveProfile } from '../lib/profile';
import { roomFromLocation } from '../lib/roomCode';
import { isMuted, onMutedChange, setMuted, sfx } from '../lib/sound';

export type ToastTone = 'info' | 'success' | 'error';
export interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}
export interface FloatingReaction {
  id: number;
  emoji: string;
  playerId: PlayerID;
  left: number; // %
  drift: number; // px
}

type AckResult<T> = ({ ok: true } & T) | { ok: false; error: string };

export interface GameStore {
  transport: Transport;
  conn: ConnStatus;
  game: PublicGameState | null;
  you: PrivateView | null;
  /** serverNow - clientNow, ms */
  skew: number;
  serverNow: () => number;
  toasts: Toast[];
  reactions: FloatingReaction[];
  profile: PlayerProfile;
  setProfile: (p: PlayerProfile) => void;
  muted: boolean;
  toggleMute: () => void;
  toast: (message: string, tone?: ToastTone) => void;
  dismissToast: (id: number) => void;
  busy: boolean;
  /** a stored session is being resumed (show a quiet splash, not Home) */
  restoring: boolean;
  /** room code currently being joined from an invite link / code entry */
  joining: string | null;
  /** the current look was generated for you (zero-typing join): offer "tap to change your look" */
  autoProfile: boolean;
  actions: {
    create: (profile: PlayerProfile) => Promise<boolean>;
    join: (code: string, profile: PlayerProfile) => Promise<boolean>;
    /** one tap: host with your saved look, or a generated codename on first visit */
    host: () => Promise<boolean>;
    /** zero typing: join with your saved look (name de-duplicated) or a generated one */
    joinCode: (code: string) => Promise<boolean>;
    /** resume a remembered seat (recent rooms / "Rejoin your game") */
    rejoin: (code: string, token: string) => Promise<boolean>;
    leave: () => void;
    updateProfile: (p: PlayerProfile) => void;
    updateSettings: (patch: Partial<GameSettings>) => void;
    kick: (id: PlayerID) => void;
    start: () => void;
    ready: () => void;
    /** briefing tutorial: "I'm ready" (sets your Player.ready; the game starts once everyone is) */
    briefingReady: () => void;
    submitClue: (text: string) => void;
    clueDone: () => void;
    skip: () => void;
    vote: (id: PlayerID) => void;
    guess: (word: string) => void;
    next: () => void;
    restart: () => void;
    react: (emoji: string) => void;
    unlock: (code: string) => Promise<boolean>;
  };
}

const Ctx = createContext<GameStore | null>(null);

/** like useGame, but returns null outside a provider (for reusable components) */
export function useGameOptional(): GameStore | null {
  return useContext(Ctx);
}

export function useGame(): GameStore {
  const v = useContext(Ctx);
  if (!v) throw new Error('useGame must be used inside <GameProvider>');
  return v;
}

const ACK_TIMEOUT = 8000;
/** stop showing the "getting you back in" splash after this even if the server is unreachable */
const RESTORE_SPLASH_MAX_MS = 6000;

/** Keep the address bar on the short room URL (`/ABCD`) so a reload or share lands in the same room. */
function setUrlRoom(code: string | null) {
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete('room');
    url.pathname = code ? `/${code}` : '/';
    if (url.href !== window.location.href) window.history.replaceState(null, '', url.toString());
  } catch {
    /* ignore */
  }
}

let nextId = 1;

export function GameProvider({ transport, children }: { transport: Transport; children: React.ReactNode }) {
  const live = transport.kind === 'live';
  const [conn, setConn] = useState<ConnStatus>(transport.status());
  const [game, setGame] = useState<PublicGameState | null>(null);
  const [you, setYou] = useState<PrivateView | null>(null);
  const [skew, setSkew] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const [profile, setProfileState] = useState<PlayerProfile>(loadProfile);
  const [muted, setMutedState] = useState(isMuted());
  const [busy, setBusy] = useState(false);
  const [restoring, setRestoring] = useState(() => live && !!transport.willRejoin?.());
  const [autoProfile, setAutoProfile] = useState(() => getFlag('autoProfile'));
  // invite link (?room=ABCD or /ABCD) we should join on load, unless it's the room we're already in
  const linkRoom = useRef<string | null>(null);
  const [joining, setJoining] = useState<string | null>(() => {
    if (!live) return null;
    const { code, tv } = roomFromLocation();
    if (!code || tv || loadSession()?.code === code) return null;
    linkRoom.current = code;
    return code;
  });

  const gameRef = useRef(game);
  const youRef = useRef(you);
  const profileRef = useRef(profile);
  gameRef.current = game;
  youRef.current = you;
  profileRef.current = profile;
  const lastReactAt = useRef(0);
  const lastRemember = useRef({ code: '', at: 0 });
  const renamed = useRef(new Set<string>());

  useEffect(() => onMutedChange(setMutedState), []);

  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const toast = useCallback(
    (message: string, tone: ToastTone = 'info') => {
      const id = nextId++;
      setToasts((t) => [...t.slice(-2), { id, message, tone }]);
      sfx.toast();
      setTimeout(() => dismissToast(id), 3600);
    },
    [dismissToast]
  );

  const addReaction = useCallback((emoji: string, playerId: PlayerID) => {
    const id = nextId++;
    const r: FloatingReaction = { id, emoji, playerId, left: 8 + Math.random() * 84, drift: (Math.random() - 0.5) * 80 };
    setReactions((list) => [...list.slice(-24), r]);
    setTimeout(() => setReactions((list) => list.filter((x) => x.id !== id)), 2800);
  }, []);

  const resetLocal = useCallback(() => {
    clearSession();
    setGame(null);
    setYou(null);
    if (live) setUrlRoom(null);
  }, [live]);

  // ---- transport events ----
  useEffect(() => {
    return transport.subscribe((e) => {
      switch (e.type) {
        case 'conn':
          setConn(e.status);
          if (e.status === 'connected') setRestoring(false);
          break;
        case 'state': {
          setGame(e.state);
          setYou(e.you);
          setSkew(e.state.round.serverNow - Date.now());
          setRestoring(false);
          if (!live) break;
          const now = Date.now();
          saveSession({ code: e.state.code, token: e.you.token, at: now });
          setUrlRoom(e.state.code);
          const last = lastRemember.current;
          if (last.code !== e.state.code || now - last.at > 30_000) {
            lastRemember.current = { code: e.state.code, at: now };
            const me = e.state.players.find((p) => p.id === e.you.playerId);
            rememberRoom({ code: e.state.code, token: e.you.token, at: now, name: me?.name });
          }
          break;
        }
        case 'reaction':
          if (e.reaction.playerId !== youRef.current?.playerId) addReaction(e.reaction.emoji, e.reaction.playerId);
          break;
        case 'toast':
          toast(e.message);
          break;
        case 'kicked':
          if (gameRef.current) forgetRoom(gameRef.current.code);
          resetLocal();
          toast('The host removed you from the room', 'error');
          break;
        case 'session-invalid': {
          const hadGame = !!gameRef.current;
          forgetRoom(e.code);
          resetLocal();
          setRestoring(false);
          toast(hadGame ? 'That game has ended' : `Your last game (${e.code}) has ended`, hadGame ? 'error' : 'info');
          break;
        }
        case 'rejoined':
          // the reconnect pill (Overlays) owns the "Back in the game!" toast
          break;
      }
    });
  }, [transport, live, toast, addReaction, resetLocal]);

  // never leave someone staring at a splash if the server is unreachable
  useEffect(() => {
    if (!restoring) return;
    const t = setTimeout(() => setRestoring(false), RESTORE_SPLASH_MAX_MS);
    return () => clearTimeout(t);
  }, [restoring]);

  const withAck = useCallback(
    <T,>(fire: (ack: Ack<T>) => void): Promise<AckResult<T>> =>
      new Promise((resolve) => {
        let done = false;
        const timer = setTimeout(() => {
          if (done) return;
          done = true;
          resolve({ ok: false, error: "Couldn't reach the game server. Check your connection and try again." });
        }, ACK_TIMEOUT);
        fire((res) => {
          if (done) return;
          done = true;
          clearTimeout(timer);
          resolve(res);
        });
      }),
    []
  );

  const setProfile = useCallback((p: PlayerProfile) => {
    setProfileState(p);
    profileRef.current = p;
    saveProfile(p);
    if (p.name.trim()) {
      setAutoProfile(false);
      setFlag('autoProfile', false);
    }
  }, []);

  /** persist a generated look and remember that it was generated */
  const adoptGenerated = useCallback((p: PlayerProfile) => {
    setProfileState(p);
    profileRef.current = p;
    saveProfile(p);
    setAutoProfile(true);
    setFlag('autoProfile', true);
  }, []);

  const actions = useMemo<GameStore['actions']>(() => {
    const enter = async (fire: (ack: Ack<JoinResult>) => void) => {
      setBusy(true);
      const res = await withAck<JoinResult>(fire);
      setBusy(false);
      if (!res.ok) {
        toast(res.error, 'error');
        return false;
      }
      saveSession({ code: res.code, token: res.token });
      return true;
    };
    const t = transport;
    const create = (p: PlayerProfile) => enter((ack) => t.emit('room:create', p, ack));
    const join = (code: string, p: PlayerProfile) => enter((ack) => t.emit('room:join', code.toUpperCase(), p, ack));
    return {
      create,
      join,
      host: async () => {
        // new rooms are never premium: premium characters fall back to a free one for now
        let p = freeAvatarFallback(profileRef.current);
        if (!p.name.trim()) {
          const base = randomProfile();
          p = { ...base, name: codename(base.avatar) };
          adoptGenerated(p);
        }
        const ok = await create({ ...p, name: p.name.trim() });
        if (ok) bumpStat('hosted');
        return ok;
      },
      joinCode: async (rawCode) => {
        const code = rawCode.toUpperCase();
        setJoining(code);
        setBusy(true);
        try {
          const room = t.peek ? await t.peek(code) : undefined;
          const players = room?.players ?? [];
          const { profile: p, generated } = profileForRoom(profileRef.current, {
            names: players.map((x) => x.name),
            avatars: players.map((x) => x.avatar),
            colors: players.map((x) => x.color)
          }, Math.random, !!room?.premium);
          if (generated) adoptGenerated(p);
          const ok = await join(code, p);
          if (ok) bumpStat('joined');
          else if (live) setUrlRoom(null);
          return ok;
        } finally {
          setBusy(false);
          setJoining(null);
        }
      },
      rejoin: async (code, token) => {
        const ok = await enter((ack) => t.emit('room:rejoin', code, token, ack));
        if (!ok) forgetRoom(code);
        return ok;
      },
      leave: () => {
        if (gameRef.current) forgetRoom(gameRef.current.code);
        t.emit('room:leave');
        resetLocal();
      },
      updateProfile: (p) => t.emit('profile:update', p),
      updateSettings: (patch) =>
        t.emit('settings:update', patch, (res) => {
          if (!res.ok) toast(res.error, 'error');
        }),
      kick: (id) => t.emit('player:kick', id),
      start: () =>
        t.emit('game:start', (res) => {
          if (!res.ok) toast(res.error, 'error');
        }),
      ready: () => t.emit('role:ready'),
      briefingReady: () => t.emit('briefing:ready'),
      submitClue: (text) => t.emit('clue:submit', text),
      clueDone: () => t.emit('clue:done'),
      skip: () => t.emit('phase:skip'),
      vote: (id) => t.emit('vote:cast', id),
      guess: (word) => t.emit('guess:submit', word),
      next: () => t.emit('round:next'),
      restart: () => t.emit('game:restart'),
      unlock: async (code) => {
        const res = await withAck<{}>((ack) => t.emit('room:unlock', code.trim(), ack));
        if (!res.ok) toast(res.error, 'error');
        else toast('Premium unlocked for this room!', 'success');
        return res.ok;
      },
      react: (emoji) => {
        const now = Date.now();
        if (now - lastReactAt.current < 350) return;
        lastReactAt.current = now;
        t.emit('reaction', emoji);
        if (youRef.current) addReaction(emoji, youRef.current.playerId);
      }
    };
  }, [transport, live, withAck, toast, resetLocal, addReaction, adoptGenerated]);

  // ---- zero-typing invite: join the linked room as soon as we're connected ----
  useEffect(() => {
    const code = linkRoom.current;
    if (!code || conn !== 'connected') return;
    linkRoom.current = null;
    void actions.joinCode(code);
  }, [conn, actions]);

  // ---- name collision safety net (two people joined as "Sam" at the same moment) ----
  useEffect(() => {
    if (!game || !you || game.round.phase !== 'lobby') return;
    const idx = game.players.findIndex((p) => p.id === you.playerId);
    if (idx < 0) return;
    const me = game.players[idx];
    const key = `${game.code}:${me.name.toLowerCase()}`;
    const clash = game.players.slice(0, idx).some((p) => p.name.trim().toLowerCase() === me.name.trim().toLowerCase());
    if (!clash || renamed.current.has(key)) return;
    renamed.current.add(key);
    const name = dedupeName(
      me.name,
      game.players.filter((p) => p.id !== me.id).map((p) => p.name)
    );
    transport.emit('profile:update', { name, avatar: me.avatar, color: me.color });
  }, [game, you, transport]);

  const value = useMemo<GameStore>(
    () => ({
      transport,
      conn,
      game,
      you,
      skew,
      serverNow: () => Date.now() + skew,
      toasts,
      reactions,
      profile,
      setProfile,
      muted,
      toggleMute: () => setMuted(!isMuted()),
      toast,
      dismissToast,
      busy,
      restoring,
      joining,
      autoProfile,
      actions
    }),
    [transport, conn, game, you, skew, toasts, reactions, profile, setProfile, muted, toast, dismissToast, busy, restoring, joining, autoProfile, actions]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Convenience selectors */
export function usePlayers() {
  const { game, you } = useGame();
  const players = game?.players ?? [];
  const me = players.find((p) => p.id === you?.playerId) ?? null;
  const byId = (id: PlayerID | null | undefined) => players.find((p) => p.id === id) ?? null;
  return { players, me, isHost: !!me?.isHost, byId };
}

/** Topic for *this* player: PrivateView.topic wins (liarSeesTopic=false hides round.topic). */
export function useTopic() {
  const { game, you } = useGame();
  return you?.topic ?? game?.round.topic ?? null;
}
