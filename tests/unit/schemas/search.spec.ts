import { describe, expect, it } from 'vitest';
import { MediaTypeSchema, SearchFiltersSchema, SearchSortSchema } from '@lib/schemas/search';

describe('MediaTypeSchema', () => {
  // Statement coverage: accepts every supported media type
  it('accepts every supported media type', () => {
    expect(MediaTypeSchema.parse('movie')).toBe('movie');
    expect(MediaTypeSchema.parse('tv')).toBe('tv');
    expect(MediaTypeSchema.parse('all')).toBe('all');
  });
});

describe('SearchSortSchema', () => {
  // Statement coverage: accepts supported sort values
  it('accepts supported sort values', () => {
    expect(SearchSortSchema.parse('popularity.desc')).toBe('popularity.desc');
    expect(SearchSortSchema.parse('voteaverage.desc')).toBe('voteaverage.desc');
  });
});

describe('SearchFiltersSchema', () => {
  // Statement coverage: applies documented defaults for an empty input
  it('applies documented defaults for an empty input', () => {
    expect(SearchFiltersSchema.parse({})).toEqual({
      mediaType: 'all',
      keywordIds: [],
      genreIds: [],
      sortBy: 'popularity.desc',
    });
  });

  // Statement coverage: accepts a complete valid filter set
  it('accepts a complete valid filter set', () => {
    const filters = {
      mediaType: 'movie',
      keywordIds: [1, 2],
      genreIds: [28],
      minRating: 7.5,
      minYear: 2000,
      maxYear: 2026,
      sortBy: 'voteaverage.desc',
    };

    expect(SearchFiltersSchema.parse(filters)).toEqual(filters);
  });

  // Branch coverage: limits keyword ids to five entries
  it('limits keyword ids to five entries', () => {
    const filters = {
      keywordIds: [1, 2, 3, 4, 5, 6],
    };

    expect(() => SearchFiltersSchema.parse(filters)).toThrow();
  });

  // Branch coverage: limits genre ids to three entries
  it('limits genre ids to three entries', () => {
    const filters = {
      genreIds: [1, 2, 3, 4],
    };

    expect(() => SearchFiltersSchema.parse(filters)).toThrow();
  });

  // Branch coverage: rejects ratings outside the supported range
  it('rejects ratings outside the supported range', () => {
    expect(() => SearchFiltersSchema.parse({ minRating: -0.1 })).toThrow();
    expect(() => SearchFiltersSchema.parse({ minRating: 10.1 })).toThrow();
  });

  // Branch coverage: rejects years outside the supported range
  it('rejects years outside the supported range', () => {
    expect(() => SearchFiltersSchema.parse({ minYear: 1899 })).toThrow();
    expect(() => SearchFiltersSchema.parse({ maxYear: 2101 })).toThrow();
  });

  // Statement coverage: does not mutate the input object
  it('does not mutate the input object', () => {
    const input = {};

    SearchFiltersSchema.parse(input);

    expect(input).toEqual({});
  });
});
