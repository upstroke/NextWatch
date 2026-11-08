import type { TmdbPagedResponse } from 'src/lib/schemas/tmdb';
import { createTmdbHttpClient } from 'docs/work/server/services/tmdb/http';
import { createTrendingService } from 'docs/work/server/services/tmdb/trending';
import { toTmdbHttpError } from 'docs/work/server/services/tmdb/errors';
import { getTmdbConfig } from 'docs/work/server/utils/tmdb';

/** Handles a request for weekly trending media. */
export default defineEventHandler(async (event): Promise<TmdbPagedResponse> => {
  setResponseHeader(event, 'Cache-Control', 'no-store');
  const config = getTmdbConfig(event);
  const http = createTmdbHttpClient(config, (url, options): Promise<unknown> =>
    $fetch<unknown>(url, { ...options, redirect: 'error' }),
  );

  try {
    return await createTrendingService(http).getWeeklyTrending();
  } catch (error) {
    throw createError(toTmdbHttpError(error));
  }
});
