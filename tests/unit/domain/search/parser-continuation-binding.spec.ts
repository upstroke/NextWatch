import { describe, expect, it } from 'vitest';
import { createInitialSearchState } from '@lib/domain/search/create-initial-search-state';
import { offerPersonClarification } from '@lib/domain/search/person-clarification-lifecycle';
import { applyParserContinuationCommand } from '@lib/domain/search/apply-parser-continuation-command';
import {
  issueParserContinuationBinding,
  checkParserContinuationBinding,
  consumeParserContinuationBinding,
  reconcileParserContinuationBindings,
  retireParserContinuationBindings,
} from '@lib/domain/search/parser-continuation-binding';
import { ParserContinuationBindingRegistrySchema } from '@lib/schemas/parser-continuation-binding';
import type { ParserContinuationBinding } from '@lib/schemas/parser-continuation-binding';
import type { ParserContinuation } from '@lib/schemas/parser-continuation';

function fixture() {
  const state = createInitialSearchState();
  state.mode = 'discover';
  state.revision = 4;
  state.pendingQueries.personQueries = [{ ref: 'p', query: 'Chris', operation: 'add' }];
  const offered = offerPersonClarification(
    state,
    {},
    { kind: 'person-no-match', ref: 'p', sourceRevision: 4 },
  );
  if (offered.status !== 'active') throw new Error('Expected question');
  const continuation: ParserContinuation = {
    intentions: [
      {
        ref: 'parent',
        criterion: 'person',
        operation: 'replace',
        generation: 0,
        source: { mode: 'unresolved', description: 'Tom' },
        inputExcerpt: 'Replace Tom',
        children: [
          {
            ownership: 'continuation',
            ref: 'child',
            generation: 0,
            query: { text: 'Brad', correction: null },
          },
          {
            ownership: 'continuation',
            ref: 'sibling',
            generation: 0,
            query: { text: 'Matt', correction: null },
          },
        ],
      },
    ],
  };
  const context = {
    expectedSessionRef: 'session',
    state,
    continuation,
    personSession: offered.session,
  };
  const registry = ParserContinuationBindingRegistrySchema.parse({
    sessionRef: 'session',
    epoch: 0,
    sequence: 0,
    outstanding: [],
  });
  const target = { ownership: 'canonical', criterion: 'person', queryRef: 'p' };
  const command = { allocation: { mode: 'create' }, purpose: 'query_resolution', target };
  return { context, registry, command };
}
function receipt(binding: ParserContinuationBinding) {
  return { sessionRef: binding.sessionRef, epoch: binding.epoch, bindingRef: binding.bindingRef };
}
function issued(setup: ReturnType<typeof fixture>, command: unknown = setup.command) {
  const result = issueParserContinuationBinding(setup.context, setup.registry, command);
  if (result.status !== 'issued') throw new Error(`Expected issuance: ${result.reason}`);
  return result;
}

describe('continuation binding primitives', () => {
  // Statement coverage: check is non-consuming and consume removes only its current association without input mutation.
  it('issues, checks and consumes through current stored authority', () => {
    const setup = fixture();
    const before = structuredClone(setup);
    const first = issued(setup);
    expect(first.binding.bindingRef).toBe('continuation-binding-1');
    expect(first.binding).not.toHaveProperty('query');
    expect(
      checkParserContinuationBinding(
        setup.context,
        first.registry,
        receipt(first.binding),
        'query_resolution',
      ).status,
    ).toBe('current');
    const consumed = consumeParserContinuationBinding(
      setup.context,
      first.registry,
      receipt(first.binding),
      'query_resolution',
    );
    if (consumed.status !== 'consumed') throw new Error('Expected consumption');
    expect(consumed.registry.outstanding).toEqual([]);
    expect(
      checkParserContinuationBinding(
        setup.context,
        consumed.registry,
        receipt(first.binding),
        'query_resolution',
      ),
    ).toEqual({ status: 'rejected', reason: 'unknown-binding' });
    expect(first.registry.outstanding).toHaveLength(1);
    expect(setup).toEqual(before);
  });

  // Branch coverage: renewal behaves as compare-and-replace, never replacing a newer issued association.
  it('protects renewal and ordered retirement facts', () => {
    const setup = fixture();
    const first = issued(setup);
    const renew = {
      ...setup.command,
      allocation: { mode: 'renew', expectedBindingRef: first.binding.bindingRef },
    };
    const second = issueParserContinuationBinding(setup.context, first.registry, renew);
    if (second.status !== 'issued') throw new Error('Expected renewal');
    expect(second.binding.bindingRef).toBe('continuation-binding-2');
    expect(second.retiredBindingRefs).toEqual([first.binding.bindingRef]);
    expect(issueParserContinuationBinding(setup.context, second.registry, renew)).toEqual({
      status: 'rejected',
      reason: 'renewal-mismatch',
    });
    expect(issueParserContinuationBinding(setup.context, second.registry, setup.command)).toEqual({
      status: 'rejected',
      reason: 'binding-exists',
    });
  });

  // Branch coverage: child edits invalidate only that child when the parent generation alone changes.
  it('preserves an unchanged owned sibling through a real refinement', () => {
    const setup = fixture();
    const target = {
      ownership: 'continuation',
      criterion: 'person',
      intentionRef: 'parent',
      queryRef: 'sibling',
      queryGeneration: 0,
    };
    const first = issued(setup, { ...setup.command, target });
    const child = issueParserContinuationBinding(setup.context, first.registry, {
      ...setup.command,
      target: { ...target, queryRef: 'child' },
    });
    if (child.status !== 'issued') throw new Error('Expected child');
    const edit = applyParserContinuationCommand(setup.context.state, setup.context.continuation, {
      baseRevision: 4,
      intentionRef: 'parent',
      expectedGeneration: 0,
      operation: 'refine',
      queryRef: 'child',
      query: { text: 'Brad Pitt', correction: null },
    });
    if (edit.status !== 'applied') throw new Error('Expected edit');
    const context = { ...setup.context, state: edit.state, continuation: edit.continuation };
    expect(
      checkParserContinuationBinding(
        context,
        child.registry,
        receipt(child.binding),
        'query_resolution',
      ),
    ).toEqual({ status: 'rejected', reason: 'stale-generation' });
    expect(
      checkParserContinuationBinding(
        context,
        child.registry,
        receipt(first.binding),
        'query_resolution',
      ).status,
    ).toBe('current');
    const cleaned = reconcileParserContinuationBindings(
      context,
      child.registry,
      edit.invalidated.queryRefs,
    );
    if (cleaned.status !== 'reconciled') throw new Error('Expected cleanup');
    expect(cleaned.retiredBindingRefs).toEqual([child.binding.bindingRef]);
  });

  // Branch coverage: closing a question retires its answer authorization but not independent resolution work.
  it('binds to the current canonical question and preserves independent resolution', () => {
    const setup = fixture();
    const first = issued(setup);
    const second = issueParserContinuationBinding(setup.context, first.registry, {
      ...setup.command,
      purpose: 'question_answer',
      question: { kind: 'person-no-match', questionRef: 'person-question-1' },
    });
    if (second.status !== 'issued') throw new Error('Expected question binding');
    const closed = { ...setup.context, personSession: { sequence: 1, activeQuestion: null } };
    expect(
      checkParserContinuationBinding(
        closed,
        second.registry,
        receipt(second.binding),
        'question_answer',
      ),
    ).toEqual({ status: 'rejected', reason: 'stale-question' });
    const cleaned = reconcileParserContinuationBindings(closed, second.registry, []);
    if (cleaned.status !== 'reconciled') throw new Error('Expected question cleanup');
    expect(cleaned.registry.outstanding).toEqual([first.binding]);
  });

  // Branch coverage: own questions are not fabricated and criterion/owner/parent mismatches reject explicitly.
  it.each([
    {
      target: { ownership: 'canonical', criterion: 'person', queryRef: 'missing' },
      reason: 'unknown-target',
    },
    {
      target: { ownership: 'canonical', criterion: 'keyword', queryRef: 'p' },
      reason: 'target-mismatch',
    },
    {
      target: {
        ownership: 'continuation',
        criterion: 'person',
        intentionRef: 'wrong',
        queryRef: 'child',
        queryGeneration: 0,
      },
      reason: 'target-mismatch',
    },
    {
      target: {
        ownership: 'continuation',
        criterion: 'person',
        intentionRef: 'parent',
        queryRef: 'child',
        queryGeneration: 1,
      },
      reason: 'stale-generation',
    },
  ])('rejects $reason without changes', ({ target, reason }) => {
    const setup = fixture();
    const before = structuredClone(setup);
    expect(
      issueParserContinuationBinding(setup.context, setup.registry, { ...setup.command, target }),
    ).toEqual({ status: 'rejected', reason });
    expect(setup).toEqual(before);
  });

  // Branch coverage: a representable owned question command fails at the capability boundary.
  it('rejects owned question issuance', () => {
    const setup = fixture();
    expect(
      issueParserContinuationBinding(setup.context, setup.registry, {
        ...setup.command,
        purpose: 'question_answer',
        target: {
          ownership: 'continuation',
          criterion: 'person',
          intentionRef: 'parent',
          queryRef: 'child',
          queryGeneration: 0,
        },
        question: { kind: 'person-no-match', questionRef: 'person-question-1' },
      }),
    ).toEqual({ status: 'rejected', reason: 'unsupported-owned-question' });
  });

  // Branch coverage: routed lifetime, incoming epoch, purpose and structural precedence are distinct failures.
  it('enforces association and boundary precedence', () => {
    const setup = fixture();
    const first = issued(setup);
    const input = receipt(first.binding);
    for (const [association, purpose, reason] of [
      [{ ...input, sessionRef: 'other' }, 'query_resolution', 'session-mismatch'],
      [{ ...input, epoch: 1 }, 'query_resolution', 'epoch-mismatch'],
      [input, 'question_answer', 'purpose-mismatch'],
      [{ ...input, target: {} }, 'query_resolution', 'invalid-association'],
      [input, 'wrong', 'invalid-command'],
    ])
      expect(
        checkParserContinuationBinding(setup.context, first.registry, association, purpose),
      ).toEqual({ status: 'rejected', reason });
    expect(
      issueParserContinuationBinding({ ...setup.context, personSession: { sequence: -1 } }, {}, {}),
    ).toEqual({ status: 'rejected', reason: 'invalid-registry' });
    expect(
      issueParserContinuationBinding(
        { ...setup.context, personSession: { sequence: -1 } },
        setup.registry,
        {},
      ),
    ).toEqual({ status: 'rejected', reason: 'invalid-context' });
    expect(reconcileParserContinuationBindings(setup.context, setup.registry, {})).toEqual({
      status: 'rejected',
      reason: 'invalid-invalidations',
    });
  });

  // Branch coverage: stale entries are privately cleaned on success and never committed on issuance failure.
  it('cleans before issuance but leaves inputs intact on exhausted allocation', () => {
    const setup = fixture();
    const first = issued(setup);
    const context = { ...setup.context, state: { ...setup.context.state, revision: 5 } };
    expect(
      checkParserContinuationBinding(
        context,
        first.registry,
        receipt(first.binding),
        'query_resolution',
      ),
    ).toEqual({ status: 'rejected', reason: 'stale-revision' });
    const next = issueParserContinuationBinding(context, first.registry, setup.command);
    if (next.status !== 'issued') throw new Error('Expected fresh issuance');
    expect(next.retiredBindingRefs).toEqual([first.binding.bindingRef]);
    const exhausted = { ...first.registry, sequence: Number.MAX_SAFE_INTEGER };
    const before = structuredClone(exhausted);
    expect(issueParserContinuationBinding(context, exhausted, setup.command)).toEqual({
      status: 'rejected',
      reason: 'sequence-exhausted',
    });
    expect(exhausted).toEqual(before);
    expect(reconcileParserContinuationBindings(context, exhausted, []).status).toBe('reconciled');
  });

  // Statement coverage: no-op reconciliation is isolated; duplicate invalidations act as a set.
  it('returns isolated unchanged data and explicit invalidation cleanup', () => {
    const setup = fixture();
    const first = issued(setup);
    const unchanged = reconcileParserContinuationBindings(setup.context, first.registry, []);
    if (unchanged.status !== 'unchanged') throw new Error('Expected unchanged');
    expect(unchanged).not.toHaveProperty('retiredBindingRefs');
    unchanged.registry.outstanding.length = 0;
    expect(first.registry.outstanding).toHaveLength(1);
    expect(
      reconcileParserContinuationBindings(setup.context, first.registry, ['p', 'p']),
    ).toMatchObject({ status: 'reconciled', retiredBindingRefs: [first.binding.bindingRef] });
  });

  // Branch coverage: epoch retirement invalidates old receipts without closing questions or resetting allocation sequence.
  it('retires an epoch without pretending to pause workflow', () => {
    const setup = fixture();
    const first = issued(setup);
    const before = structuredClone(setup.context);
    const next = retireParserContinuationBindings('session', first.registry);
    if (next.status !== 'retired') throw new Error('Expected retirement');
    expect(next.registry).toMatchObject({ epoch: 1, sequence: 1, outstanding: [] });
    expect(
      checkParserContinuationBinding(
        setup.context,
        next.registry,
        receipt(first.binding),
        'query_resolution',
      ),
    ).toEqual({ status: 'rejected', reason: 'epoch-mismatch' });
    expect(
      retireParserContinuationBindings('session', {
        ...setup.registry,
        epoch: Number.MAX_SAFE_INTEGER,
      }),
    ).toEqual({ status: 'rejected', reason: 'epoch-exhausted' });
    expect(retireParserContinuationBindings('other', first.registry)).toEqual({
      status: 'rejected',
      reason: 'session-mismatch',
    });
    expect(setup.context).toEqual(before);
  });
});
