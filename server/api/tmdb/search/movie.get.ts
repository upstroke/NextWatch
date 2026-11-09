import type { SearchMovieCandidate } from '@lib/schemas/tmdb-search';
import { createTmdbHttpClient } from '@server/services/tmdb/http';
import { createSearchService } from '@server/services/tmdb/search';
import { toTmdbHttpError } from '@server/services/tmdb/errors';
import { getTmdbConfig } from '@server/utils/tmdb';

/** Handles a request for Movie Search results. */
export default defineEventHandler(async (event) => {
  const query = getQuery(event).query;

  if (typeof query !== 'string' || query.trim() === '') {
    return createError({
      statusCode: 400,
      statusMessage: 'Invalid search query',
    });
  }

  setResponseHeader(event, 'Cache-Control', 'no-store');
  const config = getTmdbConfig(event);
  const http = createTmdbHttpClient(
    config,
    (url, options): Promise<unknown> =>
      $fetch<unknown>(url, { ...options, redirect: 'error' }),
  );

  try {
    return await createSearchService(http).searchMovies(query);
  } catch (error) {
    throw createError(toTmdbHttpError(error));
  }
});
