import type { DiscoverFilters } from '@lib/schemas/discover';
import type { TmdbContentLanguage } from '@lib/schemas/locale';
import type { TmdbPagedResponse } from '@lib/schemas/tmdb';
import {
  TmdbDiscoverMovieResponseSchema,
  TmdbDiscoverTvResponseSchema,
} from '@lib/schemas/tmdb-discover';
import type { TmdbHttpClient } from './http';
import { createTmdbError } from './errors';
import { buildDiscoverParams } from './discover-params';
import { mapMovieDiscoverResponse, mapTvDiscoverResponse } from './discover-mappers';

/**
 * Retrieves, validates and maps Movie Discover results.
 *
 * @param http - The TMDb HTTP client used for the upstream request.
 * @param filters - The Discover filters to apply.
 * @param language - The TMDb content language for localized fields.
 * @returns The mapped paged response containing movie media items.
 * @throws A TMDb error with code `INVALID_RESPONSE` when the response
 * cannot be validated or mapped.
 */
async function discoverMovies(
  http: TmdbHttpClient,
  filters: DiscoverFilters,
  language?: TmdbContentLanguage,
): Promise<TmdbPagedResponse> {
  const raw = await http.get('/discover/movie', buildDiscoverParams('movie', filters, language));

  try {
    return mapMovieDiscoverResponse(TmdbDiscoverMovieResponseSchema.parse(raw));
  } catch {
    throw createTmdbError('INVALID_RESPONSE');
  }
}

/**
 * Retrieves, validates and maps TV Discover results.
 *
 * @param http - The TMDb HTTP client used for the upstream request.
 * @param filters - The Discover filters to apply.
 * @param language - The TMDb content language for localized fields.
 * @returns The mapped paged response containing TV media items.
 * @throws A TMDb error with code `INVALID_RESPONSE` when the response
 * cannot be validated or mapped.
 */
async function discoverTv(
  http: TmdbHttpClient,
  filters: DiscoverFilters,
  language?: TmdbContentLanguage,
): Promise<TmdbPagedResponse> {
  const raw = await http.get('/discover/tv', buildDiscoverParams('tv', filters, language));

  try {
    return mapTvDiscoverResponse(TmdbDiscoverTvResponseSchema.parse(raw));
  } catch {
    throw createTmdbError('INVALID_RESPONSE');
  }
}

/**
 * Creates a Discover service backed by the supplied TMDb HTTP client.
 *
 * @param http - The TMDb HTTP client used for upstream requests.
 * @returns The Discover service.
 */
export function createDiscoverService(http: TmdbHttpClient) {
  return {
    /**
     * Retrieves and maps Movie Discover results for the supplied filters.
     *
     * @param filters - The Discover filters to apply.
     * @param language - The TMDb content language for localized fields.
     * @returns The mapped paged response containing movie media items.
     */
    discoverMovies(
      filters: DiscoverFilters,
      language?: TmdbContentLanguage,
    ): Promise<TmdbPagedResponse> {
      return discoverMovies(http, filters, language);
    },

    /**
     * Retrieves and maps TV Discover results for the supplied filters.
     *
     * @param filters - The Discover filters to apply.
     * @param language - The TMDb content language for localized fields.
     * @returns The mapped paged response containing TV media items.
     */
    discoverTv(
      filters: DiscoverFilters,
      language?: TmdbContentLanguage,
    ): Promise<TmdbPagedResponse> {
      return discoverTv(http, filters, language);
    },
  };
}
