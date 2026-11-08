import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { parsePremiumCodes } from './premium.js';
import { PACKS } from './packs/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === 'production';
const clientDist = process.env.CLIENT_DIST ?? path.resolve(here, '../../client/dist');

const { httpServer, close } = createApp({
  packs: PACKS,
  premiumCodes: parsePremiumCodes(process.env.PREMIUM_CODES),
  clientDist: isProd ? clientDist : null
});

const PORT = Number(process.env.PORT) || 3001;
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
