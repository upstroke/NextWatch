import type { TmdbPagedResponse } from '@lib/schemas/tmdb';
import type {
  TmdbDiscoverMovieResponse,
  TmdbDiscoverTvResponse,
} from '@lib/schemas/tmdb-discover';

type PagedFields = Pick<TmdbPagedResponse, 'page' | 'totalPages' | 'totalResults'>;

function toPagedResponse(
  raw: PagedFields,
  results: TmdbPagedResponse['results'],
): TmdbPagedResponse {
  return {
    page: raw.page,
    totalPages: raw.totalPages,
    totalResults: raw.totalResults,
    results,
  };
}

/**
 * Maps a validated Movie Discover response to the internal paged response format.
 *
 * @param raw - The validated Movie Discover response.
 * @returns The mapped paged response containing movie media items.
 */
export function mapMovieDiscoverResponse(raw: TmdbDiscoverMovieResponse): TmdbPagedResponse {
  return toPagedResponse(
    {
      page: raw.page,
      totalPages: raw.total_pages,
      totalResults: raw.total_results,
    },
    raw.results.map((item) => ({
      id: item.id,
      mediaType: 'movie' as const,
      overview: item.overview,
      posterPath: item.poster_path,
      backdropPath: item.backdrop_path,
      voteAverage: item.vote_average,
      title: item.title,
      releaseDate: item.release_date,
    })),
  );
}

/**
 * Maps a validated TV Discover response to the internal paged response format.
 *
 * @param raw - The validated TV Discover response.
 * @returns The mapped paged response containing TV media items.
 */
export function mapTvDiscoverResponse(raw: TmdbDiscoverTvResponse): TmdbPagedResponse {
  return toPagedResponse(
    {
      page: raw.page,
      totalPages: raw.total_pages,
      totalResults: raw.total_results,
    },
    raw.results.map((item) => ({
      id: item.id,
      mediaType: 'tv' as const,
      overview: item.overview,
      posterPath: item.poster_path,
      backdropPath: item.backdrop_path,
      voteAverage: item.vote_average,
      name: item.name,
      firstAirDate: item.first_air_date,
    })),
  );
}
