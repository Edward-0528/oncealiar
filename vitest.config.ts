import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environmentMatchGlobs: [
      ['**/*.test.ts', 'node'],
      ['**/*.test.tsx', 'jsdom']
    ],
    setupFiles: ['./test-setup.ts'],
    include: ['**/*.test.ts', '**/*.test.tsx'],
    coverage: {
      reporter: ['text', 'html'],
    }
  },
  resolve: {
    alias: {
      '@oncealiar/shared': './shared/src/index.ts'
    }
  }
});
