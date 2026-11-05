import type { TmdbConfig } from '@server/services/tmdb/http';

declare module 'nuxt/schema' {
  interface RuntimeConfig {
    tmdb: TmdbConfig;
  }
}

export {};
