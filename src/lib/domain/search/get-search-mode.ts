import type { SearchMode, SearchState } from '@lib/schemas/search-state';

/**
 * Derives mode from effective criteria, including unresolved requests.
 * Defaults alone mean trending; discover does not authorize search execution.
 * @param state Criteria of a previously validated or candidate domain state.
 * @returns The mode matching those criteria, without changing state.
 */
export function getSearchMode(
  state: Pick<SearchState, 'filters' | 'people' | 'pendingQueries'>,
): SearchMode {
  const { filters, people, pendingQueries } = state;
  const hasCriteria = filters.mediaType !== 'all' || filters.sortBy !== 'popularity.desc' ||
    filters.minRating !== undefined || filters.minYear !== undefined || filters.maxYear !== undefined ||
    filters.genreIds.length > 0 || filters.keywordIds.length > 0 || people.length > 0 ||
    pendingQueries.personQueries.length > 0 || pendingQueries.keywordQueries.length > 0;
  return hasCriteria ? 'discover' : 'trending';
}
