import type { H3Event } from 'h3';
import type { TmdbContentLanguage } from '@lib/schemas/locale';
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

/**
 * Retrieves the weekly trending media using the supplied TMDb configuration.
 *
 * @param config - The validated TMDb runtime configuration.
 * @param request - The HTTP request adapter used for upstream requests.
 * @param language - The validated TMDb content language.
 * @returns The mapped weekly trending media response.
 */
export async function fetchWeeklyTrending(
  config: TmdbConfig,
  request: TmdbRequest,
  language: TmdbContentLanguage,
) {
  return createTrendingService(
    createTmdbHttpClient(config, request),
  ).getWeeklyTrending(language);
}
