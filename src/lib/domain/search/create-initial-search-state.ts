import type { SearchState } from '@lib/schemas/search-state';

/**
 * Creates an independent initial domain state without individual search criteria.
 * @returns A trending state at revision zero with default filters and empty pending queries.
 */
export function createInitialSearchState(): SearchState {
  return {
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
  };
}
