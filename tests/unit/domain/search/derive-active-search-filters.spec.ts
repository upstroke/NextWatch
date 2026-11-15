import { describe, expect, it } from 'vitest';
import { ActiveSearchFiltersSchema, SearchStateSchema } from '@lib/schemas/search-state';
import { createInitialSearchState } from '@lib/domain/search/create-initial-search-state';
import { deriveActiveSearchFilters } from '@lib/domain/search/derive-active-search-filters';

function populatedState() {
  return SearchStateSchema.parse({ mode: 'discover', revision: 7,
    filters: { mediaType: 'tv', sortBy: 'vote_average.desc', genreIds: [878, 28], keywordIds: [301], minRating: 7, minYear: 2000, maxYear: 2020 },
    people: [{ id: 502, name: 'Second person' }, { id: 501, name: 'First person' }],
    pendingQueries: { personQueries: [{ ref: 'p', query: 'Unresolved person', operation: 'add' }], keywordQueries: [{ ref: 'k', query: 'space' }] } });
}

describe('deriveActiveSearchFilters', () => {
  // Statement coverage: default projection does not invent person IDs.
  it('derives empty person IDs from an initial state', () => {
    const state = createInitialSearchState();
    const result = deriveActiveSearchFilters(state);
    expect(result).toEqual({ ...state.filters, personIds: [] });
    expect(ActiveSearchFiltersSchema.parse(result)).toEqual(result);
    expect(state.filters).not.toHaveProperty('personIds');
  });
  // Statement coverage: preserve accepted identity order and filters without applying pending metadata.
  it('projects only accepted IDs and existing filters without changing state', () => {
    const state = populatedState();
    const snapshot = structuredClone(state);
    const result = deriveActiveSearchFilters(state);
    expect(result).toEqual({ mediaType: 'tv', sortBy: 'vote_average.desc', genreIds: [878, 28], keywordIds: [301], personIds: [502, 501], minRating: 7, minYear: 2000, maxYear: 2020 });
    expect(ActiveSearchFiltersSchema.parse(result)).toEqual(result);
    expect(state).toEqual(snapshot);
    expect(state.filters).not.toHaveProperty('personIds');
  });
  // Statement coverage: referenced pending names and terms never become technical IDs.
  it('does not convert pending-only criteria into IDs', () => {
    const state = SearchStateSchema.parse({ mode: 'discover', revision: 1, filters: {},
      pendingQueries: { personQueries: [{ ref: 'p', query: 'Unresolved person', operation: 'add' }], keywordQueries: [{ ref: 'k', query: 'space' }] } });
    expect(deriveActiveSearchFilters(state)).toEqual({ mediaType: 'all', sortBy: 'popularity.desc', genreIds: [], keywordIds: [], personIds: [] });
  });
  // Statement coverage: projections and their source share no mutable arrays in either direction.
  it('creates independent filter objects and ID arrays on every call', () => {
    const state = populatedState();
    const snapshot = structuredClone(state);
    const first = deriveActiveSearchFilters(state);
    const second = deriveActiveSearchFilters(state);
    const secondSnapshot = structuredClone(second);
    expect(first).not.toBe(state.filters); expect(first).not.toBe(second);
    expect(first.genreIds).not.toBe(state.filters.genreIds); expect(first.keywordIds).not.toBe(state.filters.keywordIds);
    expect(first.genreIds).not.toBe(second.genreIds); expect(first.keywordIds).not.toBe(second.keywordIds); expect(first.personIds).not.toBe(second.personIds);
    first.genreIds.push(35); first.keywordIds.push(402); first.personIds.push(503); first.minRating = 9;
    expect(state).toEqual(snapshot); expect(second).toEqual(secondSnapshot);
    const person = state.people[0];
    if (!person) throw new Error('Expected an accepted person');
    person.id = 504; state.filters.genreIds.push(18); state.filters.keywordIds.push(550);
    expect(second).toEqual(secondSnapshot);
  });
});
