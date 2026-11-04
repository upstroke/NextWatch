import { z } from 'zod';
import { TmdbPagedResponseSchema } from './tmdb';

const commonFields = {
  id: z.number().int().positive(),
  overview: z.string(),
  poster_path: z.string().nullable(),
  backdrop_path: z.string().nullable(),
  vote_average: z.number().min(0).max(10)
};

export const TmdbTrendingItemSchema = z.discriminatedUnion('media_type', [
  z.object({
    ...commonFields,
    media_type: z.literal('movie'),
    title: z.string(),
    release_date: z.string().optional()
  }),
  z.object({
    ...commonFields,
    media_type: z.literal('tv'),
    name: z.string(),
    first_air_date: z.string().optional()
  })
]);

export const TmdbTrendingResponseSchema = z.object({
  page: z.number().int().positive(),
  results: z.array(TmdbTrendingItemSchema),
  total_pages: z.number().int().nonnegative(),
  total_results: z.number().int().nonnegative()
});

export function normalizeTrendingResponse(input: unknown) {
  const raw = TmdbTrendingResponseSchema.parse(input);

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
        : { name: item.name, firstAirDate: item.first_air_date })
    }))
  });
}

export type TmdbTrendingResponse = z.infer<typeof TmdbTrendingResponseSchema>;
