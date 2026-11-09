/**
 * Bot players for solo testing.
 *
 *   npm run bots -- ABCD 5          # join 5 bots to room ABCD
 *   BOTS_URL=http://host:3001 npm run bots -- ABCD 3
 *   BOTS_AWAY=1 npm run bots -- ABCD 5   # bots sometimes "answer a text" (tab hidden 5–25s)
 *
 * The host can also add bots from the lobby ("Add a bot"); both use botBrain.ts.
 */
import { spawnBot } from './botBrain.js';

const [codeArg, countArg] = process.argv.slice(2);
const code = (codeArg ?? '').toUpperCase();
const count = Math.max(1, Math.min(19, Number(countArg) || 3));
const url = process.env.BOTS_URL ?? `http://localhost:${process.env.PORT ?? 3001}`;

if (!/^[A-Z]{4}$/.test(code)) {
  console.error('Usage: npm run bots -- <ROOM_CODE> [count]');
  process.exit(1);
}

const bots = Array.from({ length: count }, (_, i) =>
  spawnBot({ url, code, index: i, flaky: process.env.BOTS_AWAY === '1', log: (m) => console.log(m) })
);
console.log(`Spawning ${count} bot(s) into ${code} at ${url} — Ctrl+C to stop`);
process.on('SIGINT', () => {
  for (const b of bots) b.close();
  process.exit(0);
});
