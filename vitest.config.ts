import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@lib': fileURLToPath(new URL('./src/lib', import.meta.url)),
      '@server': fileURLToPath(new URL('./server', import.meta.url)),
      '@tests': fileURLToPath(new URL('./tests', import.meta.url)),
      '@test-mocks': fileURLToPath(new URL('./tests/mocks', import.meta.url)),
      '@test-fixtures': fileURLToPath(new URL('./tests/fixtures', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/lib/**', 'server/**'],
      exclude: ['server/tsconfig.json', '**/*.d.ts', '**/*.config.*', '**/node_modules/**'],
      thresholds: {
        global: {
          statements: 80,
        },
      },
    },
  },
});
