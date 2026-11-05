import type { TmdbPagedResponse } from '../../../../src/lib/schemas/tmdb';
import { DiscoverFiltersSchema } from '../../../../src/lib/schemas/discover';
import { DiscoverQuerySchema } from '../../../../src/lib/schemas/discover-query';
import { createTmdbHttpClient } from '../../../services/tmdb/http';
import { createDiscoverService } from '../../../services/tmdb/discover';
import { TmdbError, sendTmdbError } from '../../../services/tmdb/errors';

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

    const config = useRuntimeConfig(event);
    const http = createTmdbHttpClient(config.tmdb, (url, options): Promise<unknown> =>
      $fetch<unknown>(url, { ...options, redirect: 'error' }),
    );

    try {
      return await createDiscoverService(http).discoverMovies(filters.data);
    } catch (error) {
      return sendTmdbError(event, error);
    }
  },
);
