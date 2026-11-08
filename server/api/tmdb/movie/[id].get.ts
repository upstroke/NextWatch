import type { TmdbMovieDetail } from '@lib/schemas/tmdb-detail';
import { createTmdbHttpClient } from '@server/services/tmdb/http';
import { createTmdbDetailService } from '@server/services/tmdb/detail';
import { createTmdbError } from '@server/services/tmdb/errors';
import { sendTmdbError } from '@server/utils/tmdb-errors';
import { getTmdbConfig } from '@server/utils/tmdb';

/** Handles a request for Movie details. */
export default defineEventHandler(
  async (event): Promise<TmdbMovieDetail | { statusCode: number; statusMessage: string }> => {
    setResponseHeader(event, 'Cache-Control', 'no-store');

    const id = Number(getRouterParam(event, 'id'));
    if (!Number.isInteger(id) || id <= 0) {
      return sendTmdbError(event, createTmdbError('INVALID_QUERY'));
    }

    const config = getTmdbConfig(event);
    const http = createTmdbHttpClient(config, (url, options): Promise<unknown> =>
      $fetch<unknown>(url, { ...options, redirect: 'error' }),
    );

    try {
      return await createTmdbDetailService(http).getMovieDetail(id);
    } catch (error) {
      return sendTmdbError(event, error);
    }
  },
);
