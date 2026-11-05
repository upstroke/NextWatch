import { z } from 'zod';

export const DiscoverSortBySchema = z.enum(['popularity.desc', 'vote_average.desc']);

const toUndefinedIfEmpty = (value: unknown) =>
  value === undefined || value === '' ? undefined : value;

const genreIdsSchema = z.preprocess(
  (value) => {
    if (value === undefined || value === '') return [];
    if (Array.isArray(value)) return value;
    return String(value).split(',');
  },
  z.array(z.coerce.number().int().positive()).max(3)
);

const optionalRatingSchema = z.preprocess(
  toUndefinedIfEmpty,
  z.coerce.number().min(0).max(10).optional()
);

const optionalYearSchema = z.preprocess(
  toUndefinedIfEmpty,
  z.coerce.number().int().min(1900).max(2100).optional()
);

export const DiscoverFiltersSchema = z
  .object({
    genreIds: genreIdsSchema,
    minRating: optionalRatingSchema,
    yearFrom: optionalYearSchema,
    yearTo: optionalYearSchema,
    sortBy: DiscoverSortBySchema.default('popularity.desc')
  })
  .refine(
    (filters) => filters.yearFrom === undefined || filters.yearTo === undefined || filters.yearFrom <= filters.yearTo,
    { message: 'yearFrom must be less than or equal to yearTo' }
  );

export type DiscoverSortBy = z.infer<typeof DiscoverSortBySchema>;
export type DiscoverFilters = z.infer<typeof DiscoverFiltersSchema>;
