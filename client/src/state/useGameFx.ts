import { useEffect, useRef } from 'react';
import type { Phase, PrivateView, PublicGameState } from '@oncealiar/shared';
import { useGame } from './GameProvider';
import { usePageVisible } from './hooks';
import { sfx } from '../lib/sound';
import { haptic } from '../lib/haptics';
import { clearNotifications, flagTitle, notify, restoreTitle } from '../lib/attention';

export interface Attention {
  /** unique per moment, so each turn/vote is announced once */
  key: string;
  kind: 'turn' | 'vote' | 'guess';
  title: string;
  body: string;
}

/** The moment that needs *this* player, if any. */
export function attentionFor(game: PublicGameState | null, you: PrivateView | null): Attention | null {
  if (!game || !you) return null;
  const r = game.round;
  if (r.phase === 'clues' && r.turnOrder[r.currentTurn] === you.playerId)
    return { key: `${r.number}-clues-${r.currentTurn}`, kind: 'turn', title: '🔴 Your turn!', body: 'Give your clue — everyone is waiting on you.' };
  if (r.phase === 'voting' && game.players.some((p) => p.id === you.playerId && !p.hasVoted))
    return { key: `${r.number}-voting`, kind: 'vote', title: '🗳️ Vote now!', body: 'Voting has started. Who is the liar?' };
  if (r.phase === 'liar-guess' && you.role === 'liar')
    return { key: `${r.number}-guess`, kind: 'guess', title: '🎯 Guess the word!', body: 'You were caught — one guess to steal the win.' };
  return null;
}

/** Phase-change stingers + "it's your turn" cues that still land if you were in another app. */
export function useGameFx() {
  const { game, you } = useGame();
  const phase = game?.round.phase;
  const prev = useRef<Phase | undefined>(undefined);
  useEffect(() => {
    if (!phase || phase === prev.current) return;
    const was = prev.current;
    prev.current = phase;
    if (!was) return; // first state after (re)join: stay quiet
    if (phase === 'role-reveal') sfx.whoosh();
    if (phase === 'clues') sfx.pop();
    if (phase === 'discussion') sfx.whoosh();
    if (phase === 'voting') sfx.vote();
    if (phase === 'liar-guess') sfx.liar();
    if (phase === 'lobby') sfx.join();
  }, [phase]);

  useAttentionCues(attentionFor(game, you));
}

function useAttentionCues(attention: Attention | null) {
  const visible = usePageVisible();
  const announced = useRef<string | null>(null);
  const pending = useRef<Attention | null>(null);
  const current = useRef<Attention | null>(attention);
  current.current = attention;
  const key = attention?.key ?? null;

  useEffect(() => {
    const a = current.current;
    if (!a) {
      pending.current = null;
      restoreTitle();
      return;
    }
    if (announced.current === a.key) return;
    announced.current = a.key;
    if (document.visibilityState === 'hidden') {
      // vibration/audio don't play in the background: flag the tab, notify, and replay on return
      pending.current = a;
      flagTitle(a.title);
      void notify(a.title, a.body);
    } else if (a.kind !== 'turn') {
      // (the Clues screen already buzzes for your turn)
      haptic('heartbeat');
    }
  }, [key]);

  useEffect(() => {
    if (!visible) return;
    restoreTitle();
    void clearNotifications();
    const p = pending.current;
    pending.current = null;
    const a = current.current;
    if (p && a && p.key === a.key) {
      haptic('heartbeat');
      if (a.kind === 'turn') sfx.yourTurn();
      else sfx.vote();
    }
  }, [visible]);
}
