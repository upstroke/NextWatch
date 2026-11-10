import { z } from 'zod';
import { MAX_GENRE_IDS, MAX_KEYWORD_IDS, MAX_PERSON_IDS } from '@lib/config/domain';

export const DiscoverSortBySchema = z.enum(['popularity.desc', 'vote_average.desc']);

export const DiscoverFiltersSchema = z
  .object({
    genreIds: z.array(z.number().int().positive()).max(MAX_GENRE_IDS).default([]),
    personIds: z.array(z.number().int().positive()).max(MAX_PERSON_IDS).default([]),
    keywordIds: z.array(z.number().int().positive()).max(MAX_KEYWORD_IDS).default([]),
    minRating: z.number().min(0).max(10).optional(),
    yearFrom: z.number().int().min(1900).max(2100).optional(),
    yearTo: z.number().int().min(1900).max(2100).optional(),
    sortBy: DiscoverSortBySchema.default('popularity.desc'),
  })
  .refine(
    (filters) =>
      filters.yearFrom === undefined ||
      filters.yearTo === undefined ||
      filters.yearFrom <= filters.yearTo,
    { message: 'yearFrom must be less than or equal to yearTo' },
  );

export type DiscoverSortBy = z.infer<typeof DiscoverSortBySchema>;
export type DiscoverFilters = z.infer<typeof DiscoverFiltersSchema>;
