import type { DiscoverFilters } from '../../../src/lib/schemas/discover';
import type { TmdbPagedResponse } from '../../../src/lib/schemas/tmdb';
import {
  TmdbDiscoverMovieResponseSchema,
  TmdbDiscoverTvResponseSchema
} from '../../../src/lib/schemas/tmdb-discover';
import type { TmdbHttpClient } from './http';
import { TmdbError } from './errors';
import { buildDiscoverParams } from './discover-params';
import { mapMovieDiscoverResponse, mapTvDiscoverResponse } from './discover-mappers';

export function createDiscoverService(http: TmdbHttpClient) {
  return {
    async discoverMovies(filters: DiscoverFilters): Promise<TmdbPagedResponse> {
      const raw = await http.get('/discover/movie', buildDiscoverParams('movie', filters));

      try {
        return mapMovieDiscoverResponse(TmdbDiscoverMovieResponseSchema.parse(raw));
      } catch {
        throw new TmdbError('INVALID_RESPONSE');
      }
    },

    async discoverTv(filters: DiscoverFilters): Promise<TmdbPagedResponse> {
      const raw = await http.get('/discover/tv', buildDiscoverParams('tv', filters));

      try {
        return mapTvDiscoverResponse(TmdbDiscoverTvResponseSchema.parse(raw));
      } catch {
        throw new TmdbError('INVALID_RESPONSE');
      }
    }
  };
}
