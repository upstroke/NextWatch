import { z } from 'zod';

export const MediaTypeSchema = z.enum(['movie', 'tv', 'all']);

export type MediaType = z.infer<typeof MediaTypeSchema>;

export const SearchSortSchema = z.enum([
  'popularity.desc',
  'voteaverage.desc',
]);

export type SearchSort = z.infer<typeof SearchSortSchema>;

export const SearchFiltersSchema = z
  .object({
    mediaType: MediaTypeSchema.default('all'),
    keywordIds: z
      .array(z.number().int().positive())
      .max(5)
      .default([]),
    genreIds: z
      .array(z.number().int().positive())
      .max(3)
      .default([]),
    minRating: z.number().min(0).max(10).optional(),
    minYear: z.number().int().min(1900).max(2100).optional(),
    maxYear: z.number().int().min(1900).max(2100).optional(),
    sortBy: SearchSortSchema.default('popularity.desc'),
  })
  .strict();

export type SearchFilters = z.infer<typeof SearchFiltersSchema>;
