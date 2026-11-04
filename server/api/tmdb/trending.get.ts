import type { TmdbPagedResponse } from '../../../src/lib/schemas/tmdb';
import { createTmdbHttpClient } from '../../services/tmdb/http';
import { createTrendingService } from '../../services/tmdb/trending';
import { toTmdbHttpError } from '../../services/tmdb/errors';

export default defineEventHandler(async (event): Promise<TmdbPagedResponse> => {
  setResponseHeader(event, 'Cache-Control', 'no-store');
  const config = useRuntimeConfig(event);
  const http = createTmdbHttpClient(config.tmdb, (url, options): Promise<unknown> =>
    $fetch<unknown>(url, { ...options, redirect: 'error' })
  );

  try {
    return await createTrendingService(http).getWeeklyTrending();
  } catch (error) {
    throw createError(toTmdbHttpError(error));
  }
});
