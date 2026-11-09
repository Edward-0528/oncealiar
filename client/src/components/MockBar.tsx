import React from 'react';
import { useGame } from '../state/GameProvider';
import './MockBar.css';

const PHASES = ['home', 'profile', 'lobby', 'briefing', 'role-reveal', 'clues', 'discussion', 'voting', 'liar-guess', 'results', 'game-over'];

/** Dev-only controls shown in ?mock= mode. Changes reload with new params. */
export function MockBar() {
  const { transport } = useGame();
  const m = transport.mock;
  if (!m) return null;
  const set = (k: string, v: string) => {
    const p = new URLSearchParams(window.location.search);
    p.set(k, v);
    window.location.search = p.toString();
  };
  const val = (k: string, d: string) => m.params.get(k) ?? d;
  return (
    <details className="mockbar">
      <summary>MOCK · {m.phase}</summary>
      <div className="mockbar__body">
        <label>
          Phase
          <select value={m.phase} onChange={(e) => set('mock', e.target.value)}>
            {PHASES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
        <label>
          Role
          <select value={val('role', 'truth')} onChange={(e) => set('role', e.target.value)}>
            <option value="truth">agent</option>
            <option value="liar">spy</option>
          </select>
        </label>
        <label>
          Host
          <select value={val('host', '1')} onChange={(e) => set('host', e.target.value)}>
            <option value="1">yes</option>
            <option value="0">no</option>
          </select>
        </label>
        <label>
          Clues
          <select value={val('clue', 'spoken')} onChange={(e) => set('clue', e.target.value)}>
            <option>spoken</option>
            <option>typed</option>
          </select>
        </label>
        <label>
          Players
          <select value={val('n', '6')} onChange={(e) => set('n', e.target.value)}>
            {[3, 4, 5, 6, 8, 10, 12].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        <label>
          Spy sees topic
          <select value={val('topic', '1')} onChange={(e) => set('topic', e.target.value)}>
            <option value="1">yes</option>
            <option value="0">no</option>
          </select>
        </label>
      </div>
    </details>
  );
}
