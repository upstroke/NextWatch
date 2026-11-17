import { describe, expect, it } from 'vitest';
import { MAX_PERSON_IDS } from '@lib/config/domain';
import { applyParserProposal } from '@lib/domain/search/apply-parser-proposal';
import { createInitialSearchState } from '@lib/domain/search/create-initial-search-state';
import { buildParserInput } from '@lib/parser/build-parser-input';
import type { ParserInputBindings } from '@lib/parser/build-parser-input';
import { validateParserResponse } from '@lib/parser/validate-parser-response';
import { SearchStateSchema } from '@lib/schemas/search-state';

function draft() {
  return SearchStateSchema.parse({
    ...createInitialSearchState(), mode: 'discover', revision: 12,
    filters: { genreIds: [103], minYear: 2010, minRating: 7 },
    inactiveGenres: [{ id: 101, position: 1 }],
    people: [{ id: 501, name: 'Accepted' }],
    pendingQueries: {
      personQueries: [
        { ref: 'person-add', query: 'Shared', operation: 'add' },
        { ref: 'person-replace', query: 'Shared', operation: 'replace', targetPersonId: 501 },
      ],
      keywordQueries: [{ ref: 'keyword-add', query: 'Shared' }],
    },
  });
}

function bindingsFor(state = draft()) {
  const prepared = buildParserInput({ userText: 'Korrigieren', state });
  if (prepared.status !== 'prepared') throw new Error('Expected prepared input');
  return prepared.bindings;
}

function apply(operations: unknown[], state = draft(), pendingBindings: unknown = bindingsFor(state)) {
  return applyParserProposal(state, { status: 'ready', pendingOperations: operations }, {
    expectedRevision: state.revision, personRefs: [], keywordRefs: [], pendingBindings,
  });
}

describe('bound pending proposal application', () => {
  it('composes real preparation, response validation and replacement refinement', () => {
    const state = draft();
    const before = structuredClone(state);
    const bindings = bindingsFor(state);
    const bindingSnapshot = structuredClone(bindings);
    const response = validateParserResponse(JSON.stringify({
      status: 'ready', pendingOperations: [
        { operation: 'refine', targetKey: 'person-2', query: ' Bryan Cranston ' },
      ],
    }));
    if (response.status !== 'valid') throw new Error('Expected valid response');
    const result = applyParserProposal(state, response.proposal, {
      expectedRevision: 12, personRefs: [], keywordRefs: [], pendingBindings: bindings,
    });
    expect(result).toMatchObject({
      status: 'applied', state: { revision: 13 },
      pendingInvalidation: { sourceRevision: 12, refs: ['person-add', 'person-replace', 'keyword-add'] },
    });
    if (result.status !== 'applied') throw new Error('Expected application');
    expect(result.state).toEqual({
      ...before, revision: 13,
      pendingQueries: { ...before.pendingQueries, personQueries: [
        before.pendingQueries.personQueries[0],
        { ref: 'person-replace', query: 'Bryan Cranston', operation: 'replace', targetPersonId: 501 },
      ] },
    });
    expect(state).toEqual(before);
    expect(bindings).toEqual(bindingSnapshot);
  });

  it.each(['person-1', 'person-2', 'keyword-1'])('discards only %s and retains accepted sources', (targetKey) => {
    const state = draft();
    const before = structuredClone(state);
    const binding = bindingsFor(state).pendingTargets.find((entry) => entry.targetKey === targetKey);
    if (!binding) throw new Error('Expected target');
    const result = apply([{ operation: 'discard', targetKey }], state);
    if (result.status !== 'applied') throw new Error('Expected application');
    expect(result.state).toEqual({
      ...before, revision: 13,
      pendingQueries: {
        personQueries: before.pendingQueries.personQueries.filter((entry) => entry.ref !== binding.ref),
        keywordQueries: before.pendingQueries.keywordQueries.filter((entry) => entry.ref !== binding.ref),
      },
    });
    expect(state).toEqual(before);
  });

  it('refines person and keyword siblings in one proposal without mixing equal texts', () => {
    const state = draft();
    const result = apply([
      { operation: 'refine', targetKey: 'person-1', query: 'Person detail' },
      { operation: 'refine', targetKey: 'keyword-1', query: 'Keyword detail' },
    ], state);
    if (result.status !== 'applied') throw new Error('Expected application');
    expect(result.state.revision).toBe(14);
    expect(result.state.pendingQueries.personQueries[0]).toEqual({
      ref: 'person-add', query: 'Person detail', operation: 'add',
    });
    expect(result.state.pendingQueries.personQueries[1]).toEqual(state.pendingQueries.personQueries[1]);
    expect(result.state.pendingQueries.keywordQueries[0]).toEqual({
      ref: 'keyword-add', query: 'Keyword detail',
    });
  });

  it('keeps normalized ineffective refinements revision-neutral', () => {
    const state = draft();
    const before = structuredClone(state);
    expect(apply([
      { operation: 'refine', targetKey: 'person-1', query: ' Shared ' },
      { operation: 'refine', targetKey: 'keyword-1', query: 'Shared' },
    ], state)).toEqual({ status: 'unchanged', reason: 'no-effective-change' });
    expect(state).toEqual(before);
  });

  it('rejects an unoffered target before exposing any valid sibling edit', () => {
    const state = draft();
    const before = structuredClone(state);
    const result = apply([
      { operation: 'discard', targetKey: 'person-1' },
      { operation: 'discard', targetKey: 'person-999' },
    ], state);
    expect(result).toMatchObject({ status: 'rejected', reason: 'invalid-bindings' });
    expect(result).not.toHaveProperty('state');
    expect(state).toEqual(before);
  });

  it.each([null, {}, { expectedRevision: 12, pendingTargets: [] }])('rejects malformed or incomplete bindings %j', (bindings) => {
    const result = apply([{ operation: 'discard', targetKey: 'person-1' }], draft(), bindings);
    expect(result).toMatchObject({ status: 'rejected', reason: 'invalid-bindings' });
    expect(result).not.toHaveProperty('state');
  });

  it.each(['swapped-ref', 'wrong-entity', 'duplicate-key'])('rejects inconsistent mapping: %s', (kind) => {
    const state = draft();
    const bindings = bindingsFor(state);
    const first = bindings.pendingTargets[0];
    const second = bindings.pendingTargets[1];
    if (!first || !second) throw new Error('Expected targets');
    if (kind === 'swapped-ref') first.ref = second.ref;
    if (kind === 'wrong-entity') first.entity = 'keyword';
    if (kind === 'duplicate-key') second.targetKey = first.targetKey;
    expect(apply([{ operation: 'discard', targetKey: 'person-1' }], state, bindings))
      .toMatchObject({ status: 'rejected', reason: 'invalid-bindings' });
  });

  it('rejects original bindings made stale even if the outer revision is rewritten', () => {
    const state = draft();
    const original = bindingsFor(state);
    const current = SearchStateSchema.parse({ ...state, revision: 13 });
    expect(apply([{ operation: 'discard', targetKey: 'person-1' }], current, original))
      .toMatchObject({ status: 'rejected', reason: 'stale-revision' });
    const result = applyParserProposal(current, {
      status: 'ready', pendingOperations: [{ operation: 'discard', targetKey: 'person-1' }],
    }, { expectedRevision: 12, personRefs: [], keywordRefs: [], pendingBindings: original });
    expect(result).toMatchObject({ status: 'rejected', reason: 'stale-revision' });
  });

  it('commits filters, pending edits and new additions together', () => {
    const state = draft();
    const result = applyParserProposal(state, {
      status: 'ready',
      changes: [{ field: 'minRating', operation: 'set', value: 8 }],
      pendingOperations: [{ operation: 'discard', targetKey: 'person-1' }],
      people: ['New person'],
    }, {
      expectedRevision: 12, personRefs: ['fresh-person'], keywordRefs: [],
      pendingBindings: bindingsFor(state),
    });
    if (result.status !== 'applied') throw new Error('Expected application');
    expect(result.state.revision).toBe(15);
    expect(result.state.filters.minRating).toBe(8);
    expect(result.state.people).toEqual(state.people);
    expect(result.state.pendingQueries.personQueries).toEqual([
      state.pendingQueries.personQueries[1],
      { ref: 'fresh-person', query: 'New person', operation: 'add' },
    ]);
  });

  it('exposes no partial changes when a later addition exceeds capacity', () => {
    const state = draft();
    const before = structuredClone(state);
    const result = applyParserProposal(state, {
      status: 'ready',
      changes: [{ field: 'minRating', operation: 'set', value: 8 }],
      pendingOperations: [{ operation: 'refine', targetKey: 'person-2', query: 'Changed' }],
      people: Array.from({ length: MAX_PERSON_IDS }, (_, index) => `New ${index}`),
    }, {
      expectedRevision: 12, keywordRefs: [], pendingBindings: bindingsFor(state),
      personRefs: Array.from({ length: MAX_PERSON_IDS }, (_, index) => `fresh-${index}`),
    });
    expect(result).toMatchObject({ status: 'rejected', reason: 'invalid-pending-command' });
    expect(result).not.toHaveProperty('state');
    expect(result).not.toHaveProperty('pendingInvalidation');
    expect(state).toEqual(before);
  });

  it('does not recycle a removed reference as a fresh addition in the same proposal', () => {
    const state = draft();
    expect(applyParserProposal(state, {
      status: 'ready', pendingOperations: [{ operation: 'discard', targetKey: 'person-1' }],
      people: ['New'],
    }, {
      expectedRevision: 12, personRefs: ['person-add'], keywordRefs: [],
      pendingBindings: bindingsFor(state),
    })).toMatchObject({ status: 'rejected', reason: 'invalid-bindings' });
  });

  it.each(['needs_clarification', 'unsupported'])('retains %s proposals without applying pending edits', (status) => {
    const state = draft();
    const before = structuredClone(state);
    const result = applyParserProposal(state, {
      status, message: 'Clarify',
      pendingOperations: [{ operation: 'discard', targetKey: 'person-1' }],
    }, { expectedRevision: 12, personRefs: [], keywordRefs: [], pendingBindings: bindingsFor(state) });
    expect(result).toMatchObject({ status: 'blocked', proposal: { status } });
    expect(state).toEqual(before);
  });

  it('reports revision invalidation even when the pending refinement itself is ineffective', () => {
    const state = draft();
    const pendingBindings: ParserInputBindings = bindingsFor(state);
    const result = applyParserProposal(state, {
      status: 'ready', changes: [{ field: 'minRating', operation: 'set', value: 8 }],
      pendingOperations: [{ operation: 'refine', targetKey: 'person-1', query: 'Shared' }],
    }, { expectedRevision: 12, personRefs: [], keywordRefs: [], pendingBindings });
    expect(result).toMatchObject({
      status: 'applied', state: { revision: 13 },
      pendingInvalidation: { sourceRevision: 12, refs: ['person-add', 'person-replace', 'keyword-add'] },
    });
  });
});
