import type { TmdbPagedResponse } from '../../../src/lib/schemas/tmdb';
import { fetchWeeklyTrending, TmdbSpikeError } from '../../utils/tmdb';

export default defineEventHandler(async (event): Promise<TmdbPagedResponse> => {
  setResponseHeader(event, 'Cache-Control', 'no-store');
  const config = useRuntimeConfig(event);

  try {
    return await fetchWeeklyTrending(config.tmdb, (url, options): Promise<unknown> =>
        $fetch<unknown>(url, { ...options, redirect: 'error' })
    );
  } catch (error) {
    console.error(
        '[TMDb spike]',
        error instanceof TmdbSpikeError ? error.code : 'UNEXPECTED_ERROR'
    );

    const configurationError =
        error instanceof TmdbSpikeError &&
        (error.code === 'MISSING_TOKEN' || error.code === 'INVALID_BASE_URL');

    throw createError({
      statusCode: configurationError ? 503 : 502,
      statusMessage: configurationError
          ? 'TMDb configuration unavailable'
          : 'TMDb request or response invalid'
    });
  }
});
