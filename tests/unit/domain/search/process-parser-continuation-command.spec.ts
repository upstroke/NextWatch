import { describe, expect, it } from 'vitest';
import { createInitialSearchState } from '@lib/domain/search/create-initial-search-state';
import { processParserContinuationCommand } from '@lib/domain/search/process-parser-continuation-command';
import {
  offerPersonClarification,
  processPersonClarificationAction,
} from '@lib/domain/search/person-clarification-lifecycle';
import {
  issueParserContinuationBinding,
  checkParserContinuationBinding,
} from '@lib/domain/search/parser-continuation-binding';
import { ParserContinuationBindingRegistrySchema } from '@lib/schemas/parser-continuation-binding';
import type { ParserContinuation } from '@lib/schemas/parser-continuation';

function fixture() {
  const state = createInitialSearchState();
  state.mode = 'discover';
  state.revision = 4;
  state.people = [{ id: 501, name: 'Accepted person' }];
  state.pendingQueries.personQueries = [
    { ref: 'p', query: 'Chris', operation: 'add' },
    { ref: 'other', query: 'Brad', operation: 'add' },
  ];
  const continuation: ParserContinuation = { intentions: [
    { ref: 'linked', criterion: 'person', operation: 'add', source: null, generation: 2,
      inputExcerpt: 'Add Chris and Brad', children: [
        { ownership: 'canonical', ref: 'p' }, { ownership: 'canonical', ref: 'other' },
      ] },
    { ref: 'replacement', criterion: 'person', operation: 'replace', generation: 2,
      source: { mode: 'reference', ref: 'accepted' }, inputExcerpt: 'Replace accepted person',
      children: [
        { ownership: 'continuation', ref: 'owned', generation: 1, query: { text: 'Tom', correction: null } },
        { ownership: 'continuation', ref: 'sibling', generation: 0, query: { text: 'Matt', correction: null } },
      ] },
  ] };
  const offered = offerPersonClarification(state, {}, {
    kind: 'person-selection', ref: 'p', sourceRevision: 4,
    candidates: [{ id: 503, name: 'Candidate' }], hasMore: true,
  });
  if (offered.status !== 'active') throw new Error('Expected active question');
  const command = { baseRevision: 4, intentionRef: 'linked', expectedGeneration: 2,
    operation: 'refine', queryRef: 'p', query: { text: 'Chris Evans', correction: null } };
  const bindings = { expectedSessionRef: 'session', registry: ParserContinuationBindingRegistrySchema.parse({
    sessionRef: 'session', epoch: 0, sequence: 0, outstanding: [],
  }) };
  return { state, continuation, session: offered.session, command, bindings };
}

function run(setup: ReturnType<typeof fixture>, command: unknown = setup.command) {
  return processParserContinuationCommand(setup.state, setup.continuation, setup.session, command, setup.bindings);
}

function withBindings() {
  const setup = fixture();
  const commands: unknown[] = [
    { allocation: { mode: 'create' }, purpose: 'query_resolution', target: { ownership: 'canonical', criterion: 'person', queryRef: 'p' } },
    { allocation: { mode: 'create' }, purpose: 'query_resolution', target: { ownership: 'continuation', criterion: 'person', intentionRef: 'replacement', queryRef: 'owned', queryGeneration: 1 } },
    { allocation: { mode: 'create' }, purpose: 'query_resolution', target: { ownership: 'continuation', criterion: 'person', intentionRef: 'replacement', queryRef: 'sibling', queryGeneration: 0 } },
    { allocation: { mode: 'create' }, purpose: 'question_answer', target: { ownership: 'canonical', criterion: 'person', queryRef: 'p' }, question: { kind: 'person-selection', questionRef: 'person-question-1' } },
  ];
  for (const command of commands) {
    const result = issueParserContinuationBinding({
      expectedSessionRef: setup.bindings.expectedSessionRef, state: setup.state,
      continuation: setup.continuation, personSession: setup.session,
    }, setup.bindings.registry, command);
    if (result.status !== 'issued') throw new Error(`Expected binding: ${result.reason}`);
    setup.bindings.registry = result.registry;
  }
  return setup;
}

function ownedRefinement(setup: ReturnType<typeof fixture>) {
  return { ...setup.command, intentionRef: 'replacement', queryRef: 'owned', query: { text: 'Tom Hardy', correction: null } };
}

describe('processParserContinuationCommand session regressions', () => {
  // Statement coverage: a canonical edit returns all stores and old question actions remain rejected.
  it('refines canonical work and rejects the old question action without mutating inputs', () => {
    const setup = fixture(); const before = structuredClone(setup); const result = run(setup);
    if (result.status !== 'applied') throw new Error('Expected applied');
    expect(result.state.revision).toBe(5);
    expect(result.state.people).toEqual(setup.state.people);
    expect(result.state.pendingQueries.personQueries[0]?.query).toBe('Chris Evans');
    expect(result.continuation.intentions[0]?.generation).toBe(3);
    expect(result.session).toEqual({ sequence: 1, activeQuestion: null });
    expect(result.invalidated).toEqual({ intentionRefs: ['linked'], queryRefs: ['p'] });
    expect(result.registry).toEqual(setup.bindings.registry);
    expect(result.retiredBindingRefs).toEqual([]);
    expect(processPersonClarificationAction(result.state, result.session, {
      clarificationRef: 'person-question-1', ref: 'p', sourceRevision: 4, action: 'remove',
    })).toMatchObject({ status: 'processed', outcome: { status: 'rejected', reason: 'no-active-clarification' } });
    expect(setup).toEqual(before);
  });

  // Statement coverage: child and parent discard do not activate another pending person's question.
  it.each(['query', 'intention'] as const)('closes a question after %s discard without opening another', (scope) => {
    const setup = fixture();
    const result = run(setup, { baseRevision: 4, intentionRef: 'linked', expectedGeneration: 2,
      operation: 'discard', scope, ...(scope === 'query' ? { queryRef: 'p' } : {}),
    });
    if (result.status !== 'applied') throw new Error('Expected applied');
    expect(result.session).toEqual({ sequence: 1, activeQuestion: null });
    expect(result.state.people).toEqual(setup.state.people);
    expect(result.continuation.intentions.find((entry) => entry.ref === 'replacement')).toEqual(setup.continuation.intentions[1]);
    expect(result.state.pendingQueries.personQueries.map((query) => query.ref)).toEqual(scope === 'query' ? ['other'] : []);
  });

  // Branch coverage: a canonical sibling change closes a question made stale by the new revision.
  it('retires an unrelated question on canonical revision advance', () => {
    const setup = fixture();
    const result = run(setup, { ...setup.command, queryRef: 'other', query: { text: 'Brad Pitt', correction: null } });
    if (result.status !== 'applied') throw new Error('Expected applied');
    expect(result.invalidated.queryRefs).toEqual(['other']);
    expect(result.state.revision).toBe(5);
    expect(result.session).toEqual({ sequence: 1, activeQuestion: null });
  });

  // Branch coverage: a continuation-only edit preserves an unrelated current question and its sibling work.
  it('retains a valid unrelated question without aliases', () => {
    const setup = fixture(); const before = structuredClone(setup);
    const result = run(setup, ownedRefinement(setup));
    if (result.status !== 'applied') throw new Error('Expected applied');
    expect(result.state).toEqual(setup.state);
    expect(result.session).toEqual(setup.session);
    expect(result.session).not.toBe(setup.session);
    expect(result.session.activeQuestion).not.toBe(setup.session.activeQuestion);
    expect(result.continuation.intentions[1]?.children[1]).toEqual(setup.continuation.intentions[1]?.children[1]);
    expect(setup).toEqual(before);
  });

  // Branch coverage: editing does not allocate a question even when the existing question sequence is exhausted.
  it('preserves an exhausted closed question sequence', () => {
    const setup = fixture();
    setup.session = { sequence: Number.MAX_SAFE_INTEGER, activeQuestion: null };
    const result = run(setup);
    if (result.status !== 'applied') throw new Error('Expected applied');
    expect(result.session).toEqual(setup.session);
  });

  // Branch coverage: an already-stale question is retired after an applied owned edit, without advancing revision.
  it('retires an already-stale question on an applied owned edit', () => {
    const setup = fixture(); setup.state.revision = 5;
    const result = run(setup, { ...ownedRefinement(setup), baseRevision: 5 });
    if (result.status !== 'applied') throw new Error('Expected applied');
    expect(result.state.revision).toBe(5);
    expect(result.session).toEqual({ sequence: 1, activeQuestion: null });
  });

  // Branch coverage: invalid stored person sessions reject without returning partial stores.
  it('rejects an inconsistent person session', () => {
    const setup = fixture(); setup.session.sequence = 2; const before = structuredClone(setup);
    expect(run(setup)).toEqual({ status: 'rejected', reason: 'invalid-session' });
    expect(setup).toEqual(before);
  });
});

describe('processParserContinuationCommand registry integration', () => {
  // Statement coverage: canonical revision change retires all old incoming bindings using the new state.
  it('returns a coherent four-store proposal and ordered retirements after canonical refinement', () => {
    const setup = withBindings(); const before = structuredClone(setup); const result = run(setup);
    if (result.status !== 'applied') throw new Error('Expected applied');
    expect(result.registry).toEqual({ sessionRef: 'session', epoch: 0, sequence: 4, outstanding: [] });
    expect(result.retiredBindingRefs).toEqual(before.bindings.registry.outstanding.map((binding) => binding.bindingRef));
    expect(result.session.activeQuestion).toBeNull();
    const old = before.bindings.registry.outstanding[0]!;
    expect(checkParserContinuationBinding({ expectedSessionRef: 'session', state: result.state, continuation: result.continuation, personSession: result.session }, result.registry, { sessionRef: old.sessionRef, epoch: old.epoch, bindingRef: old.bindingRef }, 'query_resolution')).toEqual({ status: 'rejected', reason: 'unknown-binding' });
    expect(setup).toEqual(before);
  });

  // Branch coverage: owned child refinement withdraws exactly its binding and retains valid question/sibling bindings.
  it('preserves unchanged sibling bindings despite parent generation advancing', () => {
    const setup = withBindings(); const before = structuredClone(setup);
    const result = run(setup, ownedRefinement(setup));
    if (result.status !== 'applied') throw new Error('Expected applied');
    expect(result.state.revision).toBe(4);
    expect(result.continuation.intentions[1]?.generation).toBe(3);
    expect(result.retiredBindingRefs).toEqual(['continuation-binding-2']);
    expect(result.registry.outstanding.map((binding) => binding.bindingRef)).toEqual(['continuation-binding-1', 'continuation-binding-3', 'continuation-binding-4']);
    expect(result.session).toEqual(setup.session);
    result.registry.outstanding.length = 0;
    expect(setup).toEqual(before);
  });

  // Statement coverage: child/whole-parent cleanup retires removed targets without changing accepted replacement source.
  it.each(['query', 'intention'] as const)('reconciles owned %s discard while preserving accepted people', (scope) => {
    const setup = withBindings();
    const result = run(setup, { baseRevision: 4, intentionRef: 'replacement', expectedGeneration: 2, operation: 'discard', scope, ...(scope === 'query' ? { queryRef: 'owned' } : {}) });
    if (result.status !== 'applied') throw new Error('Expected applied');
    expect(result.state.people).toEqual(setup.state.people);
    expect(result.state.revision).toBe(4);
    expect(result.retiredBindingRefs).toEqual(scope === 'query' ? ['continuation-binding-2'] : ['continuation-binding-2', 'continuation-binding-3']);
    expect(result.session).toEqual(setup.session);
  });

  // Branch coverage: last-child cleanup removes its parent and also retires previously stale references.
  it('removes a final-child intention without removing the accepted source', () => {
    const setup = withBindings(); setup.continuation.intentions[1]!.children.pop();
    const result = run(setup, { baseRevision: 4, intentionRef: 'replacement', expectedGeneration: 2, operation: 'discard', scope: 'query', queryRef: 'owned' });
    if (result.status !== 'applied') throw new Error('Expected applied');
    expect(result.continuation.intentions.map((entry) => entry.ref)).toEqual(['linked']);
    expect(result.state.people).toEqual(setup.state.people);
    expect(result.retiredBindingRefs).toEqual(['continuation-binding-2', 'continuation-binding-3']);
  });

  // Branch coverage: closed questions retire answer bindings while unmodified resolution siblings remain authorized.
  it('uses the current closed session when reconciling question bindings', () => {
    const setup = withBindings(); setup.session.activeQuestion = null;
    const result = run(setup, ownedRefinement(setup));
    if (result.status !== 'applied') throw new Error('Expected applied');
    expect(result.retiredBindingRefs).toEqual(['continuation-binding-2', 'continuation-binding-4']);
    expect(result.registry.outstanding.map((binding) => binding.bindingRef)).toEqual(['continuation-binding-1', 'continuation-binding-3']);
    expect(result.session).toEqual({ sequence: 1, activeQuestion: null });
  });

  // Branch coverage: rejected/no-op commands preserve even stale session and registry entries without cleanup.
  it.each([
    { change: { baseRevision: 3 }, expected: { status: 'rejected', reason: 'stale-revision' } },
    { change: { expectedGeneration: 1 }, expected: { status: 'rejected', reason: 'stale-generation' } },
    { change: { query: { text: ' Chris ', correction: null } }, expected: { status: 'unchanged', reason: 'no-effective-change' } },
  ])('keeps all inputs intact for $expected.reason', ({ change, expected }) => {
    const setup = withBindings();
    if (setup.session.activeQuestion === null) throw new Error('Expected question');
    setup.session.activeQuestion.sourceRevision = 3;
    for (const binding of setup.bindings.registry.outstanding) binding.sourceRevision = 3;
    const before = structuredClone(setup);
    expect(run(setup, { ...setup.command, ...change })).toEqual(expected);
    expect(setup).toEqual(before);
  });

  // Branch coverage: malformed registries and routed lifetime mismatches reject before applying a valid edit.
  it.each([
    { expectedSessionRef: 'session', registry: {}, reason: 'invalid-registry' },
    { expectedSessionRef: '', registry: { sessionRef: 'session', epoch: 0, sequence: 0, outstanding: [] }, reason: 'invalid-context' },
    { expectedSessionRef: 'other-session', registry: { sessionRef: 'session', epoch: 0, sequence: 0, outstanding: [] }, reason: 'session-mismatch' },
  ])('rejects $reason without partial state', ({ reason, ...bindings }) => {
    const setup = withBindings(); const before = structuredClone({ setup, bindings });
    expect(processParserContinuationCommand(setup.state, setup.continuation, setup.session, setup.command, bindings)).toEqual({ status: 'rejected', reason });
    expect({ setup, bindings }).toEqual(before);
  });
});
