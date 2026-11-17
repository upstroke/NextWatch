import { describe, expect, it } from 'vitest';
import { createInitialSearchState } from '@lib/domain/search/create-initial-search-state';
import { processParserContinuationCommand } from '@lib/domain/search/process-parser-continuation-command';
import { offerPersonClarification, processPersonClarificationAction } from '@lib/domain/search/person-clarification-lifecycle';
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
  return { state, continuation, session: offered.session, command };
}

describe('processParserContinuationCommand', () => {
  // Statement coverage: the real canonical edit returns all stores together and closes its question.
  it('refines canonical work, retains accepted criteria and rejects an old answer', () => {
    const setup = fixture();
    const before = structuredClone(setup);
    const result = processParserContinuationCommand(setup.state, setup.continuation, setup.session, setup.command);
    if (result.status !== 'applied') throw new Error('Expected applied');
    expect(result.state.revision).toBe(5);
    expect(result.state.people).toEqual(setup.state.people);
    expect(result.state.pendingQueries.personQueries[0]?.query).toBe('Chris Evans');
    expect(result.continuation.intentions[0]?.generation).toBe(3);
    expect(result.session).toEqual({ sequence: 1, activeQuestion: null });
    expect(result.invalidated).toEqual({ intentionRefs: ['linked'], queryRefs: ['p'] });
    const replay = processPersonClarificationAction(result.state, result.session, {
      clarificationRef: 'person-question-1', ref: 'p', sourceRevision: 4, action: 'remove',
    });
    expect(replay).toMatchObject({ status: 'processed', outcome: { status: 'rejected', reason: 'no-active-clarification' } });
    expect(setup).toEqual(before);
  });

  // Statement coverage: removing a child or parent never automatically offers the next pending person.
  it.each(['query', 'intention'] as const)('closes the question after %s discard without opening another', (scope) => {
    const setup = fixture();
    const result = processParserContinuationCommand(setup.state, setup.continuation, setup.session, {
      baseRevision: 4, intentionRef: 'linked', expectedGeneration: 2, operation: 'discard',
      scope, ...(scope === 'query' ? { queryRef: 'p' } : {}),
    });
    if (result.status !== 'applied') throw new Error('Expected applied');
    expect(result.session).toEqual({ sequence: 1, activeQuestion: null });
    expect(result.state.people).toEqual(setup.state.people);
    expect(result.continuation.intentions.find((entry) => entry.ref === 'replacement'))
      .toEqual(setup.continuation.intentions[1]);
    expect(result.state.pendingQueries.personQueries.map((query) => query.ref))
      .toEqual(scope === 'query' ? ['other'] : []);
  });

  // Branch coverage: a change to another canonical query still invalidates the old revision.
  it('retires an unrelated question when a canonical change advances revision', () => {
    const setup = fixture();
    const result = processParserContinuationCommand(setup.state, setup.continuation, setup.session, {
      ...setup.command, queryRef: 'other', query: { text: 'Brad Pitt', correction: null },
    });
    if (result.status !== 'applied') throw new Error('Expected applied');
    expect(result.invalidated.queryRefs).toEqual(['other']);
    expect(result.state.revision).toBe(5);
    expect(result.session.activeQuestion).toBeNull();
    expect(result.session.sequence).toBe(1);
  });

  // Branch coverage: continuation-only refinement preserves a valid unrelated canonical question and siblings.
  it('retains an unrelated current question without aliasing caller data', () => {
    const setup = fixture();
    const before = structuredClone(setup);
    const result = processParserContinuationCommand(setup.state, setup.continuation, setup.session, {
      ...setup.command, intentionRef: 'replacement', queryRef: 'owned',
      query: { text: 'Tom Hardy', correction: null },
    });
    if (result.status !== 'applied') throw new Error('Expected applied');
    expect(result.state).toEqual(setup.state);
    expect(result.session).toEqual(setup.session);
    expect(result.session).not.toBe(setup.session);
    expect(result.session.activeQuestion).not.toBe(setup.session.activeQuestion);
    expect(result.continuation.intentions[1]?.children[1]).toEqual(setup.continuation.intentions[1]?.children[1]);
    expect(setup).toEqual(before);
  });

  // Branch coverage: absent questions and exhausted sequences are retained without allocating a question.
  it('does not allocate a question for a closed session at sequence exhaustion', () => {
    const setup = fixture();
    const result = processParserContinuationCommand(setup.state, setup.continuation,
      { sequence: Number.MAX_SAFE_INTEGER, activeQuestion: null }, setup.command);
    if (result.status !== 'applied') throw new Error('Expected applied');
    expect(result.session).toEqual({ sequence: Number.MAX_SAFE_INTEGER, activeQuestion: null });
  });

  // Branch coverage: reconciliation after an applied owned edit also retires already-stale stored questions.
  it('retires a stale question even without a new canonical revision change', () => {
    const setup = fixture();
    setup.state.revision = 5;
    const result = processParserContinuationCommand(setup.state, setup.continuation, setup.session, {
      ...setup.command, baseRevision: 5, intentionRef: 'replacement', queryRef: 'owned',
    });
    if (result.status !== 'applied') throw new Error('Expected applied');
    expect(result.state.revision).toBe(5);
    expect(result.session).toEqual({ sequence: 1, activeQuestion: null });
  });

  // Branch coverage: invalid sessions reject before any transition and never expose a partial result.
  it('rejects an inconsistent application session without mutation', () => {
    const setup = fixture();
    const session = { ...setup.session, sequence: 2 };
    const before = structuredClone({ setup, session });
    expect(processParserContinuationCommand(setup.state, setup.continuation, session, setup.command))
      .toEqual({ status: 'rejected', reason: 'invalid-session' });
    expect({ setup, session }).toEqual(before);
  });

  // Branch coverage: rejected commands and normalized no-ops do not reconcile even an already-stale session.
  it.each([
    { change: { baseRevision: 3 }, expected: { status: 'rejected', reason: 'stale-revision' } },
    { change: { expectedGeneration: 1 }, expected: { status: 'rejected', reason: 'stale-generation' } },
    { change: { query: { text: ' Chris ', correction: null } }, expected: { status: 'unchanged', reason: 'no-effective-change' } },
  ])('preserves all inputs for $expected.reason', ({ change, expected }) => {
    const setup = fixture();
    if (setup.session.activeQuestion === null) throw new Error('Expected active question');
    setup.session.activeQuestion.sourceRevision = 3;
    const before = structuredClone(setup);
    expect(processParserContinuationCommand(setup.state, setup.continuation, setup.session, { ...setup.command, ...change }))
      .toEqual(expected);
    expect(setup).toEqual(before);
  });
});
