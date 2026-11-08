import { TmdbPagedResponseSchema } from 'src/lib/schemas/tmdb';
import type { TmdbTrendingResponse } from 'src/lib/schemas/tmdb-trending';

/** Pure mapping of already validated upstream data to our public model. */
export function mapTrendingResponse(raw: TmdbTrendingResponse) {
  return TmdbPagedResponseSchema.parse({
    page: raw.page,
    totalPages: raw.total_pages,
    totalResults: raw.total_results,
    results: raw.results.map((item) => ({
      id: item.id,
      mediaType: item.media_type,
      overview: item.overview,
      posterPath: item.poster_path,
      backdropPath: item.backdrop_path,
      voteAverage: item.vote_average,
      ...(item.media_type === 'movie'
        ? { title: item.title, releaseDate: item.release_date }
        : { name: item.name, firstAirDate: item.first_air_date }),
    })),
  });
}
