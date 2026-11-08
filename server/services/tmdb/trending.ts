import { TmdbTrendingResponseSchema } from '@lib/schemas/tmdb-trending';
import type { TmdbPagedResponse } from '@lib/schemas/tmdb';
import type { TmdbHttpClient } from './http';
import { createTmdbError } from './errors';
import { mapTrendingResponse } from './mappers';

export function createTrendingService(http: TmdbHttpClient) {
  return {
    async getWeeklyTrending(): Promise<TmdbPagedResponse> {
      const raw = await http.getWeeklyTrending();
      try {
        return mapTrendingResponse(TmdbTrendingResponseSchema.parse(raw));
      } catch {
        throw createTmdbError('INVALID_RESPONSE');
      }
    },
  };
}
