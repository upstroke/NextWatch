import { describe, expect, it } from 'vitest';
import { createInitialSearchState } from '@lib/domain/search/create-initial-search-state';
import { offerPersonClarification } from '@lib/domain/search/person-clarification-lifecycle';
import { issueParserContinuationBinding } from '@lib/domain/search/parser-continuation-binding';
import { processBoundPersonClarificationAction } from '@lib/domain/search/process-bound-person-clarification-action';
import { ParserContinuationBindingRegistrySchema } from '@lib/schemas/parser-continuation-binding';
import type { ParserContinuation } from '@lib/schemas/parser-continuation';

function fixture(linked = true, operation: 'add' | 'replace' = 'add') {
  const state = createInitialSearchState();
  state.mode = 'discover';
  state.revision = 4;
  state.people = [{ id: 501, name: 'Accepted person' }];
  state.pendingQueries.personQueries = [
    operation === 'add'
      ? { ref: 'p', query: 'Chris', operation }
      : { ref: 'p', query: 'Chris', operation, targetPersonId: 501 },
    { ref: 'other', query: 'Matt', operation: 'add' },
  ];
  const continuation: ParserContinuation = {
    intentions: linked
      ? [
          {
            ref: 'parent',
            criterion: 'person',
            operation: 'add',
            source: null,
            generation: 2,
            inputExcerpt: 'Add Chris and Matt',
            children: [
              { ownership: 'canonical', ref: 'p' },
              { ownership: 'canonical', ref: 'other' },
            ],
          },
        ]
      : [],
  };
  const offered = offerPersonClarification(
    state,
    {},
    {
      kind: 'person-selection',
      ref: 'p',
      sourceRevision: 4,
      candidates: [{ id: 503, name: 'Candidate' }],
      hasMore: true,
    },
  );
  if (offered.status !== 'active') throw new Error('Expected active question');
  const context = {
    expectedSessionRef: 'session',
    state,
    continuation,
    personSession: offered.session,
  };
  const empty = ParserContinuationBindingRegistrySchema.parse({
    sessionRef: 'session',
    epoch: 0,
    sequence: 0,
    outstanding: [],
  });
  const target = { ownership: 'canonical', criterion: 'person', queryRef: 'p' };
  const question = issueParserContinuationBinding(context, empty, {
    allocation: { mode: 'create' },
    purpose: 'question_answer',
    target,
    question: { kind: 'person-selection', questionRef: 'person-question-1' },
  });
  if (question.status !== 'issued') throw new Error('Expected question binding');
  const resolution = issueParserContinuationBinding(context, question.registry, {
    allocation: { mode: 'create' },
    purpose: 'query_resolution',
    target,
  });
  if (resolution.status !== 'issued') throw new Error('Expected resolution binding');
  return {
    context,
    registry: resolution.registry,
    association: { sessionRef: 'session', epoch: 0, bindingRef: question.binding.bindingRef },
    action: {
      ref: 'p',
      clarificationRef: 'person-question-1',
      sourceRevision: 4,
      action: 'remove',
    },
  };
}
function run(setup: ReturnType<typeof fixture>, action: unknown = setup.action) {
  return processBoundPersonClarificationAction(
    setup.context,
    setup.registry,
    setup.association,
    action,
  );
}

describe('processBoundPersonClarificationAction', () => {
  // Statement coverage: successful removal uses one domain transition, cleans its link and separates consumption/retirement.
  it.each(['remove', 'discard-change'])(
    'processes %s with a linked canonical query exactly once',
    (action) => {
      const setup = fixture();
      const before = structuredClone(setup);
      const result = run(setup, { ...setup.action, action });
      if (result.status !== 'applied') throw new Error('Expected applied');
      expect(result.state.revision).toBe(5);
      expect(result.state.pendingQueries.personQueries.map((query) => query.ref)).toEqual([
        'other',
      ]);
      expect(result.state.people).toEqual(setup.context.state.people);
      expect(result.continuation.intentions[0]).toMatchObject({
        ref: 'parent',
        generation: 3,
        children: [{ ownership: 'canonical', ref: 'other' }],
      });
      expect(result.session).toEqual({ sequence: 1, activeQuestion: null });
      expect(result.registry).toEqual({
        sessionRef: 'session',
        epoch: 0,
        sequence: 2,
        outstanding: [],
      });
      expect(result.consumedBindingRef).toBe('continuation-binding-1');
      expect(result.retiredBindingRefs).toEqual(['continuation-binding-2']);
      expect(result.invalidated).toEqual({ queryRefs: ['p'], intentionRefs: ['parent'] });
      expect(result).not.toHaveProperty('followUp');
      expect(setup).toEqual(before);
    },
  );

  // Branch coverage: unlinked canonical replacement discard preserves its accepted source without creating a parent.
  it('handles an unlinked pending replacement without deleting the accepted person', () => {
    const setup = fixture(false, 'replace');
    const result = run(setup);
    if (result.status !== 'applied') throw new Error('Expected applied');
    expect(result.continuation.intentions).toEqual([]);
    expect(result.state.people).toEqual(setup.context.state.people);
    expect(result.invalidated).toEqual({ queryRefs: ['p'], intentionRefs: [] });
  });

  // Branch coverage: final-child cleanup needs no counter increment and remains possible at generation exhaustion.
  it('removes a final-child parent at maximum generation', () => {
    const setup = fixture();
    const parent = setup.context.continuation.intentions[0]!;
    parent.children.pop();
    parent.generation = Number.MAX_SAFE_INTEGER;
    const result = run(setup);
    if (result.status !== 'applied') throw new Error('Expected applied');
    expect(result.continuation.intentions).toEqual([]);
    expect(result.state.people).toEqual(setup.context.state.people);
  });

  // Branch coverage: continuation failure does not expose the already calculated search-state change or consumption.
  it('rejects a surviving parent generation overflow without partial effects', () => {
    const setup = fixture();
    setup.context.continuation.intentions[0]!.generation = Number.MAX_SAFE_INTEGER;
    const before = structuredClone(setup);
    expect(run(setup)).toEqual({
      status: 'rejected',
      stage: 'continuation',
      reason: 'generation-exhausted',
    });
    expect(setup).toEqual(before);
  });

  // Statement coverage: hints/navigation consume the question but preserve query data, revision and independent resolution authority.
  it.each(['refine', 'more-candidates'])(
    'returns ephemeral %s without starting resolution',
    (action) => {
      const setup = fixture();
      const before = structuredClone(setup);
      const result = run(setup, {
        ...setup.action,
        action,
        ...(action === 'refine' ? { text: ' Chris Evans ' } : {}),
      });
      if (result.status !== 'follow-up') throw new Error('Expected follow-up');
      expect(result.state).toEqual(setup.context.state);
      expect(result.continuation).toEqual(setup.context.continuation);
      expect(result.followUp.request).toEqual(setup.context.state.pendingQueries.personQueries[0]);
      expect(result.followUp.action).toMatchObject(
        action === 'refine' ? { action, text: 'Chris Evans' } : { action },
      );
      expect(result.session).toEqual({ sequence: 1, activeQuestion: null });
      expect(result.registry.outstanding.map((binding) => binding.bindingRef)).toEqual([
        'continuation-binding-2',
      ]);
      expect(result.retiredBindingRefs).toEqual([]);
      expect(result.invalidated).toEqual({ queryRefs: [], intentionRefs: [] });
      const replay = processBoundPersonClarificationAction(
        {
          ...setup.context,
          state: result.state,
          continuation: result.continuation,
          personSession: result.session,
        },
        result.registry,
        setup.association,
        setup.action,
      );
      expect(replay).toEqual({ status: 'rejected', stage: 'binding', reason: 'unknown-binding' });
      result.state.people[0]!.name = 'Changed';
      result.registry.outstanding.length = 0;
      expect(setup).toEqual(before);
    },
  );

  // Branch coverage: invalid or mismatched actions never consume an otherwise current question binding.
  it.each([
    { change: { ref: 'other' }, reason: 'question-mismatch' },
    { change: { clarificationRef: 'old-question' }, reason: 'question-mismatch' },
    { change: { sourceRevision: 3 }, reason: 'stale-revision' },
    { change: { personId: 503 }, reason: 'invalid-action' },
  ])('rejects action $reason with all original stores intact', ({ change, reason }) => {
    const setup = fixture();
    const before = structuredClone(setup);
    expect(run(setup, { ...setup.action, ...change })).toEqual({
      status: 'rejected',
      stage: 'action',
      reason,
    });
    expect(setup).toEqual(before);
  });

  // Branch coverage: exhausted candidate groups reject navigation, not the still-current question binding.
  it('retains a valid binding after unavailable navigation', () => {
    const setup = fixture();
    const question = setup.context.personSession.activeQuestion;
    if (question?.kind !== 'person-selection') throw new Error('Expected selection');
    question.hasMore = false;
    const before = structuredClone(setup);
    expect(run(setup, { ...setup.action, action: 'more-candidates' })).toEqual({
      status: 'rejected',
      stage: 'action',
      reason: 'action-unavailable',
    });
    expect(setup).toEqual(before);
  });

  // Branch coverage: expired lifetimes and wrong binding purposes fail before evaluating the action.
  it.each([
    { change: { epoch: 1 }, reason: 'epoch-mismatch', stage: 'binding' },
    {
      change: { bindingRef: 'continuation-binding-2' },
      reason: 'purpose-mismatch',
      stage: 'binding',
    },
    { change: { bindingRef: 'missing' }, reason: 'unknown-binding', stage: 'binding' },
    { change: { sessionRef: 'other-session' }, reason: 'session-mismatch', stage: 'context' },
  ])('rejects binding $reason without partial output', ({ change, reason, stage }) => {
    const setup = fixture();
    setup.association = { ...setup.association, ...change };
    const before = structuredClone(setup);
    expect(run(setup)).toEqual({ status: 'rejected', stage, reason });
    expect(setup).toEqual(before);
  });

  // Branch coverage: malformed stored authority and closed questions reject without cleanup or inferred replacement questions.
  it('rejects invalid registry/context and a closed question without changing inputs', () => {
    const setup = fixture();
    const before = structuredClone(setup);
    expect(
      processBoundPersonClarificationAction(setup.context, {}, setup.association, setup.action),
    ).toEqual({ status: 'rejected', stage: 'context', reason: 'invalid-registry' });
    expect(
      processBoundPersonClarificationAction(
        { ...setup.context, personSession: { sequence: -1 } },
        setup.registry,
        setup.association,
        setup.action,
      ),
    ).toEqual({ status: 'rejected', stage: 'context', reason: 'invalid-context' });
    expect(
      processBoundPersonClarificationAction(
        { ...setup.context, personSession: { sequence: 1, activeQuestion: null } },
        setup.registry,
        setup.association,
        setup.action,
      ),
    ).toEqual({ status: 'rejected', stage: 'binding', reason: 'stale-question' });
    expect(setup).toEqual(before);
  });
});
