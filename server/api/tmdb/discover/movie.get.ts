import type { TmdbPagedResponse } from '@lib/schemas/tmdb';
import { DiscoverFiltersSchema } from '@lib/schemas/discover';
import { DiscoverQuerySchema } from '@lib/schemas/discover-query';
import { createTmdbHttpClient } from '@server/services/tmdb/http';
import { createDiscoverService } from '@server/services/tmdb/discover';
import { TmdbError } from '@server/services/tmdb/errors';
import { sendTmdbError } from '@server/utils/tmdb-errors';
import { getTmdbConfig } from '@server/utils/tmdb';

export default defineEventHandler(
  async (event): Promise<TmdbPagedResponse | { statusCode: number; statusMessage: string }> => {
    setResponseHeader(event, 'Cache-Control', 'no-store');

    const query = DiscoverQuerySchema.safeParse(getQuery(event));
    if (!query.success) {
      return sendTmdbError(event, new TmdbError('INVALID_QUERY'));
    }

    const filters = DiscoverFiltersSchema.safeParse(query.data);
    if (!filters.success) {
      return sendTmdbError(event, new TmdbError('INVALID_FILTER'));
    }

    const config = getTmdbConfig(event);
    const http = createTmdbHttpClient(config, (url, options): Promise<unknown> =>
      $fetch<unknown>(url, { ...options, redirect: 'error' }),
    );

    try {
      return await createDiscoverService(http).discoverMovies(filters.data);
    } catch (error) {
      return sendTmdbError(event, error);
    }
  },
);
