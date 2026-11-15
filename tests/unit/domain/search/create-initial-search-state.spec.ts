import { describe, expect, it } from 'vitest';
import { SearchStateSchema } from '@lib/schemas/search-state';
import { createInitialSearchState } from '@lib/domain/search/create-initial-search-state';

describe('createInitialSearchState', () => {
  // Statement coverage: initial entry satisfies the contract without invented criteria.
  it('creates a valid initial trending state with no people or pending queries', () => {
    const state = createInitialSearchState();
    expect(state).toEqual({ mode: 'trending', revision: 0,
      filters: { mediaType: 'all', sortBy: 'popularity.desc', genreIds: [], keywordIds: [] },
      people: [], pendingQueries: { personQueries: [], keywordQueries: [] } });
    expect(SearchStateSchema.parse(state)).toEqual(state);
  });
  // Statement coverage: independent searches share no mutable state or criteria lists.
  it('creates independent objects and arrays on every call', () => {
    const first = createInitialSearchState();
    const second = createInitialSearchState();
    const snapshot = structuredClone(second);
    expect(first).not.toBe(second);
    expect(first.filters).not.toBe(second.filters);
    expect(first.people).not.toBe(second.people);
    expect(first.pendingQueries).not.toBe(second.pendingQueries);
    expect(first.filters.genreIds).not.toBe(second.filters.genreIds);
    expect(first.filters.keywordIds).not.toBe(second.filters.keywordIds);
    expect(first.pendingQueries.personQueries).not.toBe(second.pendingQueries.personQueries);
    expect(first.pendingQueries.keywordQueries).not.toBe(second.pendingQueries.keywordQueries);
    first.mode = 'discover'; first.revision = 1; first.filters.mediaType = 'movie';
    first.filters.genreIds.push(878); first.filters.keywordIds.push(301);
    first.people.push({ id: 501, name: 'Example person' });
    first.pendingQueries.personQueries.push({ ref: 'p', query: 'Another person', operation: 'add' });
    first.pendingQueries.keywordQueries.push({ ref: 'k', query: 'space' });
    expect(second).toEqual(snapshot);
  });
});
