import { describe, expect, it } from 'vitest';
import type { FilterChange } from '@lib/schemas/chat';
import { SearchStateSchema } from '@lib/schemas/search-state';
import { applyIntent } from '@lib/domain/search/apply-intent';

function state(filters = {}, revision = 0, mode: 'trending' | 'discover' = 'trending') {
  return SearchStateSchema.parse({ filters, revision, mode });
}
function ready(changes: FilterChange[], baseRevision = 0) {
  return { status: 'ready', changes, baseRevision };
}
function change(field: string, operation: FilterChange['operation'], value: unknown): FilterChange {
  return { field, operation, value };
}
function pending() {
  return {
    personQueries: [{ ref: 'p-1', query: 'Another person', operation: 'add' }],
    keywordQueries: [{ ref: 'k-1', query: 'space' }],
  };
}

describe('applyIntent', () => {
  // Statement coverage: filter changes preserve referenced requests and accepted people with mutation isolation.
  it('applies changes to complete state without mutating or sharing accepted people', () => {
    const original = SearchStateSchema.parse({
      mode: 'discover',
      revision: 4,
      filters: { mediaType: 'movie', genreIds: [878], minRating: 7 },
      people: [
        { id: 501, name: 'Example person' },
        { id: 502, name: 'Second person' },
      ],
      pendingQueries: pending(),
    });
    const snapshot = structuredClone(original);
    const result = applyIntent(
      original,
      ready([change('minRating', 'set', 8.5), change('keywordIds', 'add', [301])], 4),
    );
    expect(result).toEqual({
      status: 'applied',
      state: {
        ...snapshot,
        revision: 5,
        filters: { ...snapshot.filters, minRating: 8.5, keywordIds: [301] },
      },
    });
    if (result.status !== 'applied') throw new Error('Expected an applied intent');
    expect(SearchStateSchema.parse(result.state)).toEqual(result.state);
    expect(result.state.filters).not.toHaveProperty('personIds');
    expect(result.state.people).not.toBe(original.people);
    expect(result.state.people[0]).not.toBe(original.people[0]);
    expect(result.state.people[1]).not.toBe(original.people[1]);
    expect(result.state.pendingQueries.personQueries).not.toBe(
      original.pendingQueries.personQueries,
    );
    expect(result.state.pendingQueries.keywordQueries).not.toBe(
      original.pendingQueries.keywordQueries,
    );
    expect(result.state.pendingQueries.personQueries[0]).not.toBe(
      original.pendingQueries.personQueries[0],
    );
    expect(result.state.pendingQueries.keywordQueries[0]).not.toBe(
      original.pendingQueries.keywordQueries[0],
    );
    const person = result.state.people[0];
    const request = result.state.pendingQueries.personQueries[0];
    const keyword = result.state.pendingQueries.keywordQueries[0];
    if (!person || !request || !keyword) throw new Error('Expected preserved records');
    person.id = 503;
    person.name = 'Changed';
    request.query = 'Changed request';
    keyword.query = 'Changed term';
    result.state.people.push({ id: 504, name: 'Extra person' });
    result.state.pendingQueries.personQueries.push({
      ref: 'extra',
      query: 'Extra query',
      operation: 'add',
    });
    expect(original).toEqual(snapshot);
  });
  // Branch coverage: list operations retain merge, removal and replacement behavior.
  it.each([
    { operation: 'add', value: [301, 402], expected: [301, 402] },
    { operation: 'remove', value: [301], expected: [] },
    { operation: 'set', value: [402], expected: [402] },
    { operation: 'replace', value: [402], expected: [402] },
  ] satisfies { operation: FilterChange['operation']; value: number[]; expected: number[] }[])(
    'applies list operation $operation',
    ({ operation, value, expected }) => {
      const original = state({ keywordIds: [301] }, 0, 'discover');
      const snapshot = structuredClone(original);
      expect(applyIntent(original, ready([change('keywordIds', operation, value)]))).toMatchObject({
        status: 'applied',
        state: { filters: { keywordIds: expected }, revision: 1 },
      });
      expect(original).toEqual(snapshot);
    },
  );
  // Branch coverage: each scalar retains its field-specific checks and activates discover.
  it.each([
    { field: 'mediaType', value: 'movie' },
    { field: 'sortBy', value: 'vote_average.desc' },
    { field: 'minRating', value: 8 },
    { field: 'minYear', value: 2000 },
    { field: 'maxYear', value: 2020 },
  ])('accepts $field and enters discover', ({ field, value }) => {
    expect(applyIntent(state(), ready([change(field, 'set', value)]))).toMatchObject({
      status: 'applied',
      state: { mode: 'discover', revision: 1, filters: { [field]: value } },
    });
  });
  // Branch coverage: an invalid field, operation or value rejects all changes atomically.
  it.each([
    { field: 'director', operation: 'set', value: 'Nolan', reason: 'unknown-field' },
    { field: 'minRating', operation: 'add', value: 8, reason: 'invalid-operation' },
    { field: 'mediaType', operation: 'remove', value: undefined, reason: 'invalid-operation' },
    { field: 'minRating', operation: 'set', value: undefined, reason: 'invalid-value' },
    { field: 'mediaType', operation: 'set', value: 42, reason: 'invalid-value' },
    { field: 'minRating', operation: 'set', value: '8', reason: 'invalid-value' },
    { field: 'minYear', operation: 'set', value: 2000.5, reason: 'invalid-value' },
    { field: 'keywordIds', operation: 'set', value: 301, reason: 'invalid-value' },
    { field: 'keywordIds', operation: 'set', value: ['301'], reason: 'invalid-value' },
    { field: 'keywordIds', operation: 'set', value: [301, 402, 550, 660], reason: 'invalid-value' },
    { field: 'minRating', operation: 'set', value: 42, reason: 'invalid-value' },
  ] satisfies {
    field: string;
    operation: FilterChange['operation'];
    value: unknown;
    reason: string;
  }[])('rejects $field / $operation / $value', ({ field, operation, value, reason }) => {
    const original = state({ genreIds: [878] }, 3, 'discover');
    const snapshot = structuredClone(original);
    expect(
      applyIntent(
        original,
        ready([change('genreIds', 'add', [28]), change(field, operation, value)], 3),
      ),
    ).toEqual({ status: 'rejected', reason, field });
    expect(original).toEqual(snapshot);
  });
  // Branch coverage: ineffective intents preserve identities, mode and revision.
  it.each([
    [],
    [change('minRating', 'set', 7)],
    [change('keywordIds', 'set', [301]), change('genreIds', 'set', [28])],
    [change('minRating', 'set', 8), change('minRating', 'set', 7)],
  ])('preserves state for ineffective intent %j', (...changes) => {
    const original = {
      ...state({ minRating: 7, keywordIds: [301], genreIds: [28] }, 2, 'discover'),
      people: [{ id: 501, name: 'Example person' }],
    };
    const snapshot = structuredClone(original);
    expect(applyIntent(original, ready(changes, 2))).toEqual({
      status: 'unchanged',
      reason: 'no-effective-change',
    });
    expect(original).toEqual(snapshot);
  });
  // Branch coverage: removing the final individual criterion restores trending.
  it('returns to trending when the final criterion is removed', () => {
    expect(
      applyIntent(
        state({ minRating: 7 }, 8, 'discover'),
        ready([change('minRating', 'remove', undefined)], 8),
      ),
    ).toMatchObject({ status: 'applied', state: { mode: 'trending', revision: 9 } });
  });
  // Branch coverage: each remaining filter keeps discover active.
  it.each([
    { mediaType: 'movie' },
    { sortBy: 'vote_average.desc' },
    { minYear: 2000 },
    { maxYear: 2020 },
    { genreIds: [878] },
    { keywordIds: [301] },
  ])('keeps discover for remaining filters %j', (filters) => {
    expect(
      applyIntent(
        state({ ...filters, minRating: 7 }, 0, 'discover'),
        ready([change('minRating', 'remove', undefined)]),
      ),
    ).toMatchObject({ status: 'applied', state: { mode: 'discover', revision: 1 } });
  });
  // Branch coverage: accepted people remain criteria without a separately stored person-ID list.
  it('keeps discover when accepted people are the only remaining criteria', () => {
    const original = SearchStateSchema.parse({
      mode: 'discover',
      revision: 2,
      filters: { minRating: 7 },
      people: [{ id: 501, name: 'Example person' }],
    });
    const snapshot = structuredClone(original);
    expect(applyIntent(original, ready([change('minRating', 'remove', undefined)], 2))).toEqual({
      status: 'applied',
      state: {
        ...snapshot,
        revision: 3,
        filters: { mediaType: 'all', sortBy: 'popularity.desc', genreIds: [], keywordIds: [] },
      },
    });
    expect(original).toEqual(snapshot);
  });
  // Branch coverage: unresolved requests keep discover active and preserve their references.
  it.each([
    {
      personQueries: [{ ref: 'p', query: 'Example person', operation: 'add' }],
      keywordQueries: [],
    },
    { personQueries: [], keywordQueries: [{ ref: 'k', query: 'space' }] },
  ])('preserves pending queries %j', (pendingQueries) => {
    const original = SearchStateSchema.parse({
      ...state({ minRating: 7 }, 0, 'discover'),
      pendingQueries,
    });
    const snapshot = structuredClone(original);
    expect(applyIntent(original, ready([change('minRating', 'remove', undefined)]))).toMatchObject({
      status: 'applied',
      state: { mode: 'discover', pendingQueries, revision: 1 },
    });
    expect(original).toEqual(snapshot);
  });
  // Branch coverage: filter updates cannot consume slots reserved by unresolved keyword requests.
  it('rejects a keyword update that exceeds the combined active and pending limit', () => {
    const original = SearchStateSchema.parse({
      mode: 'discover',
      revision: 4,
      filters: { keywordIds: [301, 402] },
      pendingQueries: { keywordQueries: [{ ref: 'k', query: 'space' }] },
    });
    const snapshot = structuredClone(original);
    expect(
      applyIntent(
        original,
        ready([change('minRating', 'set', 8), change('keywordIds', 'add', [550])], 4),
      ),
    ).toEqual({ status: 'rejected', reason: 'invalid-value' });
    expect(original).toEqual(snapshot);
  });
});
