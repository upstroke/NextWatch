import { describe, expect, it } from 'vitest';
import { ActiveSearchFiltersSchema, SearchStateSchema } from '@lib/schemas/search-state';
import { createInitialSearchState } from '@lib/domain/search/create-initial-search-state';
import { deriveActiveSearchFilters } from '@lib/domain/search/derive-active-search-filters';

function populatedState() {
  return SearchStateSchema.parse({
    mode: 'discover',
    revision: 7,
    filters: {
      mediaType: 'tv',
      sortBy: 'vote_average.desc',
      genreIds: [878, 28],
      keywordIds: [301],
      minRating: 7,
      minYear: 2000,
      maxYear: 2020,
    },
    people: [
      { id: 502, name: 'Second person' },
      { id: 501, name: 'First person' },
    ],
    pendingQueries: { personQueries: ['Unresolved person'], keywordQueries: ['space'] },
  });
}

describe('deriveActiveSearchFilters', () => {
  // Statement coverage: an initial state projects to default technical filters without inventing IDs.
  it('derives empty person IDs from an initial state', () => {
    const state = createInitialSearchState();
    const result = deriveActiveSearchFilters(state);
    expect(result).toEqual({ ...state.filters, personIds: [] });
    expect(ActiveSearchFiltersSchema.parse(result)).toEqual(result);
    expect(state.filters).not.toHaveProperty('personIds');
  });

  // Statement coverage: preserve filters and accepted-person order without applying pending queries or metadata.
  it('projects only accepted IDs and existing filters without changing state', () => {
    const state = populatedState();
    const snapshot = structuredClone(state);
    const result = deriveActiveSearchFilters(state);
    expect(result).toEqual({
      mediaType: 'tv',
      sortBy: 'vote_average.desc',
      genreIds: [878, 28],
      keywordIds: [301],
      personIds: [502, 501],
      minRating: 7,
      minYear: 2000,
      maxYear: 2020,
    });
    expect(ActiveSearchFiltersSchema.parse(result)).toEqual(result);
    expect(state).toEqual(snapshot);
    expect(state.filters).not.toHaveProperty('personIds');
  });

  // Statement coverage: pending-only names and terms never become active ID filters.
  it('does not convert pending-only criteria into IDs', () => {
    const state = SearchStateSchema.parse({
      mode: 'discover',
      revision: 1,
      filters: {},
      pendingQueries: { personQueries: ['Unresolved person'], keywordQueries: ['space'] },
    });
    expect(deriveActiveSearchFilters(state)).toEqual({
      mediaType: 'all',
      sortBy: 'popularity.desc',
      genreIds: [],
      keywordIds: [],
      personIds: [],
    });
  });

  // Statement coverage: each projection has independent mutable arrays and cannot mutate its source.
  it('creates independent filter objects and ID arrays on every call', () => {
    const state = populatedState();
    const snapshot = structuredClone(state);
    const first = deriveActiveSearchFilters(state);
    const second = deriveActiveSearchFilters(state);
    const secondSnapshot = structuredClone(second);
    expect(first).not.toBe(state.filters);
    expect(first).not.toBe(second);
    expect(first.genreIds).not.toBe(state.filters.genreIds);
    expect(first.keywordIds).not.toBe(state.filters.keywordIds);
    expect(first.genreIds).not.toBe(second.genreIds);
    expect(first.keywordIds).not.toBe(second.keywordIds);
    expect(first.personIds).not.toBe(second.personIds);
    first.genreIds.push(35);
    first.keywordIds.push(402);
    first.personIds.push(503);
    first.minRating = 9;
    expect(state).toEqual(snapshot);
    expect(second).toEqual(secondSnapshot);
    const firstPerson = state.people[0];
    if (!firstPerson) throw new Error('Expected an accepted person');
    firstPerson.id = 504;
    state.filters.genreIds.push(18);
    state.filters.keywordIds.push(550);
    expect(second).toEqual(secondSnapshot);
  });
});
