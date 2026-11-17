import { describe, expect, it } from 'vitest';
import { parserInvocationFixture } from '@tests/fixtures/parser/contract';
import { PARSER_CONTRACT_VERSION } from '@lib/schemas/parser';
import type { ParserContinuation } from '@lib/schemas/parser-continuation';
import type { BoundPersonRefinementRequest } from '@lib/schemas/bound-person-refinement-request';
import { ParserContinuationBindingRegistrySchema } from '@lib/schemas/parser-continuation-binding';
import { createInitialSearchState } from '@lib/domain/search/create-initial-search-state';
import { offerPersonClarification } from '@lib/domain/search/person-clarification-lifecycle';
import { issueParserContinuationBinding } from '@lib/domain/search/parser-continuation-binding';
import { processBoundPersonClarificationAction } from '@lib/domain/search/process-bound-person-clarification-action';
import { processBoundPersonRefinement } from '@lib/domain/search/process-bound-person-refinement';

function fixture(linked = true, replace = false, revision = 4) {
  const state = createInitialSearchState();
  state.mode = 'discover'; state.revision = revision;
  state.people = [{ id: 501, name: 'Accepted person' }];
  state.pendingQueries.personQueries = [
    replace ? { ref: 'p', query: 'Chris', operation: 'replace', targetPersonId: 501 }
      : { ref: 'p', query: 'Chris', operation: 'add' },
    { ref: 'other', query: 'Matt', operation: 'add' },
  ];
  const continuation: ParserContinuation = { intentions: linked ? [{
    ref: 'parent', criterion: 'person', operation: 'add', source: null, generation: 2,
    inputExcerpt: 'Chris and Matt',
    children: [{ ownership: 'canonical', ref: 'p' }, { ownership: 'canonical', ref: 'other' }],
  }] : [] };
  const offered = offerPersonClarification(state, {}, {
    kind: 'person-selection', ref: 'p', sourceRevision: revision,
    candidates: [{ id: 503, name: 'Candidate' }], hasMore: true,
  });
  if (offered.status !== 'active') throw new Error('Expected active question');
  const context = { expectedSessionRef: 'session', state, continuation, personSession: offered.session };
  const empty = ParserContinuationBindingRegistrySchema.parse({ sessionRef: 'session', epoch: 0, sequence: 0, outstanding: [] });
  const target = { ownership: 'canonical', criterion: 'person', queryRef: 'p' };
  const issued = issueParserContinuationBinding(context, empty, {
    allocation: { mode: 'create' }, purpose: 'question_answer', target,
    question: { kind: 'person-selection', questionRef: 'person-question-1' },
  });
  if (issued.status !== 'issued') throw new Error('Expected question binding');
  const resolution = issueParserContinuationBinding(context, issued.registry, {
    allocation: { mode: 'create' }, purpose: 'query_resolution', target,
  });
  if (resolution.status !== 'issued') throw new Error('Expected resolution binding');
  const sibling = issueParserContinuationBinding(context, resolution.registry, {
    allocation: { mode: 'create' }, purpose: 'query_resolution',
    target: { ownership: 'canonical', criterion: 'person', queryRef: 'other' },
  });
  if (sibling.status !== 'issued') throw new Error('Expected sibling binding');
  const invocation = parserInvocationFixture();
  invocation.baseRevision = revision; invocation.sessionSequence = offered.session.sequence;
  invocation.userInput = 'the actor Chris Evans';
  invocation.context.criteria.people = [{ ref: 'accepted-tom', label: 'Accepted person' }];
  invocation.context.pending = state.pendingQueries.personQueries.map((query) => ({
    scope: 'query', ref: query.ref, criterion: 'person', operation: query.operation,
    source: query.operation === 'replace' ? { mode: 'reference', ref: 'accepted-tom' } : null,
    parentRef: null, query: { text: query.query, correction: null }, status: 'needs_clarification',
  }));
  invocation.context.activeClarification = { kind: 'person', pendingRef: 'p', reason: 'ambiguous' };
  const request: BoundPersonRefinementRequest = {
    association: { sessionRef: 'session', epoch: 0, bindingRef: issued.binding.bindingRef },
    action: { action: 'refine', ref: 'p', clarificationRef: 'person-question-1', sourceRevision: revision, text: invocation.userInput },
    invocation,
  };
  return { context, registry: sibling.registry, request };
}
function item(text = 'Chris Evans') {
  return { kind: 'entity', entityType: 'person', operation: 'refine', pendingRef: 'p',
    inputExcerpt: 'Chris Evans', query: { text, correction: null } };
}
function response(items: unknown[] = [item()]) {
  return { requestRef: 'parser-call-1', status: 'complete',
    content: JSON.stringify({ contractVersion: PARSER_CONTRACT_VERSION, groups: [{ items }] }) };
}
function run(setup: ReturnType<typeof fixture>, input: unknown = response()) {
  return processBoundPersonRefinement(setup.context, setup.registry, setup.request, input);
}

describe('processBoundPersonRefinement', () => {
  // Statement coverage: actual canonical refinement commits with pre-state consumption and post-state invalidation as one proposal.
  it('refines a linked query once while preserving siblings, source and accepted criteria', () => {
    const setup = fixture(); const before = structuredClone(setup); const result = run(setup);
    if (result.status !== 'applied') throw new Error('Expected applied');
    expect(result.queryChanged).toBe(true); expect(result.requestRef).toBe('parser-call-1');
    expect(result.state.revision).toBe(5);
    expect(result.state.pendingQueries.personQueries).toEqual([
      { ref: 'p', query: 'Chris Evans', operation: 'add' }, { ref: 'other', query: 'Matt', operation: 'add' },
    ]);
    expect(result.state.people).toEqual(setup.context.state.people);
    expect(result.continuation.intentions[0]).toEqual({ ...setup.context.continuation.intentions[0], generation: 3 });
    expect(result.session).toEqual({ sequence: 1, activeQuestion: null });
    expect(result.registry).toEqual({ sessionRef: 'session', epoch: 0, sequence: 3, outstanding: [] });
    expect(result.consumedBindingRef).toBe('continuation-binding-1');
    expect(result.retiredBindingRefs).toEqual(['continuation-binding-2', 'continuation-binding-3']);
    expect(result.invalidated).toEqual({ queryRefs: ['p'], intentionRefs: ['parent'] });
    expect(result).not.toHaveProperty('followUp'); expect(setup).toEqual(before);
    result.state.people[0]!.name = 'Changed'; result.continuation.intentions[0]!.children.pop();
    expect(setup).toEqual(before);
  });

  // Branch coverage: no artificial parent is allocated and a replacement retains its accepted source and operation.
  it.each([false, true])('refines an unlinked request with replace=%s', (replace) => {
    const setup = fixture(false, replace); const result = run(setup);
    if (result.status !== 'applied') throw new Error('Expected applied');
    expect(result.state.pendingQueries.personQueries[0]).toEqual({ ...setup.context.state.pendingQueries.personQueries[0], query: 'Chris Evans' });
    expect(result.state.people).toEqual(setup.context.state.people);
    expect(result.continuation.intentions).toEqual([]);
    expect(result.invalidated).toEqual({ queryRefs: ['p'], intentionRefs: [] });
    expect(result.state.revision).toBe(5);
  });

  // Branch coverage: a no-op query edit still answers the question without changing counters or retiring valid resolution bindings.
  it.each([false, true])('closes an answered no-op with linked=%s even at counter limits', (linked) => {
    const setup = fixture(linked, false, Number.MAX_SAFE_INTEGER);
    if (linked) setup.context.continuation.intentions[0]!.generation = Number.MAX_SAFE_INTEGER;
    const before = structuredClone(setup); const result = run(setup, response([item(' Chris ')]));
    if (result.status !== 'applied') throw new Error('Expected applied');
    expect(result.queryChanged).toBe(false); expect(result.state).toEqual(setup.context.state);
    expect(result.continuation).toEqual(setup.context.continuation);
    expect(result.session).toEqual({ sequence: 1, activeQuestion: null });
    expect(result.registry.outstanding.map((entry) => entry.bindingRef)).toEqual(['continuation-binding-2', 'continuation-binding-3']);
    expect(result.retiredBindingRefs).toEqual([]);
    expect(result.invalidated).toEqual({ queryRefs: [], intentionRefs: [] });
    const replay = processBoundPersonRefinement({ ...setup.context, state: result.state, continuation: result.continuation, personSession: result.session }, result.registry, setup.request, response());
    expect(replay).toEqual({ status: 'rejected', stage: 'binding', reason: 'unknown-binding' });
    result.registry.outstanding.length = 0; expect(setup).toEqual(before);
  });

  // Branch coverage: failed domain edits expose no consumption, closed question, cleanup or mutated input.
  it.each([false, true])('rejects revision exhaustion with linked=%s atomically', (linked) => {
    const setup = fixture(linked, false, Number.MAX_SAFE_INTEGER); const before = structuredClone(setup);
    expect(run(setup)).toEqual({ status: 'rejected', stage: 'transition', reason: 'invalid-result' });
    expect(setup).toEqual(before);
  });

  // Branch coverage: changing a linked query cannot wrap its parent generation.
  it('rejects exhausted parent generation without consuming the question', () => {
    const setup = fixture(); setup.context.continuation.intentions[0]!.generation = Number.MAX_SAFE_INTEGER;
    const before = structuredClone(setup);
    expect(run(setup)).toEqual({ status: 'rejected', stage: 'transition', reason: 'generation-exhausted' });
    expect(setup).toEqual(before);
  });

  // Branch coverage: parser failures preserve the original question/binding rather than persisting isolated consumption.
  it.each([
    { input: { requestRef: 'another-call', status: 'complete', content: '{}' }, reason: 'request-mismatch' },
    { input: { requestRef: 'parser-call-1', status: 'timeout' }, reason: 'timeout' },
    { input: { requestRef: 'parser-call-1', status: 'complete', content: '{' }, reason: 'malformed-json' },
  ])('rejects parser $reason without side effects', ({ input, reason }) => {
    const setup = fixture(); const before = structuredClone(setup);
    expect(run(setup, input)).toEqual({ status: 'rejected', stage: 'parser', reason });
    expect(setup).toEqual(before);
  });

  // Branch coverage: valid broader proposals cannot be silently sliced into a supported refinement.
  it.each([
    { items: [{ ...item(), pendingRef: 'other' }], reason: 'target-mismatch' },
    { items: [item(), item()], reason: 'unsupported-interpretation' },
    { items: [{ kind: 'unsupported', inputExcerpt: 'Chris Evans', reason: 'unsupported_operation' }], reason: 'unsupported-interpretation' },
    { items: [{ ...item(), query: { text: 'Chris', correction: 'Chris Evans' } }], reason: 'unsupported-correction' },
  ])('rejects interpretation $reason with all stores intact', ({ items, reason }) => {
    const setup = fixture(); const before = structuredClone(setup);
    expect(run(setup, response(items))).toEqual({ status: 'rejected', stage: 'interpretation', reason });
    expect(setup).toEqual(before);
  });

  // Branch coverage: the stored parser snapshot must belong to the submitted action and current question sequence.
  it.each(['text', 'sequence', 'revision', 'query', 'active-target'])('rejects mismatched invocation %s', (field) => {
    const setup = fixture(); const invocation = setup.request.invocation;
    if (field === 'text') invocation.userInput = 'different submission';
    if (field === 'sequence') invocation.sessionSequence += 1;
    if (field === 'revision') invocation.baseRevision -= 1;
    if (field === 'query') {
      const target = invocation.context.pending[0];
      if (target?.scope !== 'query') throw new Error('Expected query');
      target.query.text = 'Another name';
    }
    if (field === 'active-target') invocation.context.activeClarification = { kind: 'person', pendingRef: 'other', reason: 'ambiguous' };
    const before = structuredClone(setup);
    expect(run(setup)).toEqual({ status: 'rejected', stage: 'invocation', reason: 'invocation-mismatch' });
    expect(setup).toEqual(before);
  });

  // Branch coverage: schema parsing cannot turn a freely supplied proof flag into stored authority.
  it('rejects unknown request fields without touching stored state', () => {
    const setup = fixture(); const before = structuredClone(setup);
    expect(processBoundPersonRefinement(setup.context, setup.registry, { ...setup.request, validated: true }, response()))
      .toEqual({ status: 'rejected', stage: 'request', reason: 'invalid-request' });
    expect(setup).toEqual(before);
  });

  // Branch coverage: stale lifetime/question authority and wrong action association fail before parser processing.
  it.each(['epoch', 'question', 'revision', 'action-token'])('rejects stale %s authority atomically', (field) => {
    const setup = fixture();
    if (field === 'epoch') setup.request.association.epoch += 1;
    if (field === 'question') setup.context.personSession.activeQuestion = null;
    if (field === 'revision') setup.context.state.revision += 1;
    if (field === 'action-token') setup.request.action.clarificationRef = 'old-question';
    const before = structuredClone(setup);
    expect(run(setup)).toEqual({ status: 'rejected', stage: field === 'action-token' ? 'action' : 'binding',
      reason: field === 'epoch' ? 'epoch-mismatch' : field === 'question' ? 'stale-question' : field === 'revision' ? 'stale-revision' : 'question-mismatch' });
    expect(setup).toEqual(before);
  });

  // Branch coverage: deferred follow-up output is not authority to revive an already consumed question.
  it('rejects after the existing deferred action path already consumed the binding', () => {
    const setup = fixture();
    const deferred = processBoundPersonClarificationAction(setup.context, setup.registry, setup.request.association, setup.request.action);
    if (deferred.status !== 'follow-up') throw new Error('Expected follow-up');
    expect(processBoundPersonRefinement({ ...setup.context, state: deferred.state, continuation: deferred.continuation, personSession: deferred.session }, deferred.registry, setup.request, response()))
      .toEqual({ status: 'rejected', stage: 'binding', reason: 'unknown-binding' });
  });
});
