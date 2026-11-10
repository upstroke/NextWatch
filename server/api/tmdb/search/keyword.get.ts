import { createTmdbHttpClient } from '@server/services/tmdb/http';
import { createSearchService } from '@server/services/tmdb/search';
import { toTmdbHttpError } from '@server/services/tmdb/errors';
import { getTmdbConfig } from '@server/utils/tmdb';

/** Handles a request for Keyword Search results. */
export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store');
  const query = getQuery(event).query;

  if (typeof query !== 'string' || query.trim() === '') {
    event.node.res.statusCode = 400;

    return {
      statusCode: 400,
      statusMessage: 'Invalid search query',
      message: 'Invalid search query',
    };
  }

  const config = getTmdbConfig(event);
  const http = createTmdbHttpClient(
    config,
    (url, options): Promise<unknown> =>
      $fetch<unknown>(url, { ...options, redirect: 'error' }),
  );

  try {
    return await createSearchService(http).searchKeywords(query);
  } catch (error) {
    throw createError(toTmdbHttpError(error));
  }
});
