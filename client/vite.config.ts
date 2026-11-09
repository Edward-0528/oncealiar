import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // consume the shared contract from source (no separate build step needed)
      '@oncealiar/shared': fileURLToPath(new URL('../shared/src/index.ts', import.meta.url))
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true
      },
      // wake-up probe (see src/lib/wake.ts)
      '/healthz': 'http://localhost:3001',
      // accounts + Stripe checkout (server/src/accounts.ts)
      '/api': 'http://localhost:3001'
    }
  }
});
