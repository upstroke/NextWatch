import type { DiscoverFilters } from '@lib/schemas/discover';
import type { TmdbPagedResponse } from '@lib/schemas/tmdb';
import {
  TmdbDiscoverMovieResponseSchema,
  TmdbDiscoverTvResponseSchema,
} from '@lib/schemas/tmdb-discover';
import type { TmdbHttpClient } from './http';
import { TmdbError } from './errors';
import { buildDiscoverParams, type DiscoverMediaType } from './discover-params';
import { mapMovieDiscoverResponse, mapTvDiscoverResponse } from './discover-mappers';

async function discover(
  http: TmdbHttpClient,
  endpoint: string,
  mediaType: DiscoverMediaType,
  filters: DiscoverFilters,
  parseResponse: (raw: unknown) => unknown,
  mapResponse: (response: never) => TmdbPagedResponse,
): Promise<TmdbPagedResponse> {
  const raw = await http.get(endpoint, buildDiscoverParams(mediaType, filters));

  try {
    return mapResponse(parseResponse(raw) as never);
  } catch {
    throw new TmdbError('INVALID_RESPONSE');
  }
}

export function createDiscoverService(http: TmdbHttpClient) {
  return {
    discoverMovies(filters: DiscoverFilters): Promise<TmdbPagedResponse> {
      return discover(
        http,
        '/discover/movie',
        'movie',
        filters,
        TmdbDiscoverMovieResponseSchema.parse,
        mapMovieDiscoverResponse,
      );
    },

    discoverTv(filters: DiscoverFilters): Promise<TmdbPagedResponse> {
      return discover(
        http,
        '/discover/tv',
        'tv',
        filters,
        TmdbDiscoverTvResponseSchema.parse,
        mapTvDiscoverResponse,
      );
    },
  };
}
