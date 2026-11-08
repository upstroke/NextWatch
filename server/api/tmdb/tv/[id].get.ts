import { defineEventHandler, getRouterParam, setResponseHeader } from 'h3';
import type { TmdbTvDetail } from 'src/lib/schemas/tmdb-detail';
import { createTmdbHttpClient } from 'server/services/tmdb/http';
import { createTmdbDetailService } from 'server/services/tmdb/detail';
import { createTmdbError } from 'server/services/tmdb/errors';
import { sendTmdbError } from 'server/utils/tmdb-errors';
import { getTmdbConfig } from 'server/utils/tmdb';

/** Handles a request for TV series details. */
export default defineEventHandler(
  async (event): Promise<TmdbTvDetail | { statusCode: number; statusMessage: string }> => {
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
      return await createTmdbDetailService(http).getTvDetail(id);
    } catch (error) {
      return sendTmdbError(event, error);
    }
  },
);
