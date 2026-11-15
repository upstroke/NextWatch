import { describe, expect, it } from 'vitest';
import { MAX_KEYWORD_IDS, MAX_PERSON_IDS } from '@lib/config/domain';
import { SearchStateSchema } from '@lib/schemas/search-state';

describe('SearchStateSchema', () => {
  // Statement coverage: defaults contain no invented criteria or duplicate person-ID storage.
  it('parses an initial state with empty accepted people and pending queries', () => {
    expect(SearchStateSchema.parse({ mode: 'trending', revision: 0, filters: {} })).toEqual({
      mode: 'trending',
      revision: 0,
      filters: {
        mediaType: 'all',
        keywordIds: [],
        genreIds: [],
        sortBy: 'popularity.desc',
      },
      people: [],
      pendingQueries: { personQueries: [], keywordQueries: [] },
    });
  });

  // Statement coverage: accepted identities and pending terms coexist and normalize without mutation.
  it('preserves filters and person identities while trimming names and pending queries', () => {
    const input = {
      mode: 'discover',
      revision: 6,
      filters: {
        mediaType: 'movie',
        genreIds: [878],
        keywordIds: [301],
        minYear: 2000,
        maxYear: 2020,
      },
      people: [{ id: 501, name: ' Example person ' }],
      pendingQueries: {
        personQueries: [' Another person '],
        keywordQueries: [' time travel '],
      },
    };
    const snapshot = structuredClone(input);
    const result = SearchStateSchema.parse(input);

    expect(result).toEqual({
      ...input,
      filters: { ...input.filters, sortBy: 'popularity.desc' },
      people: [{ id: 501, name: 'Example person' }],
      pendingQueries: {
        personQueries: ['Another person'],
        keywordQueries: ['time travel'],
      },
    });
    expect(input).toEqual(snapshot);
  });

  // Branch coverage: the migrated state retains the existing cross-field year rule.
  it('rejects reversed years alongside accepted people', () => {
    const result = SearchStateSchema.safeParse({
      mode: 'discover',
      revision: 1,
      filters: { minYear: 2020, maxYear: 2000 },
      people: [{ id: 501, name: 'Example person' }],
    });

    expect(result.success).toBe(false);
    if (result.success) throw new Error('Expected an invalid year range');
    expect(result.error.issues).toEqual([
      expect.objectContaining({ path: ['filters', 'maxYear'] }),
    ]);
  });

  // Branch coverage: pending queries must remain usable after trimming.
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

  // Branch coverage: the existing separate pending-query bounds remain enforced.
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
    const snapshot = structuredClone(input);

    expect(SearchStateSchema.safeParse(input).success).toBe(true);
    expect(
      SearchStateSchema.safeParse({
        ...input,
        pendingQueries: { [field]: [...queries, 'extra-query'] },
      }).success,
    ).toBe(false);
    expect(input).toEqual(snapshot);
  });

  // Branch coverage: accepted ID/name records retain the existing person-domain bound.
  it('enforces the accepted-person limit without altering the input', () => {
    const people = Array.from({ length: MAX_PERSON_IDS }, (_, index) => ({
      id: index + 1,
      name: `Example person ${index + 1}`,
    }));
    const input = { mode: 'discover', revision: 1, filters: {}, people };
    const snapshot = structuredClone(input);

    expect(SearchStateSchema.safeParse(input).success).toBe(true);
    expect(
      SearchStateSchema.safeParse({
        ...input,
        people: [...people, { id: MAX_PERSON_IDS + 1, name: 'Extra person' }],
      }).success,
    ).toBe(false);
    expect(input).toEqual(snapshot);
  });

  // Branch coverage: identity uniqueness depends on provider ID, not display-name spelling.
  it('rejects repeated person IDs even when their names differ', () => {
    const input = {
      mode: 'discover',
      revision: 1,
      filters: {},
      people: [
        { id: 501, name: 'Example person' },
        { id: 501, name: 'Other spelling' },
      ],
    };
    const snapshot = structuredClone(input);
    const result = SearchStateSchema.safeParse(input);

    expect(result.success).toBe(false);
    if (result.success) throw new Error('Expected duplicate person IDs to be rejected');
    expect(result.error.issues).toContainEqual(
      expect.objectContaining({
        path: ['people'],
        message: 'Accepted person IDs must be unique',
      }),
    );
    expect(input).toEqual(snapshot);
  });

  // Branch coverage: distinct people may legitimately share a display name.
  it('preserves distinct IDs with the same display name', () => {
    const people = [
      { id: 501, name: 'Example person' },
      { id: 502, name: 'Example person' },
    ];
    expect(
      SearchStateSchema.parse({
        mode: 'discover',
        revision: 1,
        filters: {},
        people,
      }).people,
    ).toEqual(people);
  });

  // Branch coverage: normalization must not leave accepted people without a usable label.
  it('rejects an accepted display name that becomes blank after trimming', () => {
    const result = SearchStateSchema.safeParse({
      mode: 'discover',
      revision: 1,
      filters: {},
      people: [{ id: 501, name: '   ' }],
    });

    expect(result.success).toBe(false);
    if (result.success) throw new Error('Expected a blank display name to be rejected');
    expect(result.error.issues).toContainEqual(
      expect.objectContaining({
        path: ['people', 0, 'name'],
      }),
    );
  });

  // Branch coverage: legacy ID lists are rejected even alongside valid accepted-person records.
  it.each([{ personIds: [] }, { personIds: [501] }])(
    'rejects legacy person-ID storage instead of silently dropping it: %j',
    (filters) => {
      const input = {
        mode: 'discover',
        revision: 1,
        filters,
        people: [{ id: 501, name: 'Example person' }],
      };
      const snapshot = structuredClone(input);
      const result = SearchStateSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (result.success) throw new Error('Expected legacy person-ID storage to be rejected');
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({
          code: 'unrecognized_keys',
          path: ['filters'],
          keys: ['personIds'],
        }),
      );
      expect(input).toEqual(snapshot);
    },
  );
});
