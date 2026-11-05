import { z } from 'zod';

export const DiscoverSortBySchema = z.enum(['popularity.desc', 'vote_average.desc']);

const genreIdsSchema = z
  .union([z.array(z.coerce.number().int().positive()), z.coerce.number().int().positive(), z.string()])
  .transform((value) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'number') return [value];
    return value
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
      .map((item) => Number(item));
  })
  .pipe(z.array(z.number().int().positive()).max(3));

const optionalIntSchema = z
  .union([z.coerce.number().int(), z.literal('')])
  .transform((value) => (value === '' ? undefined : value))
  .pipe(z.number().int().min(1900).max(2100).optional());

export const DiscoverFiltersSchema = z
  .object({
    genreIds: genreIdsSchema.default([]),
    minRating: z
      .union([z.coerce.number(), z.literal('')])
      .transform((value) => (value === '' ? undefined : value))
      .pipe(z.number().min(0).max(10).optional()),
    yearFrom: optionalIntSchema,
    yearTo: optionalIntSchema,
    sortBy: DiscoverSortBySchema.default('popularity.desc')
  })
  .refine(
    (filters) => filters.yearFrom === undefined || filters.yearTo === undefined || filters.yearFrom <= filters.yearTo,
    { message: 'yearFrom must be less than or equal to yearTo' }
  );

export type DiscoverSortBy = z.infer<typeof DiscoverSortBySchema>;
export type DiscoverFilters = z.infer<typeof DiscoverFiltersSchema>;
