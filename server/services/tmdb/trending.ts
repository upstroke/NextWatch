import { TmdbTrendingResponseSchema } from '../../../src/lib/schemas/tmdb-trending';
import type { TmdbPagedResponse } from '../../../src/lib/schemas/tmdb';
import type { TmdbHttpClient } from './http';
import { TmdbError } from './errors';
import { mapTrendingResponse } from './mappers';

export function createTrendingService(http: TmdbHttpClient) {
  return {
    async getWeeklyTrending(): Promise<TmdbPagedResponse> {
      const raw = await http.getWeeklyTrending();
      try {
        return mapTrendingResponse(TmdbTrendingResponseSchema.parse(raw));
      } catch {
        throw new TmdbError('INVALID_RESPONSE');
      }
    },
  };
}
