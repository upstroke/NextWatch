import { z } from 'zod';

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

export const DiscoverQuerySchema = z.object({
  genreIds: genreIdsSchema,
  minRating: optionalRatingSchema,
  yearFrom: optionalYearSchema,
  yearTo: optionalYearSchema,
  sortBy: z.enum(['popularity.desc', 'vote_average.desc']).default('popularity.desc')
});

export type DiscoverQuery = z.infer<typeof DiscoverQuerySchema>;
