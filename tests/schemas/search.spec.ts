import { describe, expect, it } from 'vitest';
import { SearchFiltersSchema } from '../../src/lib/schemas/search';

describe('SearchFiltersSchema', () => {
  // Branch coverage: applies documented defaults
  it('applies documented defaults', () => {
    const result = SearchFiltersSchema.parse({});

    expect(result).toEqual({
      mediaType: 'all',
      keywordIds: [],
      genreIds: [],
      sortBy: 'popularity.desc',
    });
  });

  // Statement coverage: accepts a valid filter state
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

  // Branch coverage: rejects an unsupported media type
  it('rejects an unsupported media type', () => {
    expect(() => SearchFiltersSchema.parse({ mediaType: 'documentary' })).toThrow();
  });

  // Branch coverage: rejects too many genres
  it('rejects too many genres', () => {
    expect(() =>
      SearchFiltersSchema.parse({
        genreIds: [1, 2, 3, 4],
      }),
    ).toThrow();
  });

  // Branch coverage: rejects unknown properties
  it('rejects unknown properties', () => {
    expect(() => SearchFiltersSchema.parse({ mood: 'cozy' })).toThrow();
  });
});
