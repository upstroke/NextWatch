import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.spec.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: [
        'src/lib/schemas/**/*.ts',
        'src/lib/domain/**/*.ts',
        'server/services/**/*.ts',
        'server/utils/**/*.ts'
      ],
      exclude: ['src/lib/schemas/index.ts', '**/*.d.ts'],
      thresholds: {
        statements: 80
      },
      reporter: ['text', 'html', 'lcov']
    }
  }
});
