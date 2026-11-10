import { describe, expect, it } from 'vitest';
import { DiscoverFiltersSchema } from '@lib/schemas/discover';
import { MAX_KEYWORD_IDS, MAX_PERSON_IDS } from '@lib/config/domain';

describe('DiscoverFiltersSchema', () => {
  // Statement coverage: applies defaults for absent filters
  it('applies defaults for absent filters', () => {
    expect(DiscoverFiltersSchema.parse({})).toEqual({
      genreIds: [],
      personIds: [],
      keywordIds: [],
      sortBy: 'popularity.desc',
    });
  });

  // Statement coverage: accepts valid person and keyword ids
  it('accepts valid person and keyword ids', () => {
    const filters = {
      personIds: [1, 2],
      keywordIds: [10, 20],
    };

    expect(DiscoverFiltersSchema.parse(filters)).toEqual({
      genreIds: [],
      personIds: [1, 2],
      keywordIds: [10, 20],
      sortBy: 'popularity.desc',
    });
  });

  // Branch coverage: rejects too many person ids
  it('rejects too many person ids', () => {
    const personIds = Array.from({ length: MAX_PERSON_IDS + 1 }, (_, index) => index + 1);

    expect(() => DiscoverFiltersSchema.parse({ personIds })).toThrow();
  });

  // Branch coverage: rejects too many keyword ids
  it('rejects too many keyword ids', () => {
    const keywordIds = Array.from({ length: MAX_KEYWORD_IDS + 1 }, (_, index) => index + 1);

    expect(() => DiscoverFiltersSchema.parse({ keywordIds })).toThrow();
  });

  // Branch coverage: rejects a reversed year range
  it('rejects a reversed year range', () => {
    expect(() =>
      DiscoverFiltersSchema.parse({
        yearFrom: 2024,
        yearTo: 2020,
      }),
    ).toThrow();
  });
});
