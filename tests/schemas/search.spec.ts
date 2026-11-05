import { describe, expect, it } from 'vitest';
import { SearchFiltersSchema } from '../../src/lib/schemas/search';

describe('SearchFiltersSchema', () => {
  it('applies documented defaults', () => {
    const result = SearchFiltersSchema.parse({});

    expect(result).toEqual({
      mediaType: 'all',
      keywordIds: [],
      genreIds: [],
      sortBy: 'popularity.desc',
    });
  });

  it('accepts a valid filter state', () => {
    const result = SearchFiltersSchema.parse({
      mediaType: 'movie',
      genreIds: [28],
      minRating: 7,
      minYear: 2000,
      maxYear: 2026,
    });

    expect(result.mediaType).toBe('movie');
    expect(result.genreIds).toEqual([28]);
  });

  it('rejects an unsupported media type', () => {
    expect(() => SearchFiltersSchema.parse({ mediaType: 'documentary' })).toThrow();
  });

  it('rejects too many genres', () => {
    expect(() =>
      SearchFiltersSchema.parse({
        genreIds: [1, 2, 3, 4],
      }),
    ).toThrow();
  });

  it('rejects unknown properties', () => {
    expect(() => SearchFiltersSchema.parse({ mood: 'cozy' })).toThrow();
  });
});
