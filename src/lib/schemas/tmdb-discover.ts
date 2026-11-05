import { z } from 'zod';

const discoverPaginationSchema = {
  page: z.number().int().positive(),
  total_pages: z.number().int().nonnegative(),
  total_results: z.number().int().nonnegative()
};

const discoverMediaFields = {
  id: z.number().int().positive(),
  overview: z.string(),
  poster_path: z.string().nullable(),
  backdrop_path: z.string().nullable(),
  vote_average: z.number().min(0).max(10)
};

export const TmdbDiscoverMovieItemSchema = z.object({
  ...discoverMediaFields,
  title: z.string(),
  release_date: z.string().optional()
});

export const TmdbDiscoverTvItemSchema = z.object({
  ...discoverMediaFields,
  name: z.string(),
  first_air_date: z.string().optional()
});

export const TmdbDiscoverMovieResponseSchema = z.object({
  ...discoverPaginationSchema,
  results: z.array(TmdbDiscoverMovieItemSchema)
});

export const TmdbDiscoverTvResponseSchema = z.object({
  ...discoverPaginationSchema,
  results: z.array(TmdbDiscoverTvItemSchema)
});

export type TmdbDiscoverMovieItem = z.infer<typeof TmdbDiscoverMovieItemSchema>;
export type TmdbDiscoverTvItem = z.infer<typeof TmdbDiscoverTvItemSchema>;
export type TmdbDiscoverMovieResponse = z.infer<typeof TmdbDiscoverMovieResponseSchema>;
export type TmdbDiscoverTvResponse = z.infer<typeof TmdbDiscoverTvResponseSchema>;
