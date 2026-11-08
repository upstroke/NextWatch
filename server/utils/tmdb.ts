import type { H3Event } from 'h3';
import { TmdbRuntimeConfigSchema } from '@lib/schemas/runtime-config';
import { createTmdbHttpClient } from '@server/services/tmdb/http';
import type { TmdbConfig, TmdbRequest } from '@server/services/tmdb/http';
import { createTrendingService } from '@server/services/tmdb/trending';

export type { TmdbRequest } from '@server/services/tmdb/http';
export { createTmdbError as createTmdbSpikeError } from '@server/services/tmdb/errors';

/** Validate Nuxt runtime configuration and adapt it to the typed TMDb service configuration. */
export function getTmdbConfig(event: H3Event): TmdbConfig {
  const config = useRuntimeConfig(event);

  return TmdbRuntimeConfigSchema.parse(config.tmdb);
}

export async function fetchWeeklyTrending(config: TmdbConfig, request: TmdbRequest) {
  return createTrendingService(createTmdbHttpClient(config, request)).getWeeklyTrending();
}
