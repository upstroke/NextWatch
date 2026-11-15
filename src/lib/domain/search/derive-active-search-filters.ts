import type { ActiveSearchFilters, SearchState } from '@lib/schemas/search-state';

/**
 * Projects a validated domain state into independent technical filter data.
 * Person IDs come only from accepted people; pending queries are not applied.
 * This projection neither checks execution readiness nor authorizes a provider request.
 *
 * @param state Current, previously validated domain search state.
 * @returns Technical filters with fresh ID arrays, preserving existing list order.
 */
export function deriveActiveSearchFilters(state: SearchState): ActiveSearchFilters {
  return {
    ...state.filters,
    genreIds: [...state.filters.genreIds],
    keywordIds: [...state.filters.keywordIds],
    personIds: state.people.map((person) => person.id),
  };
}
