import { defineEventHandler, getQuery, getRouterParam, setResponseHeader } from 'h3';
import type { WatchProviderAvailability } from '@lib/schemas/tmdb-watch-providers';
import { createTmdbHttpClient } from '@server/services/tmdb/http';
import { createWatchProviderService } from '@server/services/tmdb/watch-providers';
import { createTmdbError } from '@server/services/tmdb/errors';
import { sendTmdbError } from '@server/utils/tmdb-errors';
import { getTmdbConfig } from '@server/utils/tmdb';

/** Handles a request for TV series watch provider availability. */
export default defineEventHandler(
  async (
    event,
  ): Promise<WatchProviderAvailability | { statusCode: number; statusMessage: string }> => {
    setResponseHeader(event, 'Cache-Control', 'no-store');

    const id = Number(getRouterParam(event, 'id'));
    if (!Number.isInteger(id) || id <= 0) {
      return sendTmdbError(event, createTmdbError('INVALID_QUERY'));
    }

    const rawRegion = getQuery(event).region;
    if (typeof rawRegion !== 'string' || !/^[A-Za-z]{2}$/.test(rawRegion)) {
      return createError({
        statusCode: 400,
        statusMessage: 'Invalid watch provider region',
      });
    }
    const region = rawRegion.toUpperCase();

    const config = getTmdbConfig(event);
    const http = createTmdbHttpClient(config, (url, options): Promise<unknown> =>
      $fetch<unknown>(url, { ...options, redirect: 'error' }),
    );

    try {
      return await createWatchProviderService(http).getTvWatchProviders(id, region);
    } catch (error) {
      return sendTmdbError(event, error);
    }
  },
);
