import type { TmdbPagedResponse } from '@lib/schemas/tmdb';
import { resolveTmdbContentLanguage } from '@lib/schemas/locale';
import { createTmdbHttpClient } from '@server/services/tmdb/http';
import { createTrendingService } from '@server/services/tmdb/trending';
import { toTmdbHttpError } from '@server/services/tmdb/errors';
import { getTmdbConfig } from '@server/utils/tmdb';

/** Handles a request for weekly trending media. */
export default defineEventHandler(async (event): Promise<TmdbPagedResponse> => {
  setResponseHeader(event, 'Cache-Control', 'no-store');
  const config = getTmdbConfig(event);
  const language = resolveTmdbContentLanguage(config.defaultLocale);
  const http = createTmdbHttpClient(config, (url, options): Promise<unknown> =>
    $fetch<unknown>(url, { ...options, redirect: 'error' }),
  );

  try {
    return await createTrendingService(http).getWeeklyTrending(language);
  } catch (error) {
    throw createError(toTmdbHttpError(error));
  }
});
