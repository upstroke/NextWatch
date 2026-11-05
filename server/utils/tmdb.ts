/** Compatibility facade for existing callers. New code imports services directly. */
import type { H3Event } from 'h3';
import { createTmdbHttpClient } from '@server/services/tmdb/http';
import type { TmdbConfig, TmdbRequest } from '@server/services/tmdb/http';
import { createTrendingService } from '@server/services/tmdb/trending';

export type { TmdbRequest } from '@server/services/tmdb/http';
export { TmdbError as TmdbSpikeError } from '@server/services/tmdb/errors';

/** Adapt Nuxt runtime configuration to the typed TMDb service configuration. */
export function getTmdbConfig(event: H3Event): TmdbConfig {
  const config = useRuntimeConfig(event);

  return {
    apiReadAccessToken: String(config.tmdb?.apiReadAccessToken ?? ''),
    baseUrl: String(config.tmdb?.baseUrl ?? ''),
  };
}

export async function fetchWeeklyTrending(config: TmdbConfig, request: TmdbRequest) {
  return createTrendingService(createTmdbHttpClient(config, request)).getWeeklyTrending();
}
