import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['apps/**/tests/**/*.test.{ts,tsx}', 'packages/**/tests/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['apps/*/src/**', 'packages/*/src/**'],
      exclude: ['**/*.d.ts', '**/node_modules/**'],
    },
  },
  resolve: {
    alias: {
      '@vetsphere/shared': path.resolve(__dirname, 'packages/shared/src'),
      // Per-app aliases — vitest uses the alias matching the test file's location
      '@': path.resolve(__dirname, 'apps/admin/src'),
    },
  },
});
