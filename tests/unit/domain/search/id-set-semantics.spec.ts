import { describe, expect, it } from 'vitest';
import { SearchFiltersSchema } from '@lib/schemas/search';
import { SearchStateSchema } from '@lib/schemas/search-state';
import { applyIntent } from '@lib/domain/search/apply-intent';

function populatedState() {
  return SearchStateSchema.parse({
    mode: 'discover',
    revision: 4,
    filters: { genreIds: [878, 28], keywordIds: [402, 301], minRating: 7 },
    people: [{ id: 501, name: 'Accepted person' }],
    pendingQueries: {
      personQueries: [{ ref: 'p', query: 'Unresolved person', operation: 'add' }],
      keywordQueries: [],
    },
  });
}

describe('genre and keyword ID-set semantics', () => {
  // Statement coverage: deduplication precedes list limits and preserves first occurrence without mutation.
  it('normalizes repeated genre and keyword IDs before counting criteria', () => {
    const input = { genreIds: [878, 28, 878, 28], keywordIds: [402, 301, 402, 301] };
    const snapshot = structuredClone(input);
    const filters = SearchFiltersSchema.parse(input);

    expect(filters.genreIds).toEqual([878, 28]);
    expect(filters.keywordIds).toEqual([402, 301]);
    expect(input).toEqual(snapshot);
  });

  // Branch coverage: reordered and repeated sets are not an effective search-state change.
  it('preserves state and revision for reordered or repeated IDs', () => {
    const state = populatedState();
    const snapshot = structuredClone(state);
    const result = applyIntent(state, {
      status: 'ready',
      baseRevision: 4,
      changes: [
        { field: 'genreIds', operation: 'set', value: [28, 878, 28, 878] },
        { field: 'keywordIds', operation: 'replace', value: [301, 402, 301, 402] },
      ],
    });

    expect(result).toEqual({ status: 'unchanged', reason: 'no-effective-change' });
    expect(state).toEqual(snapshot);
  });

  // Statement coverage: genuinely changed sets are normalized and applied atomically with one revision increment.
  it('applies changed ID sets once while preserving unrelated criteria', () => {
    const state = populatedState();
    const snapshot = structuredClone(state);
    const result = applyIntent(state, {
      status: 'ready',
      baseRevision: 4,
      changes: [
        { field: 'genreIds', operation: 'set', value: [28, 18, 28, 18] },
        { field: 'keywordIds', operation: 'replace', value: [550, 301, 402, 550] },
      ],
    });

    expect(result).toEqual({
      status: 'applied',
      state: {
        ...snapshot,
        revision: 5,
        filters: { ...snapshot.filters, genreIds: [28, 18], keywordIds: [550, 301, 402] },
      },
    });
    expect(state).toEqual(snapshot);
  });

  // Branch coverage: another effective filter change must not reorder an unchanged ID set.
  it('retains stored ID order when only the rating changes effectively', () => {
    const state = populatedState();
    const snapshot = structuredClone(state);
    const result = applyIntent(state, {
      status: 'ready',
      baseRevision: 4,
      changes: [
        { field: 'genreIds', operation: 'set', value: [28, 878] },
        { field: 'keywordIds', operation: 'replace', value: [301, 402, 301] },
        { field: 'minRating', operation: 'set', value: 8 },
      ],
    });

    expect(result).toEqual({
      status: 'applied',
      state: { ...snapshot, revision: 5, filters: { ...snapshot.filters, minRating: 8 } },
    });
    expect(state).toEqual(snapshot);
  });
});
