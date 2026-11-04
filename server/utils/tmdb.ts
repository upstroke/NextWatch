/** Compatibility facade for existing callers. New code imports services directly. */
import { createTmdbHttpClient } from '../services/tmdb/http';
import type { TmdbConfig, TmdbRequest } from '../services/tmdb/http';
import { createTrendingService } from '../services/tmdb/trending';

export type { TmdbRequest } from '../services/tmdb/http';
export { TmdbError as TmdbSpikeError } from '../services/tmdb/errors';

export async function fetchWeeklyTrending(config: TmdbConfig, request: TmdbRequest) {
  return createTrendingService(createTmdbHttpClient(config, request)).getWeeklyTrending();
}
