import { z } from 'zod';
import { MAX_GENRE_IDS, MAX_KEYWORD_IDS } from '@lib/config/domain';

export const MediaTypeSchema = z.enum(['movie', 'tv', 'all']);

export type MediaType = z.infer<typeof MediaTypeSchema>;

export const SearchSortSchema = z.enum(['popularity.desc', 'vote_average.desc']);

export type SearchSort = z.infer<typeof SearchSortSchema>;

export const SearchFiltersSchema = z
  .object({
    mediaType: MediaTypeSchema.default('all'),
    keywordIds: z.array(z.number().int().positive()).max(MAX_KEYWORD_IDS).default([]),
    genreIds: z.array(z.number().int().positive()).max(MAX_GENRE_IDS).default([]),
    minRating: z.number().min(0).max(10).optional(),
    minYear: z.number().int().min(1900).max(2100).optional(),
    maxYear: z.number().int().min(1900).max(2100).optional(),
    sortBy: SearchSortSchema.default('popularity.desc'),
  })
  .strict()
  .refine(
    ({ minYear, maxYear }) => minYear === undefined || maxYear === undefined || maxYear >= minYear,
    { message: 'maxYear must be greater than or equal to minYear', path: ['maxYear'] },
  );

export type SearchFilters = z.infer<typeof SearchFiltersSchema>;
