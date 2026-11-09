import { z } from 'zod';

export const TmdbMediaTypeSchema = z.enum(['movie', 'tv', 'person']);

export type TmdbMediaType = z.infer<typeof TmdbMediaTypeSchema>;

export const TmdbMediaSchema = z.object({
  id: z.number().int().positive(),
  mediaType: z.enum(['movie', 'tv']),
  title: z.string().optional(),
  name: z.string().optional(),
  overview: z.string().optional(),
  posterPath: z.string().nullable().optional(),
  backdropPath: z.string().nullable().optional(),
  voteAverage: z.number().optional(),
  releaseDate: z.string().optional(),
  firstAirDate: z.string().optional(),
});

export const TmdbPagedResponseSchema = z.object({
  page: z.number().int().positive(),
  results: z.array(TmdbMediaSchema),
  totalPages: z.number().int().nonnegative(),
  totalResults: z.number().int().nonnegative(),
});

export type TmdbMedia = z.infer<typeof TmdbMediaSchema>;
export type TmdbPagedResponse = z.infer<typeof TmdbPagedResponseSchema>;
