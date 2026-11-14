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

describe('applyIntent', () => {
  // Statement coverage: accepted changes preserve unrelated state and increment revision once.
  it('applies changes to complete state without mutating the original', () => {
    const original = SearchStateSchema.parse({
      mode: 'discover', revision: 4,
      filters: { mediaType: 'movie', genreIds: [878], personIds: [501], minRating: 7 },
      pendingQueries: { personQueries: ['Brad Pitt'], keywordQueries: ['space'] },
    });
    const snapshot = structuredClone(original);
    const result = applyIntent(original, ready([
      change('minRating', 'set', 8.5), change('keywordIds', 'add', [301]),
    ], 4));
    expect(result).toEqual({ status: 'applied', state: {
      ...snapshot, revision: 5,
      filters: { ...snapshot.filters, minRating: 8.5, keywordIds: [301] },
    } });
    expect(original).toEqual(snapshot);
  });

  // Branch coverage: list operations retain their merge, removal and replacement behavior.
  it.each([
    { operation: 'add', value: [301, 402], expected: [301, 402] },
    { operation: 'remove', value: [301], expected: [] },
    { operation: 'set', value: [402], expected: [402] },
    { operation: 'replace', value: [402], expected: [402] },
  ] satisfies { operation: FilterChange['operation']; value: number[]; expected: number[] }[])(
    'applies list operation $operation', ({ operation, value, expected }) => {
      const original = state({ keywordIds: [301] }, 0, 'discover');
      const snapshot = structuredClone(original);
      expect(applyIntent(original, ready([change('keywordIds', operation, value)])))
        .toMatchObject({ status: 'applied', state: { filters: { keywordIds: expected }, revision: 1 } });
      expect(original).toEqual(snapshot);
    },
  );

  // Branch coverage: scalar fields retain their field-specific value checks.
  it.each([
    { field: 'mediaType', value: 'movie' },
    { field: 'sortBy', value: 'vote_average.desc' },
    { field: 'minRating', value: 8 },
    { field: 'minYear', value: 2000 },
    { field: 'maxYear', value: 2020 },
  ])('accepts $field and enters discover', ({ field, value }) => {
    expect(applyIntent(state(), ready([change(field, 'set', value)]))).toMatchObject({
      status: 'applied', state: { mode: 'discover', revision: 1, filters: { [field]: value } },
    });
  });

  // Branch coverage: invalid field, operation or value rejects the complete candidate.
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
  ] satisfies { field: string; operation: FilterChange['operation']; value: unknown; reason: string }[])(
    'rejects $field / $operation / $value', ({ field, operation, value, reason }) => {
      const original = state({ genreIds: [878] }, 3, 'discover');
      const snapshot = structuredClone(original);
      expect(applyIntent(original, ready([
        change('genreIds', 'add', [28]), change(field, operation, value),
      ], 3))).toEqual({ status: 'rejected', reason, field });
      expect(original).toEqual(snapshot);
    },
  );

  // Branch coverage: ineffective changes do not normalize mode or advance revision.
  it.each([
    [],
    [change('minRating', 'set', 7)],
    [change('keywordIds', 'set', [301]), change('genreIds', 'set', [28])],
    [change('minRating', 'set', 8), change('minRating', 'set', 7)],
  ])('preserves state for ineffective intent %j', (...changes) => {
    const original = state({ minRating: 7, keywordIds: [301], genreIds: [28] }, 2, 'discover');
    const snapshot = structuredClone(original);
    expect(applyIntent(original, ready(changes, 2)))
      .toEqual({ status: 'unchanged', reason: 'no-effective-change' });
    expect(original).toEqual(snapshot);
  });

  // Branch coverage: removing the last individual criterion returns to trending.
  it('returns to trending when the final criterion is removed', () => {
    expect(applyIntent(state({ minRating: 7 }, 8, 'discover'), ready([
      change('minRating', 'remove', undefined),
    ], 8))).toMatchObject({ status: 'applied', state: { mode: 'trending', revision: 9 } });
  });

  // Branch coverage: each remaining active criterion keeps discover mode.
  it.each([
    { mediaType: 'movie' }, { sortBy: 'vote_average.desc' },
    { minYear: 2000 }, { maxYear: 2020 }, { genreIds: [878] },
    { keywordIds: [301] }, { personIds: [501] },
  ])('keeps discover for remaining filters %j', (filters) => {
    expect(applyIntent(state({ ...filters, minRating: 7 }, 0, 'discover'), ready([
      change('minRating', 'remove', undefined),
    ]))).toMatchObject({ status: 'applied', state: { mode: 'discover', revision: 1 } });
  });

  // Branch coverage: unresolved person or keyword queries also keep discover mode.
  it.each([
    { personQueries: ['Brad Pitt'], keywordQueries: [] },
    { personQueries: [], keywordQueries: ['space'] },
  ])('preserves pending queries %j', (pendingQueries) => {
    const original = { ...state({ minRating: 7 }, 0, 'discover'), pendingQueries };
    const snapshot = structuredClone(original);
    expect(applyIntent(original, ready([change('minRating', 'remove', undefined)])))
      .toMatchObject({ status: 'applied', state: { mode: 'discover', pendingQueries, revision: 1 } });
    expect(original).toEqual(snapshot);
  });
});
