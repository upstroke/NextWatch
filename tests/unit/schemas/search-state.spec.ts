import { describe, expect, it } from 'vitest';
import { MAX_KEYWORD_IDS, MAX_PERSON_IDS } from '@lib/config/domain';
import { SearchStateSchema } from '@lib/schemas/search-state';

describe('SearchStateSchema', () => {
  // Statement coverage: empty filter input reuses existing defaults and empty query lists.
  it('parses an initial-state payload without inventing search criteria', () => {
    expect(SearchStateSchema.parse({ mode: 'trending', revision: 0, filters: {} })).toEqual({
      mode: 'trending',
      revision: 0,
      filters: {
        mediaType: 'all',
        keywordIds: [],
        genreIds: [],
        personIds: [],
        sortBy: 'popularity.desc',
      },
      pendingQueries: { personQueries: [], keywordQueries: [] },
    });
  });

  // Statement coverage: pending terms coexist with active IDs without replacing them.
  it('preserves active filters and normalizes pending queries separately', () => {
    const input = {
      mode: 'discover',
      revision: 6,
      filters: {
        mediaType: 'movie',
        genreIds: [878],
        personIds: [501],
        keywordIds: [301],
        minYear: 2000,
        maxYear: 2020,
      },
      pendingQueries: {
        personQueries: [' Brad Pitt '],
        keywordQueries: [' time travel '],
      },
    };
    const snapshot = JSON.stringify(input);
    const result = SearchStateSchema.parse(input);

    expect(result).toMatchObject({
      mode: 'discover',
      revision: 6,
      filters: input.filters,
      pendingQueries: {
        personQueries: ['Brad Pitt'],
        keywordQueries: ['time travel'],
      },
    });
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  // Branch coverage: extending active filters retains the existing cross-field year rule.
  it('rejects reversed years in the extended active filters', () => {
    const result = SearchStateSchema.safeParse({
      mode: 'discover',
      revision: 1,
      filters: { minYear: 2020, maxYear: 2000, personIds: [501] },
    });

    expect(result.success).toBe(false);
    if (result.success) throw new Error('Expected an invalid year range');
    expect(result.error.issues).toEqual([
      expect.objectContaining({ path: ['filters', 'maxYear'] }),
    ]);
  });

  // Branch coverage: accepted pending queries must remain usable after trimming.
  it.each([
    { personQueries: ['   '], keywordQueries: [] },
    { personQueries: [], keywordQueries: ['   '] },
  ])('rejects a blank pending query: %j', (pendingQueries) => {
    expect(
      SearchStateSchema.safeParse({
        mode: 'discover',
        revision: 1,
        filters: {},
        pendingQueries,
      }).success,
    ).toBe(false);
  });

  // Branch coverage: pending-query limits match the approved person and keyword bounds.
  it.each([
    { field: 'personQueries', limit: MAX_PERSON_IDS },
    { field: 'keywordQueries', limit: MAX_KEYWORD_IDS },
  ])('enforces the $field limit without altering the input', ({ field, limit }) => {
    const queries = Array.from({ length: limit }, (_, index) => `query-${index}`);
    const input = {
      mode: 'discover',
      revision: 1,
      filters: {},
      pendingQueries: { [field]: queries },
    };

    expect(SearchStateSchema.safeParse(input).success).toBe(true);
    const overLimit = {
      ...input,
      pendingQueries: { [field]: [...queries, 'extra-query'] },
    };
    expect(SearchStateSchema.safeParse(overLimit).success).toBe(false);
    expect(queries).toHaveLength(limit);
  });

  // Branch coverage: resolved cast IDs obey the existing person-domain limit.
  it('enforces the person ID limit in active filters', () => {
    const ids = Array.from({ length: MAX_PERSON_IDS }, (_, index) => index + 1);
    const input = { mode: 'discover', revision: 1, filters: { personIds: ids } };

    expect(SearchStateSchema.safeParse(input).success).toBe(true);
    expect(
      SearchStateSchema.safeParse({
        ...input,
        filters: { personIds: [...ids, MAX_PERSON_IDS + 1] },
      }).success,
    ).toBe(false);
  });
});
