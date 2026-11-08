import type { TmdbPagedResponse } from 'src/lib/schemas/tmdb';
import { DiscoverFiltersSchema } from 'src/lib/schemas/discover';
import { DiscoverQuerySchema } from 'src/lib/schemas/discover-query';
import { createTmdbHttpClient } from 'server/services/tmdb/http';
import { createDiscoverService } from 'server/services/tmdb/discover';
import { createTmdbError } from 'server/services/tmdb/errors';
import { sendTmdbError } from 'server/utils/tmdb-errors';
import { getTmdbConfig } from 'server/utils/tmdb';

/** Handles a request for TV Discover results. */
export default defineEventHandler(
  async (event): Promise<TmdbPagedResponse | { statusCode: number; statusMessage: string }> => {
    setResponseHeader(event, 'Cache-Control', 'no-store');

    const query = DiscoverQuerySchema.safeParse(getQuery(event));
    if (!query.success) {
      return sendTmdbError(event, createTmdbError('INVALID_QUERY'));
    }

    const filters = DiscoverFiltersSchema.safeParse(query.data);
    if (!filters.success) {
      return sendTmdbError(event, createTmdbError('INVALID_FILTER'));
    }

    const config = getTmdbConfig(event);
    const http = createTmdbHttpClient(config, (url, options): Promise<unknown> =>
      $fetch<unknown>(url, { ...options, redirect: 'error' }),
    );

    try {
      return await createDiscoverService(http).discoverTv(filters.data);
    } catch (error) {
      return sendTmdbError(event, error);
    }
  },
);
