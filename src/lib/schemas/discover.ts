import { z } from 'zod';

export const DiscoverSortBySchema = z.enum(['popularity.desc', 'vote_average.desc']);

export const DiscoverFiltersSchema = z
  .object({
    genreIds: z.array(z.number().int().positive()).max(3).default([]),
    minRating: z.number().min(0).max(10).optional(),
    yearFrom: z.number().int().min(1900).max(2100).optional(),
    yearTo: z.number().int().min(1900).max(2100).optional(),
    sortBy: DiscoverSortBySchema.default('popularity.desc')
  })
  .refine((filters) => filters.yearFrom === undefined || filters.yearTo === undefined || filters.yearFrom <= filters.yearTo, {
    message: 'yearFrom must be less than or equal to yearTo'
  });

export type DiscoverSortBy = z.infer<typeof DiscoverSortBySchema>;
export type DiscoverFilters = z.infer<typeof DiscoverFiltersSchema>;
