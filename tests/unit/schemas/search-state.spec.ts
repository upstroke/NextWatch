import { describe, expect, it } from 'vitest';
import { MAX_KEYWORD_IDS, MAX_PERSON_IDS } from '@lib/config/domain';
import { SearchStateSchema } from '@lib/schemas/search-state';

function input() {
  return {
    mode: 'discover',
    revision: 6,
    filters: { genreIds: [878], minYear: 2000, maxYear: 2020 },
    people: [{ id: 501, name: ' Example person ' }],
    pendingQueries: {
      personQueries: [{ ref: 'person-1', query: ' Another person ', operation: 'add' }],
      keywordQueries: [{ ref: 'keyword-1', query: ' time travel ' }],
    },
  };
}

describe('SearchStateSchema', () => {
  // Statement coverage: defaults contain no invented criteria or duplicate person-ID storage.
  it('parses an initial state with empty accepted people and pending queries', () => {
    expect(SearchStateSchema.parse({ mode: 'trending', revision: 0, filters: {} })).toEqual({
      mode: 'trending',
      revision: 0,
      filters: { mediaType: 'all', keywordIds: [], genreIds: [], sortBy: 'popularity.desc' },
      people: [],
      pendingQueries: { personQueries: [], keywordQueries: [] },
    });
  });
  // Statement coverage: normalization preserves references, identity and unrelated filters without mutation.
  it('preserves filters and person identities while trimming names and pending queries', () => {
    const original = input();
    const snapshot = structuredClone(original);
    const result = SearchStateSchema.parse(original);
    expect(result).toEqual({
      ...original,
      filters: { ...original.filters, mediaType: 'all', keywordIds: [], sortBy: 'popularity.desc' },
      people: [{ id: 501, name: 'Example person' }],
      pendingQueries: {
        personQueries: [{ ref: 'person-1', query: 'Another person', operation: 'add' }],
        keywordQueries: [{ ref: 'keyword-1', query: 'time travel' }],
      },
    });
    expect(original).toEqual(snapshot);
  });
  // Branch coverage: the migrated state retains the cross-field year rule.
  it('rejects reversed years alongside accepted people', () => {
    const result = SearchStateSchema.safeParse({
      ...input(),
      filters: { minYear: 2020, maxYear: 2000 },
    });
    expect(result.success).toBe(false);
    if (result.success) throw new Error('Expected an invalid year range');
    expect(result.error.issues).toContainEqual(
      expect.objectContaining({ path: ['filters', 'maxYear'] }),
    );
  });
  // Branch coverage: pending queries must remain usable after trimming.
  it.each([
    { personQueries: [{ ref: 'p', query: '   ', operation: 'add' }], keywordQueries: [] },
    { personQueries: [], keywordQueries: [{ ref: 'k', query: '   ' }] },
  ])('rejects a blank pending query: %j', (pendingQueries) => {
    expect(SearchStateSchema.safeParse({ ...input(), pendingQueries }).success).toBe(false);
  });
  // Branch coverage: pending-query bounds remain enforced with referenced requests.
  it.each([
    { field: 'personQueries', limit: MAX_PERSON_IDS },
    { field: 'keywordQueries', limit: MAX_KEYWORD_IDS },
  ])('enforces the $field limit without altering the input', ({ field, limit }) => {
    const requests = Array.from({ length: limit }, (_, index) =>
      field === 'personQueries'
        ? { ref: `p-${index}`, query: `query-${index}`, operation: 'add' }
        : { ref: `k-${index}`, query: `query-${index}` },
    );
    const original = {
      mode: 'discover',
      revision: 1,
      filters: {},
      pendingQueries: { [field]: requests },
    };
    const snapshot = structuredClone(original);
    expect(SearchStateSchema.safeParse(original).success).toBe(true);
    const extra =
      field === 'personQueries'
        ? { ref: 'extra', query: 'extra', operation: 'add' }
        : { ref: 'extra', query: 'extra' };
    expect(
      SearchStateSchema.safeParse({
        ...original,
        pendingQueries: { [field]: [...requests, extra] },
      }).success,
    ).toBe(false);
    expect(original).toEqual(snapshot);
  });
  // Branch coverage: accepted-person limits are independent of display labels.
  it('enforces the accepted-person limit without altering the input', () => {
    const people = Array.from({ length: MAX_PERSON_IDS }, (_, index) => ({
      id: index + 1,
      name: `Person ${index}`,
    }));
    const original = { mode: 'discover', revision: 1, filters: {}, people };
    const snapshot = structuredClone(original);
    expect(SearchStateSchema.safeParse(original).success).toBe(true);
    expect(
      SearchStateSchema.safeParse({
        ...original,
        people: [...people, { id: 99, name: 'Extra person' }],
      }).success,
    ).toBe(false);
    expect(original).toEqual(snapshot);
  });
  // Branch coverage: duplicate accepted identities are rejected rather than silently normalized.
  it('rejects repeated person IDs even when their names differ', () => {
    const original = {
      ...input(),
      people: [
        { id: 501, name: 'One' },
        { id: 501, name: 'Other spelling' },
      ],
    };
    const snapshot = structuredClone(original);
    const result = SearchStateSchema.safeParse(original);
    expect(result.success).toBe(false);
    if (result.success) throw new Error('Expected duplicate person IDs to be rejected');
    expect(result.error.issues).toContainEqual(
      expect.objectContaining({ path: ['people'], message: 'Accepted person IDs must be unique' }),
    );
    expect(original).toEqual(snapshot);
  });
  // Branch coverage: equal display names do not establish identity.
  it('preserves distinct IDs with the same display name', () => {
    const people = [
      { id: 501, name: 'Example person' },
      { id: 502, name: 'Example person' },
    ];
    expect(SearchStateSchema.parse({ ...input(), people }).people).toEqual(people);
  });
  // Branch coverage: accepted names must remain usable after normalization.
  it('rejects an accepted display name that becomes blank after trimming', () => {
    const result = SearchStateSchema.safeParse({ ...input(), people: [{ id: 501, name: '   ' }] });
    expect(result.success).toBe(false);
    if (result.success) throw new Error('Expected a blank display name to be rejected');
    expect(result.error.issues).toContainEqual(
      expect.objectContaining({ path: ['people', 0, 'name'] }),
    );
  });
  // Branch coverage: legacy ID storage remains rejected even with accepted identity records.
  it.each([{ personIds: [] }, { personIds: [501] }])(
    'rejects legacy person-ID storage: %j',
    (filters) => {
      const original = { ...input(), filters };
      const snapshot = structuredClone(original);
      const result = SearchStateSchema.safeParse(original);
      expect(result.success).toBe(false);
      if (result.success) throw new Error('Expected legacy person-ID storage to be rejected');
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({
          code: 'unrecognized_keys',
          path: ['filters'],
          keys: ['personIds'],
        }),
      );
      expect(original).toEqual(snapshot);
    },
  );
});
