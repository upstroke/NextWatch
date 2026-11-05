import type { TmdbPagedResponse } from '../../../../src/lib/schemas/tmdb';
import { DiscoverFiltersSchema } from '../../../../src/lib/schemas/discover';
import { createTmdbHttpClient } from '../../../services/tmdb/http';
import { createDiscoverService } from '../../../services/tmdb/discover';
import { TmdbError, sendTmdbError } from '../../../services/tmdb/errors';

export default defineEventHandler(
  async (event): Promise<TmdbPagedResponse | { statusCode: number; statusMessage: string }> => {
    setResponseHeader(event, 'Cache-Control', 'no-store');

    const filters = DiscoverFiltersSchema.safeParse(getQuery(event));
    if (!filters.success) {
      return sendTmdbError(event, new TmdbError('INVALID_FILTER'));
    }

    const config = useRuntimeConfig(event);
    const http = createTmdbHttpClient(config.tmdb, (url, options): Promise<unknown> =>
      $fetch<unknown>(url, { ...options, redirect: 'error' }),
    );

    try {
      return await createDiscoverService(http).discoverTv(filters.data);
    } catch (error) {
      return sendTmdbError(event, error);
    }
  },
);
