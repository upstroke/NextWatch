import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: 'list',
  testDir: './tests/integration/http',
  testMatch: '**/*.api.ts',
  use: { baseURL: 'http://127.0.0.1:3101' },
  webServer: {
    command: 'pnpm exec nuxt dev --host 127.0.0.1 --port 3101',
    url: 'http://127.0.0.1:3101/',
    ignoreHTTPSErrors: false,
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      NUXT_IGNORE_LOCK: '1',
      NUXT_TMDB_API_READ_ACCESS_TOKEN: ' ',
      NUXT_TMDB_BASE_URL: 'https://api.themoviedb.org/3',
      NUXT_TELEMETRY_DISABLED: '1',
    },
  },
});
