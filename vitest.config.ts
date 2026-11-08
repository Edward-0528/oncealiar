import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  test: {
    globals: true,
    environmentMatchGlobs: [
      ['**/*.test.ts', 'node'],
      ['**/*.test.tsx', 'jsdom']
    ],
    setupFiles: ['./test-setup.ts'],
    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    coverage: {
      reporter: ['text', 'html'],
    }
  },
  resolve: {
    alias: {
      '@oncealiar/shared': fileURLToPath(new URL('./shared/src/index.ts', import.meta.url))
    }
  }
});
