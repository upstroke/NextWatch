import { describe, expect, it } from 'vitest';
import { createInitialSearchState } from '@lib/domain/search/create-initial-search-state';

describe('createInitialSearchState', () => {
  // Statement coverage: initial entry has no individual criteria and starts in trending at revision zero.
  it('creates the initial trending state with default filters and empty pending queries', () => {
    expect(createInitialSearchState()).toEqual({
      mode: 'trending',
      revision: 0,
      filters: {
        mediaType: 'all',
        sortBy: 'popularity.desc',
        genreIds: [],
        keywordIds: [],
        personIds: [],
      },
      pendingQueries: {
        personQueries: [],
        keywordQueries: [],
      },
    });
  });

  // Statement coverage: separate searches do not share mutable state, filter lists or pending queries.
  it('creates independent objects and arrays on every call', () => {
    const first = createInitialSearchState();
    const second = createInitialSearchState();
    const snapshot = structuredClone(second);

    expect(first).not.toBe(second);
    expect(first.filters).not.toBe(second.filters);
    expect(first.pendingQueries).not.toBe(second.pendingQueries);
    expect(first.filters.genreIds).not.toBe(second.filters.genreIds);
    expect(first.filters.keywordIds).not.toBe(second.filters.keywordIds);
    expect(first.filters.personIds).not.toBe(second.filters.personIds);
    expect(first.pendingQueries.personQueries).not.toBe(second.pendingQueries.personQueries);
    expect(first.pendingQueries.keywordQueries).not.toBe(second.pendingQueries.keywordQueries);

    first.mode = 'discover';
    first.revision = 1;
    first.filters.mediaType = 'movie';
    first.filters.genreIds.push(878);
    first.filters.keywordIds.push(301);
    first.filters.personIds.push(501);
    first.pendingQueries.personQueries.push('Example person');
    first.pendingQueries.keywordQueries.push('space');

    expect(second).toEqual(snapshot);
  });
});
