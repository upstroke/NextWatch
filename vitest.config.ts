import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.spec.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/lib/**/*.ts', 'server/services/**/*.ts', 'server/utils/**/*.ts'],
      exclude: ['src/lib/schemas/index.ts'],
      reporter: ['text', 'html', 'lcov']
    }
  }
});
