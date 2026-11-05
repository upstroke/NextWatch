/** Compatibility facade for existing callers. New code imports services directly. */
import { createTmdbHttpClient } from '@server/services/tmdb/http';
import type { TmdbConfig, TmdbRequest } from '@server/services/tmdb/http';
import { createTrendingService } from '@server/services/tmdb/trending';

export type { TmdbRequest } from '@server/services/tmdb/http';
export { TmdbError as TmdbSpikeError } from '@server/services/tmdb/errors';

export async function fetchWeeklyTrending(config: TmdbConfig, request: TmdbRequest) {
  return createTrendingService(createTmdbHttpClient(config, request)).getWeeklyTrending();
}
