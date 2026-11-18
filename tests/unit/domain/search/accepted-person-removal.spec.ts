import { describe, expect, it } from 'vitest';
import { applyAcceptedPersonRemoval } from '@lib/domain/search/pending-operations';
import { SearchStateSchema } from '@lib/schemas/search-state';

function lastPersonState() {
  return SearchStateSchema.parse({
    mode: 'discover',
    revision: 4,
    filters: {},
    people: [{ id: 1, name: 'A' }],
  });
}

const replacement = { ref: 'p', query: 'B', operation: 'replace', targetPersonId: 1 } as const;
const addition = { ref: 'add', query: 'A', operation: 'add' } as const;

describe('applyAcceptedPersonRemoval', () => {
  it('returns to trending when removing the last criterion', () => {
    const state = lastPersonState();
    const snapshot = structuredClone(state);

    expect(applyAcceptedPersonRemoval(state, { baseRevision: 4, personId: 1 })).toEqual({
      status: 'applied',
      state: { ...snapshot, people: [], mode: 'trending', revision: 5 },
      removedPersonId: 1,
      removedPendingRefs: [],
    });
    expect(state).toEqual(snapshot);
  });

  it('removes only the chosen person and their pending replacement atomically', () => {
    const otherReplacement = { ...replacement, ref: 'other', targetPersonId: 2 };
    const state = SearchStateSchema.parse({
      ...lastPersonState(),
      filters: { genreIds: [878] },
      people: [{ id: 1, name: 'A' }, { id: 2, name: 'A' }],
      pendingQueries: {
        personQueries: [replacement, addition, otherReplacement],
        keywordQueries: [{ ref: 'k', query: 'space' }],
      },
    });
    const snapshot = structuredClone(state);
    const result = applyAcceptedPersonRemoval(state, { baseRevision: 4, personId: 1 });

    expect(result).toEqual({
      status: 'applied',
      state: {
        ...snapshot,
        revision: 5,
        people: [{ id: 2, name: 'A' }],
        pendingQueries: {
          ...snapshot.pendingQueries,
          personQueries: [addition, otherReplacement],
        },
      },
      removedPersonId: 1,
      removedPendingRefs: ['p'],
    });
    if (result.status !== 'applied') throw new Error('Expected an applied transition');
    for (const person of result.state.people) person.name = 'Changed';
    for (const request of result.state.pendingQueries.personQueries) request.query = 'Changed';
    for (const request of result.state.pendingQueries.keywordQueries) request.query = 'Changed';
    result.state.filters.genreIds.push(28);
    expect(state).toEqual(snapshot);
  });

  it('keeps discover when only an unrelated pending addition remains', () => {
    const state = SearchStateSchema.parse({
      ...lastPersonState(),
      pendingQueries: { personQueries: [replacement, addition], keywordQueries: [] },
    });

    expect(applyAcceptedPersonRemoval(state, { baseRevision: 4, personId: 1 })).toEqual({
      status: 'applied',
      state: {
        ...state,
        revision: 5,
        people: [],
        pendingQueries: { personQueries: [addition], keywordQueries: [] },
      },
      removedPersonId: 1,
      removedPendingRefs: ['p'],
    });
  });

  it.each([
    { input: { baseRevision: 4, personId: 0 }, reason: 'invalid-input' },
    { input: { baseRevision: 4, personId: '1' }, reason: 'invalid-input' },
    { input: { baseRevision: 4, personId: 1, ref: 'p' }, reason: 'invalid-input' },
    { input: { baseRevision: 3, personId: 1 }, reason: 'stale-revision' },
    { input: { baseRevision: 4, personId: 999 }, reason: 'unknown-person' },
  ])('rejects $input with $reason without changing state', ({ input, reason }) => {
    const state = SearchStateSchema.parse({
      ...lastPersonState(),
      pendingQueries: { personQueries: [replacement], keywordQueries: [] },
    });
    const snapshot = structuredClone(state);

    expect(applyAcceptedPersonRemoval(state, input)).toEqual({ status: 'rejected', reason });
    expect(state).toEqual(snapshot);
  });
});
