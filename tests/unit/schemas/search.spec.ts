import { describe, expect, it } from 'vitest';
import {
  MediaTypeSchema,
  SearchFiltersSchema,
  SearchSortSchema,
} from '@lib/schemas/search';

describe('MediaTypeSchema', () => {
  it('accepts every supported media type', () => {
    expect(MediaTypeSchema.parse('movie')).toBe('movie');
    expect(MediaTypeSchema.parse('tv')).toBe('tv');
    expect(MediaTypeSchema.parse('all')).toBe('all');
  });

  it('rejects unsupported media types', () => {
    expect(() => MediaTypeSchema.parse('person')).toThrow();
    expect(() => MediaTypeSchema.parse('')).toThrow();
    expect(() => MediaTypeSchema.parse(1)).toThrow();
  });
});

describe('SearchSortSchema', () => {
  it('accepts supported sort values', () => {
    expect(SearchSortSchema.parse('popularity.desc')).toBe('popularity.desc');
    expect(SearchSortSchema.parse('voteaverage.desc')).toBe(
      'voteaverage.desc',
    );
  });

  it('rejects unsupported sort values', () => {
    expect(() => SearchSortSchema.parse('popularity.asc')).toThrow();
    expect(() => SearchSortSchema.parse('vote_average.desc')).toThrow();
  });
});

describe('SearchFiltersSchema', () => {
  it('applies documented defaults for an empty input', () => {
    expect(SearchFiltersSchema.parse({})).toEqual({
      mediaType: 'all',
      keywordIds: [],
      genreIds: [],
      sortBy: 'popularity.desc',
    });
  });

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

  it('limits keyword ids to five entries', () => {
    const filters = {
      keywordIds: [1, 2, 3, 4, 5, 6],
    };

    expect(() => SearchFiltersSchema.parse(filters)).toThrow();
  });

  it('limits genre ids to three entries', () => {
    const filters = {
      genreIds: [1, 2, 3, 4],
    };

    expect(() => SearchFiltersSchema.parse(filters)).toThrow();
  });

  it('rejects non-positive keyword and genre ids', () => {
    expect(() =>
      SearchFiltersSchema.parse({ keywordIds: [0] }),
    ).toThrow();

    expect(() =>
      SearchFiltersSchema.parse({ genreIds: [-1] }),
    ).toThrow();
  });

  it('rejects ratings outside the supported range', () => {
    expect(() => SearchFiltersSchema.parse({ minRating: -0.1 })).toThrow();
    expect(() => SearchFiltersSchema.parse({ minRating: 10.1 })).toThrow();
  });

  it('rejects years outside the supported range', () => {
    expect(() => SearchFiltersSchema.parse({ minYear: 1899 })).toThrow();
    expect(() => SearchFiltersSchema.parse({ maxYear: 2101 })).toThrow();
  });

  it('rejects non-integer years', () => {
    expect(() =>
      SearchFiltersSchema.parse({ minYear: 2000.5 }),
    ).toThrow();
  });

  it('rejects unknown properties', () => {
    expect(() =>
      SearchFiltersSchema.parse({
        unsupported: true,
      }),
    ).toThrow();
  });

  it('does not mutate the input object', () => {
    const input = {};

    SearchFiltersSchema.parse(input);

    expect(input).toEqual({});
  });
});
