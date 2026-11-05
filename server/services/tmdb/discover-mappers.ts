import type { TmdbPagedResponse } from '../../../src/lib/schemas/tmdb';
import type {
  TmdbDiscoverMovieResponse,
  TmdbDiscoverTvResponse
} from '../../../src/lib/schemas/tmdb-discover';

export function mapMovieDiscoverResponse(raw: TmdbDiscoverMovieResponse): TmdbPagedResponse {
  return {
    page: raw.page,
    totalPages: raw.total_pages,
    totalResults: raw.total_results,
    results: raw.results.map((item) => ({
      id: item.id,
      mediaType: 'movie' as const,
      overview: item.overview,
      posterPath: item.poster_path,
      backdropPath: item.backdrop_path,
      voteAverage: item.vote_average,
      title: item.title,
      releaseDate: item.release_date
    }))
  };
}

export function mapTvDiscoverResponse(raw: TmdbDiscoverTvResponse): TmdbPagedResponse {
  return {
    page: raw.page,
    totalPages: raw.total_pages,
    totalResults: raw.total_results,
    results: raw.results.map((item) => ({
      id: item.id,
      mediaType: 'tv' as const,
      overview: item.overview,
      posterPath: item.poster_path,
      backdropPath: item.backdrop_path,
      voteAverage: item.vote_average,
      name: item.name,
      firstAirDate: item.first_air_date
    }))
  };
}
