import type { H3Event } from 'h3';
import { z } from 'zod';
import { createTmdbHttpClient } from '@server/services/tmdb/http';
import type { TmdbConfig, TmdbRequest } from '@server/services/tmdb/http';
import { createTrendingService } from '@server/services/tmdb/trending';

export type { TmdbRequest } from '@server/services/tmdb/http';
export { TmdbError as TmdbSpikeError } from '@server/services/tmdb/errors';

const TmdbRuntimeConfigSchema = z.object({
  apiReadAccessToken: z.string(),
  baseUrl: z.string(),
});

/** Validate Nuxt runtime configuration and adapt it to the typed TMDb service configuration. */
export function getTmdbConfig(event: H3Event): TmdbConfig {
  const config = useRuntimeConfig(event);

  return TmdbRuntimeConfigSchema.parse(config.tmdb);
}

export async function fetchWeeklyTrending(config: TmdbConfig, request: TmdbRequest) {
  return createTrendingService(createTmdbHttpClient(config, request)).getWeeklyTrending();
}
