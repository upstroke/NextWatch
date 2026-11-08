import { TmdbTrendingResponseSchema } from '@lib/schemas/tmdb-trending';
import type { TmdbPagedResponse } from '@lib/schemas/tmdb';
import type { TmdbHttpClient } from './http';
import { createTmdbError } from './errors';
import { mapTrendingResponse } from './mappers';

/**
 * Creates a trending media service backed by the supplied TMDb HTTP client.
 *
 * @param http - The TMDb HTTP client used for upstream requests.
 * @returns The trending service.
 */
export function createTrendingService(http: TmdbHttpClient) {
  return {
    /**
     * Retrieves, validates and maps the weekly trending media.
     *
     * @returns The mapped trending media response.
     * @throws A TMDb error with code `INVALID_RESPONSE` when the response
     * cannot be validated or mapped.
     */
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
