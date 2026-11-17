import { describe, expect, it, vi } from 'vitest';
import { createInitialSearchState } from '@lib/domain/search/create-initial-search-state';
import { offerPersonClarification } from '@lib/domain/search/person-clarification-lifecycle';
import { issueParserContinuationBinding } from '@lib/domain/search/parser-continuation-binding';
import { processBoundPersonSelection } from '@lib/domain/search/process-bound-person-selection';
import { processParserContinuationCommand } from '@lib/domain/search/process-parser-continuation-command';
import type { PersonSelectionIdentityValidator } from '@lib/domain/search/process-person-selection';
import type { ParserContinuation } from '@lib/schemas/parser-continuation';
import { ParserContinuationBindingRegistrySchema } from '@lib/schemas/parser-continuation-binding';

function fixture({ linked = true, operation = 'add', personId = 503, final = false, revision = 4 }: {
  linked?: boolean; operation?: 'add' | 'replace'; personId?: number; final?: boolean; revision?: number;
} = {}) {
  const state = createInitialSearchState();
  state.mode = 'discover'; state.revision = revision;
  state.people = [{ id: 501, name: 'Accepted A' }, { id: 502, name: 'Accepted B' }];
  state.pendingQueries.personQueries = [
    operation === 'add' ? { ref: 'p', query: 'Chris', operation }
      : { ref: 'p', query: 'Chris', operation, targetPersonId: 501 },
    ...(final ? [] : [{ ref: 'other', query: 'Matt', operation: 'add' as const }]),
  ];
  state.pendingQueries.keywordQueries = [{ ref: 'keyword', query: 'space' }];
  const continuation: ParserContinuation = { intentions: linked ? [{
    ref: 'parent', criterion: 'person', operation: 'add', source: null, generation: 2,
    inputExcerpt: 'Chris and Matt', children: [
      { ownership: 'canonical', ref: 'p' },
      ...(final ? [] : [{ ownership: 'canonical' as const, ref: 'other' }]),
    ],
  }] : [] };
  const offered = offerPersonClarification(state, {}, {
    kind: 'person-selection', ref: 'p', sourceRevision: revision,
    candidates: [{ id: personId, name: 'Presentation name' }], hasMore: false,
  });
  if (offered.status !== 'active') throw new Error('Expected active question');
  const context = { expectedSessionRef: 'session', state, continuation, personSession: offered.session };
  const empty = ParserContinuationBindingRegistrySchema.parse({ sessionRef: 'session', epoch: 0, sequence: 0, outstanding: [] });
  const target = { ownership: 'canonical', criterion: 'person', queryRef: 'p' };
  const question = issueParserContinuationBinding(context, empty, {
    allocation: { mode: 'create' }, purpose: 'question_answer', target,
    question: { kind: 'person-selection', questionRef: 'person-question-1' },
  });
  if (question.status !== 'issued') throw new Error('Expected question binding');
  const resolution = issueParserContinuationBinding(context, question.registry, {
    allocation: { mode: 'create' }, purpose: 'query_resolution', target,
  });
  if (resolution.status !== 'issued') throw new Error('Expected resolution binding');
  return { context, registry: resolution.registry,
    association: { sessionRef: 'session', epoch: 0, bindingRef: question.binding.bindingRef },
    input: { ref: 'p', clarificationRef: 'person-question-1', sourceRevision: revision, personId },
  };
}
function acceptance(id = 503, sourceRevision = 4) {
  return { ref: 'p', sourceRevision, person: { id, name: 'Provider canonical name' } };
}
function run(setup: ReturnType<typeof fixture>, validator: PersonSelectionIdentityValidator = () => acceptance(setup.input.personId, setup.input.sourceRevision)) {
  return processBoundPersonSelection(setup.context, setup.registry, setup.association, setup.input, validator);
}

describe('processBoundPersonSelection', () => {
  // Statement coverage: selection, real singular acceptance, canonical link cleanup and binding consumption form one isolated proposal.
  it('accepts a linked person once and preserves unrelated work', () => {
    const setup = fixture(); const before = structuredClone(setup);
    const validator = vi.fn(() => acceptance()); const result = run(setup, validator);
    if (result.status !== 'applied') throw new Error('Expected applied');
    expect(validator).toHaveBeenCalledTimes(1);
    expect(result.state.revision).toBe(5);
    expect(result.state.people).toEqual([...setup.context.state.people, acceptance().person]);
    expect(result.state.pendingQueries.personQueries).toEqual([{ ref: 'other', query: 'Matt', operation: 'add' }]);
    expect(result.state.pendingQueries.keywordQueries).toEqual(setup.context.state.pendingQueries.keywordQueries);
    expect(result.state.filters).toEqual(setup.context.state.filters);
    expect(result.continuation.intentions[0]).toEqual({ ...setup.context.continuation.intentions[0], generation: 3, children: [{ ownership: 'canonical', ref: 'other' }] });
    expect(result.session).toEqual({ sequence: 1, activeQuestion: null });
    expect(result.registry).toEqual({ sessionRef: 'session', epoch: 0, sequence: 2, outstanding: [] });
    expect(result.completedQueryRef).toBe('p'); expect(result.consumedBindingRef).toBe('continuation-binding-1');
    expect(result.retiredBindingRefs).toEqual(['continuation-binding-2']);
    expect(result.invalidated).toEqual({ queryRefs: ['p'], intentionRefs: ['parent'] });
    expect(result).not.toHaveProperty('nextRequest'); expect(result).not.toHaveProperty('followUp');
    result.state.people[0]!.name = 'Changed'; result.continuation.intentions[0]!.children.pop();
    expect(setup).toEqual(before);
  });

  // Branch coverage: canonical requests require no fabricated parent, and singular replacement retains existing controlled semantics.
  it.each(['add', 'replace'] satisfies ('add' | 'replace')[])('accepts an unlinked %s', (operation) => {
    const setup = fixture({ linked: false, operation }); const result = run(setup);
    if (result.status !== 'applied') throw new Error('Expected applied');
    expect(result.continuation.intentions).toEqual([]);
    expect(result.state.people.map((person) => person.id)).toEqual(operation === 'add' ? [501, 502, 503] : [503, 502]);
    expect(result.state.revision).toBe(5);
    expect(result.invalidated).toEqual({ queryRefs: ['p'], intentionRefs: [] });
  });

  // Branch coverage: duplicate additions and replacements close pending work without duplicate identities or renamed accepted records.
  it.each([
    { operation: 'add', personId: 502, expectedIds: [501, 502] },
    { operation: 'replace', personId: 502, expectedIds: [502] },
    { operation: 'replace', personId: 501, expectedIds: [501, 502] },
  ] satisfies { operation: 'add' | 'replace'; personId: number; expectedIds: number[] }[])('preserves deduplication for $operation to $personId', ({ operation, personId, expectedIds }) => {
    const setup = fixture({ linked: false, operation, personId }); const result = run(setup);
    if (result.status !== 'applied') throw new Error('Expected applied');
    expect(result.state.people).toEqual(setup.context.state.people.filter((person) => expectedIds.includes(person.id)));
    expect(result.state.revision).toBe(5); expect(result.registry.outstanding).toEqual([]);
  });

  // Branch coverage: a final accepted link removes its parent even at generation exhaustion, without requesting another question.
  it('completes a final-child parent without incrementing its exhausted generation', () => {
    const setup = fixture({ final: true }); setup.context.continuation.intentions[0]!.generation = Number.MAX_SAFE_INTEGER;
    setup.registry.sequence = Number.MAX_SAFE_INTEGER; const result = run(setup);
    if (result.status !== 'applied') throw new Error('Expected applied');
    expect(result.continuation.intentions).toEqual([]);
    expect(result.state.pendingQueries.personQueries).toEqual([]);
    expect(result.state.people.some((person) => person.id === 503)).toBe(true);
    expect(result.registry.sequence).toBe(Number.MAX_SAFE_INTEGER);
    expect(result.session.activeQuestion).toBeNull();
  });

  // Branch coverage: later continuation failure cannot expose the previously calculated identity acceptance or isolated consumption.
  it('rejects an exhausted surviving parent without partial stores', () => {
    const setup = fixture(); setup.context.continuation.intentions[0]!.generation = Number.MAX_SAFE_INTEGER;
    const before = structuredClone(setup); const validator = vi.fn(() => acceptance());
    expect(run(setup, validator)).toEqual({ status: 'rejected', stage: 'continuation', reason: 'generation-exhausted' });
    expect(validator).toHaveBeenCalledTimes(1); expect(setup).toEqual(before);
  });

  // Branch coverage: every acceptance removes a pending record and needs a fresh safe revision, including identity duplicates.
  it('rejects revision exhaustion before identity validation', () => {
    const setup = fixture({ revision: Number.MAX_SAFE_INTEGER }); const before = structuredClone(setup);
    const validator = vi.fn(() => acceptance());
    expect(run(setup, validator)).toEqual({ status: 'rejected', stage: 'acceptance', reason: 'revision-exhausted' });
    expect(validator).not.toHaveBeenCalled(); expect(setup).toEqual(before);
  });

  // Branch coverage: malformed, misdirected and unoffered answers cannot reach the trusted identity boundary or consume authority.
  it.each([
    { change: { ref: 'other' }, reason: 'question-mismatch' },
    { change: { clarificationRef: 'old' }, reason: 'question-mismatch' },
    { change: { sourceRevision: 3 }, reason: 'stale-revision' },
    { change: { personId: 999 }, reason: 'candidate-not-offered' },
    { change: { verified: true }, reason: 'invalid-answer' },
  ])('rejects selection $reason without changes', ({ change, reason }) => {
    const setup = fixture(); const before = structuredClone(setup); const validator = vi.fn(() => acceptance());
    expect(processBoundPersonSelection(setup.context, setup.registry, setup.association, { ...setup.input, ...change }, validator))
      .toEqual({ status: 'rejected', stage: 'selection', reason });
    expect(validator).not.toHaveBeenCalled(); expect(setup).toEqual(before);
  });

  // Branch coverage: a valid offered choice still cannot be accepted without trusted identity validation.
  it('fails closed when the identity validator is missing', () => {
    const setup = fixture(); const before = structuredClone(setup);
    expect(processBoundPersonSelection(setup.context, setup.registry, setup.association, setup.input))
      .toEqual({ status: 'rejected', stage: 'selection', reason: 'resolution-validation-required' });
    expect(setup).toEqual(before);
  });

  // Branch coverage: invalid or mismatched identity evidence preserves the original question and its live binding.
  it.each([
    { resolution: true, reason: 'invalid-resolution' },
    { resolution: acceptance(900), reason: 'resolution-mismatch' },
    { resolution: { ...acceptance(), ref: 'other' }, reason: 'resolution-mismatch' },
  ])('rejects identity $reason without partial stores', ({ resolution, reason }) => {
    const setup = fixture(); const before = structuredClone(setup);
    expect(run(setup, () => resolution)).toEqual({ status: 'rejected', stage: 'selection', reason });
    expect(setup).toEqual(before);
  });

  // Branch coverage: trusted validator exceptions remain sanitized and cannot consume the binding alone.
  it('retains all stores after a validator exception', () => {
    const setup = fixture(); const before = structuredClone(setup);
    expect(run(setup, () => { throw new Error('Private provider details'); }))
      .toEqual({ status: 'rejected', stage: 'selection', reason: 'resolution-validation-error' });
    expect(setup).toEqual(before);
  });

  // Branch coverage: invalid lifetime, purpose, context or revision rejects before invoking identity validation.
  it.each(['epoch', 'session', 'purpose', 'revision', 'question'])('rejects stale binding %s', (field) => {
    const setup = fixture();
    if (field === 'epoch') setup.association.epoch += 1;
    if (field === 'session') setup.association.sessionRef = 'other-session';
    if (field === 'purpose') setup.association.bindingRef = 'continuation-binding-2';
    if (field === 'revision') setup.context.state.revision += 1;
    if (field === 'question') setup.context.personSession.activeQuestion = null;
    const before = structuredClone(setup); const validator = vi.fn(() => acceptance());
    const reasons = { epoch: 'epoch-mismatch', session: 'session-mismatch', purpose: 'purpose-mismatch', revision: 'stale-revision', question: 'stale-question' };
    expect(run(setup, validator)).toEqual({ status: 'rejected', stage: 'binding', reason: reasons[field as keyof typeof reasons] });
    expect(validator).not.toHaveBeenCalled(); expect(setup).toEqual(before);
  });

  // Branch coverage: replaced questions invalidate old authority even when criteria revision remains unchanged.
  it('rejects an obsolete question token at the same state revision', () => {
    const setup = fixture(); const offered = offerPersonClarification(setup.context.state, setup.context.personSession, {
      kind: 'person-selection', ref: 'p', sourceRevision: 4, candidates: [{ id: 503, name: 'New offer' }], hasMore: false,
    });
    if (offered.status !== 'active') throw new Error('Expected replacement question');
    setup.context.personSession = offered.session; const validator = vi.fn(() => acceptance());
    expect(run(setup, validator)).toEqual({ status: 'rejected', stage: 'binding', reason: 'stale-question' });
    expect(validator).not.toHaveBeenCalled();
  });

  // Branch coverage: a no-match question does not authorize identity selection despite a structurally valid question binding.
  it('rejects identity selection for a bound no-match question', () => {
    const setup = fixture(); const offered = offerPersonClarification(setup.context.state, setup.context.personSession, { kind: 'person-no-match', ref: 'p', sourceRevision: 4 });
    if (offered.status !== 'active') throw new Error('Expected no-match question');
    setup.context.personSession = offered.session;
    const renewed = issueParserContinuationBinding(setup.context, setup.registry, {
      allocation: { mode: 'renew', expectedBindingRef: setup.association.bindingRef }, purpose: 'question_answer',
      target: { ownership: 'canonical', criterion: 'person', queryRef: 'p' }, question: { kind: 'person-no-match', questionRef: 'person-question-2' },
    });
    if (renewed.status !== 'issued') throw new Error('Expected renewed binding');
    const validator = vi.fn(() => acceptance());
    expect(processBoundPersonSelection(setup.context, renewed.registry, { ...setup.association, bindingRef: renewed.binding.bindingRef }, { ...setup.input, clarificationRef: 'person-question-2' }, validator))
      .toEqual({ status: 'rejected', stage: 'selection', reason: 'invalid-clarification' });
    expect(validator).not.toHaveBeenCalled();
  });

  // Branch coverage: malformed stored registry rejects without reaching identity validation or returning cleanup proposals.
  it('rejects malformed stored authority', () => {
    const setup = fixture(); const validator = vi.fn(() => acceptance());
    expect(processBoundPersonSelection(setup.context, {}, setup.association, setup.input, validator))
      .toEqual({ status: 'rejected', stage: 'binding', reason: 'invalid-registry' });
    expect(validator).not.toHaveBeenCalled();
  });

  // Statement coverage: existing validator argument isolation is preserved by the bound application entry point.
  it('isolates mutable validator arguments from original stores and acceptance association', () => {
    const setup = fixture({ linked: false, operation: 'replace' }); const before = structuredClone(setup);
    const validator: PersonSelectionIdentityValidator = ({ selection, request }) => {
      selection.ref = 'other'; selection.candidate.id = 999; request.query = 'Changed';
      if (request.operation === 'replace') request.targetPersonId = 502;
      return acceptance();
    };
    const result = run(setup, validator);
    if (result.status !== 'applied') throw new Error('Expected applied');
    expect(result.state.people.map((person) => person.id)).toEqual([503, 502]); expect(setup).toEqual(before);
  });

  // Branch coverage: committed consumption prevents replay before a second identity-validation call.
  it('rejects a repeated accepted answer', () => {
    const setup = fixture(); const result = run(setup);
    if (result.status !== 'applied') throw new Error('Expected applied');
    const validator = vi.fn(() => acceptance());
    expect(processBoundPersonSelection({ ...setup.context, state: result.state, continuation: result.continuation, personSession: result.session }, result.registry, setup.association, setup.input, validator))
      .toEqual({ status: 'rejected', stage: 'binding', reason: 'unknown-binding' });
    expect(validator).not.toHaveBeenCalled();
  });

  // Statement coverage: accepting one linked independent addition then discarding the rest cannot undo the accepted identity.
  it('preserves an accepted addition when the remaining parent is discarded', () => {
    const setup = fixture(); const accepted = run(setup);
    if (accepted.status !== 'applied') throw new Error('Expected applied');
    const discarded = processParserContinuationCommand(accepted.state, accepted.continuation, accepted.session, {
      operation: 'discard', scope: 'intention', baseRevision: 5, intentionRef: 'parent', expectedGeneration: 3,
    }, { expectedSessionRef: setup.context.expectedSessionRef, registry: accepted.registry });
    if (discarded.status !== 'applied') throw new Error('Expected discard');
    expect(discarded.state.people).toEqual(accepted.state.people);
    expect(discarded.state.pendingQueries.personQueries).toEqual([]); expect(discarded.continuation.intentions).toEqual([]);
    expect(discarded.state.revision).toBe(6); expect(discarded.session.activeQuestion).toBeNull();
  });
});
