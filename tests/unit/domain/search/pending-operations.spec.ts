import { describe, expect, it } from 'vitest';
import { MAX_PERSON_IDS, MAX_KEYWORD_IDS } from '@lib/config/domain';
import { SearchStateSchema } from '@lib/schemas/search-state';
import { createInitialSearchState } from '@lib/domain/search/create-initial-search-state';
import { applyPendingQueryCommand, acceptResolvedPerson } from '@lib/domain/search/pending-operations';
import type { PendingTransitionResult } from '@lib/domain/search/pending-operations';

function applied(result: PendingTransitionResult) {
  expect(result.status).toBe('applied');
  if (result.status !== 'applied') throw new Error('Expected an applied transition');
  return result.state;
}

function personState(operation: 'add' | 'replace' = 'add') {
  const request = operation === 'add'
    ? { ref: 'p', query: 'Unresolved person', operation }
    : { ref: 'p', query: 'Replacement person', operation, targetPersonId: 1 };
  return SearchStateSchema.parse({
    mode: 'discover', revision: 4, filters: { genreIds: [878] },
    people: [{ id: 1, name: 'A' }, { id: 2, name: 'B' }],
    pendingQueries: {
      personQueries: [request, { ref: 'other', query: 'Other person', operation: 'add' }],
      keywordQueries: [{ ref: 'k', query: 'space' }],
    },
  });
}

describe('controlled pending and person transitions', () => {
  // Statement coverage: adding either request kind activates discover once without applying an ID.
  it.each(['person', 'keyword'])('adds a pending %s with a stable reference', (entity) => {
    const state = createInitialSearchState();
    const snapshot = structuredClone(state);
    const request = entity === 'person'
      ? { ref: 'request', query: ' Example ', operation: 'add' }
      : { ref: 'request', query: ' Example ' };
    const next = applied(applyPendingQueryCommand(state, { entity, operation: 'add', baseRevision: 0, request }));
    expect(next.mode).toBe('discover');
    expect(next.revision).toBe(1);
    const requests = entity === 'person' ? next.pendingQueries.personQueries : next.pendingQueries.keywordQueries;
    expect(requests).toEqual([{ ...request, query: 'Example' }]);
    expect(next.filters).toEqual(state.filters);
    expect(next.people).toEqual([]);
    expect(state).toEqual(snapshot);
  });

  // Branch coverage: changing normalized query text preserves its reference; an ineffective retry preserves revision.
  it.each(['person', 'keyword'])('changes a %s request without replacing its reference', (entity) => {
    const request = entity === 'person' ? { ref: 'request', query: 'Before', operation: 'add' } : { ref: 'request', query: 'Before' };
    const state = applied(applyPendingQueryCommand(createInitialSearchState(), { entity, operation: 'add', baseRevision: 0, request }));
    const snapshot = structuredClone(state);
    const command = { entity, operation: 'change', baseRevision: 1, request: { ...request, query: ' After ' } };
    const next = applied(applyPendingQueryCommand(state, command));
    expect(next.revision).toBe(2);
    const requests = entity === 'person' ? next.pendingQueries.personQueries : next.pendingQueries.keywordQueries;
    expect(requests).toEqual([{ ...request, query: 'After' }]);
    expect(applyPendingQueryCommand(next, { ...command, baseRevision: 2 })).toEqual({ status: 'unchanged', reason: 'no-effective-change' });
    expect(state).toEqual(snapshot);
  });

  // Branch coverage: removal of the last pending criterion restores trending for either entity kind.
  it.each(['person', 'keyword'])('removes the final %s request', (entity) => {
    const request = entity === 'person' ? { ref: 'request', query: 'Example', operation: 'add' } : { ref: 'request', query: 'Example' };
    const state = applied(applyPendingQueryCommand(createInitialSearchState(), { entity, operation: 'add', baseRevision: 0, request }));
    const snapshot = structuredClone(state);
    const next = applied(applyPendingQueryCommand(state, { entity, operation: 'remove', baseRevision: 1, ref: 'request' }));
    expect(next.mode).toBe('trending');
    expect(next.revision).toBe(2);
    expect(next.pendingQueries).toEqual({ personQueries: [], keywordQueries: [] });
    expect(state).toEqual(snapshot);
  });

  // Statement coverage: replacement intent can be changed while the accepted target and unrelated criteria remain.
  it('changes an addition into a pending replacement without applying an identity', () => {
    const state = personState();
    const snapshot = structuredClone(state);
    const next = applied(applyPendingQueryCommand(state, { entity: 'person', operation: 'change', baseRevision: 4,
      request: { ref: 'p', query: 'Replacement', operation: 'replace', targetPersonId: 1 } }));
    expect(next.people).toEqual(state.people);
    expect(next.filters).toEqual(state.filters);
    expect(next.pendingQueries.personQueries).toEqual([{ ref: 'p', query: 'Replacement', operation: 'replace', targetPersonId: 1 }, state.pendingQueries.personQueries[1]]);
    expect(next.revision).toBe(5);
    expect(state).toEqual(snapshot);
  });

  // Branch coverage: stale commands and resolution outcomes cannot alter the current state.
  it('rejects outdated additions, changes, removals and person acceptance', () => {
    const state = personState();
    const snapshot = structuredClone(state);
    for (const operation of ['add', 'change', 'remove']) {
      const command = operation === 'remove'
        ? { entity: 'person', operation, baseRevision: 3, ref: 'p' }
        : { entity: 'person', operation, baseRevision: 3, request: { ref: 'p', query: 'Late', operation: 'add' } };
      expect(applyPendingQueryCommand(state, command)).toEqual({ status: 'rejected', reason: 'stale-revision' });
    }
    expect(acceptResolvedPerson(state, { ref: 'p', sourceRevision: 3, person: { id: 3, name: 'Late' } }))
      .toEqual({ status: 'rejected', reason: 'stale-revision' });
    expect(state).toEqual(snapshot);
  });

  // Branch coverage: references are associated with an entity kind and cannot be reused by an addition.
  it('rejects unknown, wrong-kind and occupied request references', () => {
    const state = personState();
    const snapshot = structuredClone(state);
    expect(applyPendingQueryCommand(state, { entity: 'person', operation: 'add', baseRevision: 4, request: { ref: 'k', query: 'Duplicate ref', operation: 'add' } }))
      .toEqual({ status: 'rejected', reason: 'reference-in-use' });
    expect(applyPendingQueryCommand(state, { entity: 'keyword', operation: 'change', baseRevision: 4, request: { ref: 'p', query: 'Wrong kind' } }))
      .toEqual({ status: 'rejected', reason: 'unknown-request' });
    expect(applyPendingQueryCommand(state, { entity: 'person', operation: 'remove', baseRevision: 4, ref: 'missing' }))
      .toEqual({ status: 'rejected', reason: 'unknown-request' });
    expect(acceptResolvedPerson(state, { ref: 'k', sourceRevision: 4, person: { id: 3, name: 'Wrong request' } }))
      .toEqual({ status: 'rejected', reason: 'unknown-request' });
    expect(state).toEqual(snapshot);
  });

  // Branch coverage: domain acceptance enforces shared limits and valid replacement targets atomically.
  it('rejects over-limit additions and invalid replacement targets without changing criteria', () => {
    const full = SearchStateSchema.parse({ mode: 'discover', revision: 0,
      filters: { keywordIds: Array.from({ length: MAX_KEYWORD_IDS }, (_, index) => index + 1) },
      people: Array.from({ length: MAX_PERSON_IDS }, (_, index) => ({ id: index + 1, name: `Person ${index}` })) });
    const snapshot = structuredClone(full);
    const commands = [
      { entity: 'person', operation: 'add', baseRevision: 0, request: { ref: 'p', query: 'Extra', operation: 'add' } },
      { entity: 'keyword', operation: 'add', baseRevision: 0, request: { ref: 'k', query: 'Extra' } },
      { entity: 'person', operation: 'add', baseRevision: 0, request: { ref: 'p', query: 'Replacement', operation: 'replace', targetPersonId: 999 } },
    ];
    for (const command of commands) expect(applyPendingQueryCommand(full, command)).toEqual({ status: 'rejected', reason: 'invalid-value' });
    expect(full).toEqual(snapshot);
  });

  // Statement coverage: unique resolution removes only its request and copies accepted and unrelated records.
  it('accepts a resolved addition atomically with mutation isolation', () => {
    const state = personState();
    const snapshot = structuredClone(state);
    const next = applied(acceptResolvedPerson(state, { ref: 'p', sourceRevision: 4, person: { id: 3, name: ' C ' } }));
    expect(next.people).toEqual([...state.people, { id: 3, name: 'C' }]);
    expect(next.pendingQueries.personQueries).toEqual([state.pendingQueries.personQueries[1]]);
    expect(next.pendingQueries.keywordQueries).toEqual(state.pendingQueries.keywordQueries);
    expect(next.filters).toEqual(state.filters);
    expect(next.mode).toBe('discover');
    expect(next.revision).toBe(5);
    const person = next.people[0];
    const pending = next.pendingQueries.personQueries[0];
    const keyword = next.pendingQueries.keywordQueries[0];
    if (!person || !pending || !keyword) throw new Error('Expected preserved records');
    person.name = 'Changed'; pending.query = 'Changed'; keyword.query = 'Changed';
    next.filters.genreIds.push(28);
    expect(state).toEqual(snapshot);
  });

  // Branch coverage: duplicate addition still removes the pending request and increments revision once.
  it('deduplicates a resolved addition by ID while retaining the accepted display name', () => {
    const state = personState();
    const next = applied(acceptResolvedPerson(state, { ref: 'p', sourceRevision: 4, person: { id: 2, name: 'Other spelling' } }));
    expect(next.people).toEqual(state.people);
    expect(next.pendingQueries.personQueries.map((request) => request.ref)).toEqual(['other']);
    expect(next.revision).toBe(5);
  });

  // Branch coverage: replacements handle new, duplicate and identical identities with one atomic revision change.
  it.each([
    { person: { id: 3, name: 'C' }, expected: [{ id: 3, name: 'C' }, { id: 2, name: 'B' }] },
    { person: { id: 2, name: 'Other B' }, expected: [{ id: 2, name: 'B' }] },
    { person: { id: 1, name: 'Other A' }, expected: [{ id: 1, name: 'A' }, { id: 2, name: 'B' }] },
  ])('accepts replacement with identity $person.id', ({ person, expected }) => {
    const state = personState('replace');
    const snapshot = structuredClone(state);
    const next = applied(acceptResolvedPerson(state, { ref: 'p', sourceRevision: 4, person }));
    expect(next.people).toEqual(expected);
    expect(next.revision).toBe(5);
    expect(next.pendingQueries.personQueries.map((request) => request.ref)).toEqual(['other']);
    expect(next.pendingQueries.keywordQueries).toEqual(state.pendingQueries.keywordQueries);
    expect(next.filters).toEqual(state.filters);
    expect(state).toEqual(snapshot);
    expect(acceptResolvedPerson(next, { ref: 'p', sourceRevision: 5, person }))
      .toEqual({ status: 'rejected', reason: 'unknown-request' });
  });
});
