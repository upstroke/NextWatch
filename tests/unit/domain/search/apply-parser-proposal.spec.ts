import { describe, expect, it } from 'vitest';
import { MAX_PERSON_IDS } from '@lib/config/domain';
import { applyParserProposal } from '@lib/domain/search/apply-parser-proposal';
import { SearchStateSchema } from '@lib/schemas/search-state';
import type { SearchState } from '@lib/schemas/search-state';

const catalogs = {
  movie: [{ id: 101, name: 'Movie genre' }, { id: 103, name: 'Shared genre' }],
  tv: [{ id: 102, name: 'TV genre' }, { id: 103, name: 'Shared genre' }],
};
function draft(overrides: Partial<SearchState> = {}) {
  return SearchStateSchema.parse({ mode: 'trending', revision: 0, filters: {}, ...overrides });
}
function bindings(expectedRevision = 0, personRefs: string[] = [], keywordRefs: string[] = []) {
  return { expectedRevision, personRefs, keywordRefs, genreCatalogs: catalogs };
}
function ready(changes: unknown[] = [], people: string[] = [], keywords: string[] = []) {
  return { status: 'ready', changes, people, keywords };
}

describe('applyParserProposal', () => {
  // Statement coverage: mixed changes use real transitions, keep all and retain individual revision increments.
  it('applies filters and unresolved AND additions without mutating inputs', () => {
    const source = draft();
    const proposal = ready([
      { field: 'genreIds', operation: 'add', value: [103] },
      { field: 'minYear', operation: 'set', value: 2010 },
      { field: 'minRating', operation: 'set', value: 7 },
    ], ['First Person', 'Second Person'], ['time travel']);
    const context = bindings(0, ['p-1', 'p-2'], ['k-1']);
    const before = structuredClone({ source, proposal, context });
    const result = applyParserProposal(source, proposal, context);
    expect(result).toMatchObject({ status: 'applied', state: {
      mode: 'discover', revision: 4, people: [],
      filters: { mediaType: 'all', genreIds: [103], minYear: 2010, minRating: 7 },
      pendingQueries: {
        personQueries: [
          { ref: 'p-1', query: 'First Person', operation: 'add' },
          { ref: 'p-2', query: 'Second Person', operation: 'add' },
        ],
        keywordQueries: [{ ref: 'k-1', query: 'time travel' }],
      },
    } });
    expect({ source, proposal, context }).toEqual(before);
    if (result.status !== 'applied') throw new Error('Expected applied');
    result.state.pendingQueries.personQueries[0]!.query = 'Changed';
    expect({ source, proposal, context }).toEqual(before);
  });
  // Branch coverage: media round trips reuse inactive-genre restoration and retain accepted/pending people.
  it('preserves wishes through Movie to TV to Movie', () => {
    const source = draft({ mode: 'discover', revision: 3,
      filters: { mediaType: 'movie', genreIds: [101], keywordIds: [], sortBy: 'popularity.desc' },
      people: [{ id: 501, name: 'Accepted' }],
      pendingQueries: { personQueries: [{ ref: 'old', query: 'Pending', operation: 'add' }], keywordQueries: [] },
    });
    const tv = applyParserProposal(source, ready([{ field: 'mediaType', operation: 'set', value: 'tv' }]), bindings(3));
    expect(tv).toMatchObject({ status: 'applied', state: {
      filters: { mediaType: 'tv', genreIds: [] }, inactiveGenres: [{ id: 101, position: 0 }],
      people: source.people, pendingQueries: source.pendingQueries,
    }, mediaChange: { from: 'movie', to: 'tv' } });
    if (tv.status !== 'applied') throw new Error('Expected TV state');
    const movie = applyParserProposal(tv.state, ready([{ field: 'mediaType', operation: 'set', value: 'movie' }]), bindings(4));
    expect(movie).toMatchObject({ status: 'applied', state: {
      revision: 5, filters: source.filters, people: source.people, pendingQueries: source.pendingQueries,
    } });
    if (movie.status !== 'applied') throw new Error('Expected Movie state');
    expect(movie.state).not.toHaveProperty('inactiveGenres');
  });
  // Branch coverage: absent fields and normalized no-ops do not advance revision.
  it('preserves TV on follow-up and reports a no-op', () => {
    const source = draft({ mode: 'discover', filters: { mediaType: 'tv', genreIds: [], keywordIds: [], sortBy: 'popularity.desc' } });
    expect(applyParserProposal(source, ready(), bindings())).toEqual({ status: 'unchanged', reason: 'no-effective-change' });
    const result = applyParserProposal(source, ready([{ field: 'minRating', operation: 'set', value: 7 }]), bindings());
    expect(result).toMatchObject({ status: 'applied', state: { filters: { mediaType: 'tv', minRating: 7 } } });
  });
  // Branch coverage: explicit null removes an optional scalar through the existing intent contract.
  it('removes a year bound without clearing unrelated criteria', () => {
    const source = draft({ mode: 'discover', filters: { mediaType: 'all', genreIds: [], keywordIds: [], minYear: 2010, minRating: 7, sortBy: 'popularity.desc' } });
    const result = applyParserProposal(source, ready([{ field: 'minYear', operation: 'remove', value: null }]), bindings());
    if (result.status !== 'applied') throw new Error('Expected applied');
    expect(result.state.filters).not.toHaveProperty('minYear');
    expect(result.state.filters.minRating).toBe(7);
  });
  // Branch coverage: unresolved compound work is retained without partially applying independent fields.
  it.each(['needs_clarification', 'unsupported'])('retains a %s proposal', (status) => {
    const source = draft();
    const proposal = { ...ready([{ field: 'minRating', operation: 'set', value: 7 }]), status, message: 'Clarify the replacement' };
    expect(applyParserProposal(source, proposal, bindings())).toMatchObject({ status: 'blocked', proposal });
    expect(source).toEqual(draft());
  });
  // Branch coverage: invalid input and stale authority expose no candidate state.
  it.each([
    { input: { status: 'ready', baseRevision: 0 }, context: bindings(), reason: 'invalid-proposal' },
    { input: ready(), context: bindings(1), reason: 'stale-revision' },
    { input: ready([], ['Person']), context: bindings(), reason: 'invalid-bindings' },
    { input: ready([], ['One', 'Two']), context: bindings(0, ['same', 'same']), reason: 'invalid-bindings' },
    { input: ready([], ['Person']), context: bindings(0, ['bad ref']), reason: 'invalid-bindings' },
  ])('rejects $reason without mutation', ({ input, context, reason }) => {
    const source = draft();
    expect(applyParserProposal(source, input, context)).toMatchObject({ status: 'rejected', reason, proposal: input });
    expect(source).toEqual(draft());
  });
  // Branch coverage: new references cannot collide with either existing pending kind.
  it('rejects an existing reference across entity kinds', () => {
    const source = draft({ mode: 'discover', pendingQueries: { personQueries: [], keywordQueries: [{ ref: 'used', query: 'Existing' }] } });
    expect(applyParserProposal(source, ready([], ['Person']), bindings(0, ['used']))).toMatchObject({ status: 'rejected', reason: 'invalid-bindings' });
  });
  // Branch coverage: later capacity rejection rolls back earlier private filter changes.
  it('rejects overflow without exposing a partially updated state', () => {
    const source = draft({ mode: 'discover', people: Array.from({ length: MAX_PERSON_IDS }, (_, index) => ({ id: index + 1, name: `Person ${index}` })) });
    const before = structuredClone(source);
    const result = applyParserProposal(source, ready([{ field: 'minRating', operation: 'set', value: 8 }], ['Extra']), bindings(0, ['extra']));
    expect(result).toMatchObject({ status: 'rejected', reason: 'invalid-pending-command' });
    expect(result).not.toHaveProperty('state');
    expect(source).toEqual(before);
  });
  // Branch coverage: final cross-field rules reject contradictory years atomically.
  it('rejects a contradictory range', () => {
    expect(applyParserProposal(draft(), ready([
      { field: 'minYear', operation: 'set', value: 2020 },
      { field: 'maxYear', operation: 'set', value: 2010 },
    ]), bindings())).toMatchObject({ status: 'rejected', reason: 'invalid-change' });
  });
  // Branch coverage: genre IDs require trusted catalogs and cannot be guessed or silently reinterpreted.
  it.each([
    { id: 999, context: bindings(), status: 'rejected', reason: 'unknown-genre' },
    { id: 103, context: { ...bindings(), genreCatalogs: undefined }, status: 'rejected', reason: 'invalid-genre-catalogs' },
    { id: 101, context: bindings(), status: 'blocked', reason: 'unsupported-genre-scope' },
  ])('reports $reason', ({ id, context, status, reason }) => {
    const source = draft({ mode: 'discover', filters: { mediaType: 'tv', genreIds: [], keywordIds: [], sortBy: 'popularity.desc' } });
    const proposal = ready([{ field: 'genreIds', operation: 'add', value: [id] }]);
    expect(applyParserProposal(source, proposal, context)).toMatchObject({ status, reason, proposal });
    expect(source.filters.genreIds).toEqual([]);
  });
  // Branch coverage: removals may target known genres outside the selected media scope.
  it('removes an inactive genre without inventing a replacement', () => {
    const source = draft({ mode: 'discover', filters: { mediaType: 'tv', genreIds: [], keywordIds: [], sortBy: 'popularity.desc' }, inactiveGenres: [{ id: 101, position: 0 }] });
    const result = applyParserProposal(source, ready([{ field: 'genreIds', operation: 'remove', value: [101] }]), bindings());
    expect(result).toMatchObject({ status: 'applied' });
    if (result.status !== 'applied') throw new Error('Expected applied');
    expect(result.state).not.toHaveProperty('inactiveGenres');
  });
});
