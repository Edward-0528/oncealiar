import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp, parseOrigins } from './app.js';
import { parsePremiumCodes } from './premium.js';
import { accountsConfigFromEnv, createAccounts } from './accounts.js';
import { PACKS } from './packs/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === 'production';
const clientDist = process.env.CLIENT_DIST ?? path.resolve(here, '../../client/dist');

const accountsCfg = accountsConfigFromEnv();
const PORT = Number(process.env.PORT) || 3001;
const { httpServer, close } = createApp({
  // in-lobby bots connect back to this same process
  selfUrl: process.env.SELF_URL ?? `http://127.0.0.1:${PORT}`,
  packs: PACKS,
  accounts: accountsCfg ? createAccounts(accountsCfg) : null,
  premiumCodes: parsePremiumCodes(process.env.PREMIUM_CODES),
  clientDist: isProd ? clientDist : null,
  clientOrigins: parseOrigins(process.env.CLIENT_ORIGIN),
  coldStartMs: Number(process.env.SIMULATE_COLD_START_MS) || 0
});
if (accountsCfg) console.log(`Accounts on (Supabase)${accountsCfg.stripeSecretKey ? ', Stripe purchases on' : ', purchases off'}`);
if (process.env.CLIENT_ORIGIN) console.log(`CORS: allowing ${process.env.CLIENT_ORIGIN}`);
if (Number(process.env.SIMULATE_COLD_START_MS) > 0) console.log(`Simulating a ${process.env.SIMULATE_COLD_START_MS} ms cold start`);

httpServer.listen(PORT, () => {
  console.log(`Once a Liar server listening on :${PORT}${isProd ? ` (serving ${clientDist})` : ''}`);
});

const shutdown = () => {
  console.log('Shutting down…');
  void close().then(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
