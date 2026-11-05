import type { TmdbPagedResponse } from '@lib/schemas/tmdb';
import { createTmdbHttpClient } from '@server/services/tmdb/http';
import { createTrendingService } from '@server/services/tmdb/trending';
import { toTmdbHttpError } from '@server/services/tmdb/errors';

export default defineEventHandler(async (event): Promise<TmdbPagedResponse> => {
  setResponseHeader(event, 'Cache-Control', 'no-store');
  const config = useRuntimeConfig(event);
  const http = createTmdbHttpClient(config.tmdb, (url, options): Promise<unknown> =>
    $fetch<unknown>(url, { ...options, redirect: 'error' }),
  );

  try {
    return await createTrendingService(http).getWeeklyTrending();
  } catch (error) {
    throw createError(toTmdbHttpError(error));
  }
});
