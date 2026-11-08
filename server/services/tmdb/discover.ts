import type { DiscoverFilters } from '@lib/schemas/discover';
import type { TmdbPagedResponse } from '@lib/schemas/tmdb';
import {
  TmdbDiscoverMovieResponseSchema,
  TmdbDiscoverTvResponseSchema,
} from '@lib/schemas/tmdb-discover';
import type { TmdbHttpClient } from './http';
import { createTmdbError } from './errors';
import { buildDiscoverParams } from './discover-params';
import { mapMovieDiscoverResponse, mapTvDiscoverResponse } from './discover-mappers';

async function discoverMovies(
  http: TmdbHttpClient,
  filters: DiscoverFilters,
): Promise<TmdbPagedResponse> {
  const raw = await http.get(
    '/discover/movie',
    buildDiscoverParams('movie', filters),
  );

  try {
    return mapMovieDiscoverResponse(
      TmdbDiscoverMovieResponseSchema.parse(raw),
    );
  } catch {
    throw createTmdbError('INVALID_RESPONSE');
  }
}

async function discoverTv(
  http: TmdbHttpClient,
  filters: DiscoverFilters,
): Promise<TmdbPagedResponse> {
  const raw = await http.get(
    '/discover/tv',
    buildDiscoverParams('tv', filters),
  );

  try {
    return mapTvDiscoverResponse(
      TmdbDiscoverTvResponseSchema.parse(raw),
    );
  } catch {
    throw createTmdbError('INVALID_RESPONSE');
  }
}

export function createDiscoverService(http: TmdbHttpClient) {
  return {
    discoverMovies(filters: DiscoverFilters): Promise<TmdbPagedResponse> {
      return discoverMovies(http, filters);
    },

    discoverTv(filters: DiscoverFilters): Promise<TmdbPagedResponse> {
      return discoverTv(http, filters);
    },
  };
}
