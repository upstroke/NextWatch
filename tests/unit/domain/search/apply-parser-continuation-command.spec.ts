import { describe, expect, it } from 'vitest';
import { createInitialSearchState } from '@lib/domain/search/create-initial-search-state';
import { applyParserContinuationCommand } from '@lib/domain/search/apply-parser-continuation-command';
import type { ParserContinuation } from '@lib/schemas/parser-continuation';

function fixture() {
  const state = createInitialSearchState();
  state.mode = 'discover';
  state.revision = 4;
  state.people = [{ id: 1, name: 'Tom Hanks' }];
  const continuation: ParserContinuation = {
    intentions: [
      {
        ref: 'replacement',
        criterion: 'person',
        operation: 'replace',
        generation: 2,
        inputExcerpt: 'Replace Tom with Chris and Brad',
        source: { mode: 'reference', ref: 'accepted-tom' },
        children: [
          {
            ownership: 'continuation',
            ref: 'chris',
            generation: 1,
            query: { text: 'Chris', correction: null },
          },
          {
            ownership: 'continuation',
            ref: 'brad',
            generation: 0,
            query: { text: 'Brad', correction: null },
          },
        ],
      },
    ],
  };
  const refine = {
    baseRevision: 4,
    intentionRef: 'replacement',
    expectedGeneration: 2,
    operation: 'refine',
    queryRef: 'chris',
    query: { text: 'Chris Evnas', correction: 'Chris Evans' },
  };
  return { state, continuation, refine };
}

function canonicalFixture(criterion: 'person' | 'keyword') {
  const setup = fixture();
  if (criterion === 'person') {
    setup.state.pendingQueries.personQueries = [
      { ref: 'linked', query: 'Chris', operation: 'add' },
      { ref: 'unrelated', query: 'Other', operation: 'add' },
    ];
  } else {
    setup.state.pendingQueries.keywordQueries = [
      { ref: 'linked', query: 'Time' },
      { ref: 'unrelated', query: 'Space' },
    ];
  }
  setup.continuation.intentions = [
    {
      ref: 'replacement',
      criterion,
      operation: 'add',
      source: null,
      generation: 2,
      inputExcerpt: 'Add a selection',
      children: [{ ownership: 'canonical', ref: 'linked' }],
    },
  ];
  return setup;
}

describe('applyParserContinuationCommand owned work', () => {
  // Statement coverage: refine only the addressed child and return isolated state plus invalidations.
  it('preserves source, siblings and accepted criteria on refinement', () => {
    const setup = fixture();
    const snapshot = structuredClone(setup);
    const result = applyParserContinuationCommand(setup.state, setup.continuation, setup.refine);
    expect(result.status).toBe('applied');
    if (result.status !== 'applied') throw new Error('Expected applied');
    const entry = result.continuation.intentions[0]!;
    expect(entry.generation).toBe(3);
    expect(entry.children[0]).toEqual({
      ownership: 'continuation',
      ref: 'chris',
      generation: 2,
      query: setup.refine.query,
    });
    expect(entry.children[1]).toEqual(setup.continuation.intentions[0]!.children[1]);
    expect(entry.source).toEqual(setup.continuation.intentions[0]!.source);
    expect(result.state).toEqual(setup.state);
    expect(result.invalidated).toEqual({ intentionRefs: ['replacement'], queryRefs: ['chris'] });
    result.state.people.length = 0;
    expect(setup).toEqual(snapshot);
  });

  // Branch coverage: replay is rejected even when accepted-state revision did not change.
  it('rejects an old parent generation after an owned refinement', () => {
    const setup = fixture();
    const result = applyParserContinuationCommand(setup.state, setup.continuation, setup.refine);
    if (result.status !== 'applied') throw new Error('Expected applied');
    expect(applyParserContinuationCommand(result.state, result.continuation, setup.refine)).toEqual(
      { status: 'rejected', reason: 'stale-generation' },
    );
  });

  // Branch coverage: exact owned no-ops do not consume generations, including at exhaustion.
  it('returns unchanged for an identical query at the generation limit', () => {
    const setup = fixture();
    setup.continuation.intentions[0]!.generation = Number.MAX_SAFE_INTEGER;
    const command = {
      ...setup.refine,
      expectedGeneration: Number.MAX_SAFE_INTEGER,
      query: { text: 'Chris', correction: null },
    };
    expect(applyParserContinuationCommand(setup.state, setup.continuation, command)).toEqual({
      status: 'unchanged',
      reason: 'no-effective-change',
    });
  });

  // Branch coverage: edits cannot overflow safe generation counters.
  it('rejects effective refinement at the generation limit', () => {
    const setup = fixture();
    setup.continuation.intentions[0]!.generation = Number.MAX_SAFE_INTEGER;
    expect(
      applyParserContinuationCommand(setup.state, setup.continuation, {
        ...setup.refine,
        expectedGeneration: Number.MAX_SAFE_INTEGER,
      }),
    ).toEqual({ status: 'rejected', reason: 'generation-exhausted' });
  });

  // Statement coverage: discarding one child preserves remaining work and increments only its parent.
  it('discards a child without removing its source or sibling', () => {
    const setup = fixture();
    const result = applyParserContinuationCommand(setup.state, setup.continuation, {
      baseRevision: 4,
      intentionRef: 'replacement',
      expectedGeneration: 2,
      operation: 'discard',
      scope: 'query',
      queryRef: 'chris',
    });
    if (result.status !== 'applied') throw new Error('Expected applied');
    expect(result.continuation.intentions[0]!.children).toEqual([
      setup.continuation.intentions[0]!.children[1],
    ]);
    expect(result.continuation.intentions[0]!.generation).toBe(3);
    expect(result.state).toEqual(setup.state);
    expect(result.invalidated.queryRefs).toEqual(['chris']);
  });

  // Statement coverage: final-child cleanup remains possible at generation exhaustion and retains accepted source.
  it('removes an empty replacement without deleting Tom', () => {
    const setup = fixture();
    setup.continuation.intentions[0]!.children.pop();
    setup.continuation.intentions[0]!.generation = Number.MAX_SAFE_INTEGER;
    const result = applyParserContinuationCommand(setup.state, setup.continuation, {
      baseRevision: 4,
      intentionRef: 'replacement',
      expectedGeneration: Number.MAX_SAFE_INTEGER,
      operation: 'discard',
      scope: 'query',
      queryRef: 'chris',
    });
    if (result.status !== 'applied') throw new Error('Expected applied');
    expect(result.continuation.intentions).toEqual([]);
    expect(result.state.people).toEqual(setup.state.people);
  });

  // Statement coverage: parent discard invalidates all its children, not unrelated intentions.
  it('discards a complete intention while retaining independent work', () => {
    const setup = fixture();
    const other = structuredClone(setup.continuation.intentions[0]!);
    other.ref = 'other';
    other.children = other.children.map((child) => ({ ...child, ref: `other-${child.ref}` }));
    setup.continuation.intentions.push(other);
    const result = applyParserContinuationCommand(setup.state, setup.continuation, {
      baseRevision: 4,
      intentionRef: 'replacement',
      expectedGeneration: 2,
      operation: 'discard',
      scope: 'intention',
    });
    if (result.status !== 'applied') throw new Error('Expected applied');
    expect(result.continuation.intentions).toEqual([other]);
    expect(result.invalidated.queryRefs).toEqual(['chris', 'brad']);
    expect(result.state).toEqual(setup.state);
  });

  // Branch coverage: invalid and stale commands preserve both caller inputs.
  it.each([
    { change: { baseRevision: 3 }, reason: 'stale-revision' },
    { change: { expectedGeneration: 1 }, reason: 'stale-generation' },
    { change: { intentionRef: 'missing' }, reason: 'unknown-intention' },
    { change: { queryRef: 'missing' }, reason: 'unknown-query' },
    { change: { extra: true }, reason: 'invalid-input' },
  ])('rejects $reason without mutation', ({ change, reason }) => {
    const setup = fixture();
    const snapshot = structuredClone(setup);
    expect(
      applyParserContinuationCommand(setup.state, setup.continuation, {
        ...setup.refine,
        ...change,
      }),
    ).toEqual({ status: 'rejected', reason });
    expect(setup).toEqual(snapshot);
  });

  // Branch coverage: inconsistent existing ownership is not partially repaired by an edit.
  it('rejects an invalid continuation', () => {
    const setup = fixture();
    setup.continuation.intentions[0]!.children[1]!.ref = 'chris';
    expect(applyParserContinuationCommand(setup.state, setup.continuation, setup.refine)).toEqual({
      status: 'rejected',
      reason: 'invalid-continuation',
    });
  });

  // Branch coverage: a refinement exceeding retained-text capacity rolls back the whole proposal.
  it('rejects an over-bound result without modifying either input', () => {
    const setup = fixture();
    for (let index = 0; index < 8; index += 1) {
      setup.continuation.intentions.push({
        ref: `remove-${index}`,
        criterion: 'person',
        operation: 'remove',
        generation: 0,
        source: { mode: 'unresolved', description: 'Tom' },
        children: [],
        inputExcerpt: 'x'.repeat(7900),
      });
    }
    const snapshot = structuredClone(setup);
    expect(
      applyParserContinuationCommand(setup.state, setup.continuation, {
        ...setup.refine,
        query: { text: 'x'.repeat(512), correction: 'y'.repeat(512) },
      }),
    ).toEqual({ status: 'rejected', reason: 'invalid-result' });
    expect(setup).toEqual(snapshot);
  });
});

describe('applyParserContinuationCommand canonical work', () => {
  // Statement coverage: canonical changes reuse domain transitions and return both stores together.
  it.each(['person', 'keyword'] as const)(
    'refines a linked %s through pending operations',
    (criterion) => {
      const setup = canonicalFixture(criterion);
      const snapshot = structuredClone(setup);
      const result = applyParserContinuationCommand(setup.state, setup.continuation, {
        ...setup.refine,
        queryRef: 'linked',
        query: { text: 'More specific', correction: null },
      });
      if (result.status !== 'applied') throw new Error('Expected applied');
      const requests =
        criterion === 'person'
          ? result.state.pendingQueries.personQueries
          : result.state.pendingQueries.keywordQueries;
      expect(requests.find((query) => query.ref === 'linked')?.query).toBe('More specific');
      expect(requests.find((query) => query.ref === 'unrelated')).toBeDefined();
      expect(result.state.revision).toBe(5);
      expect(result.continuation.intentions[0]!.children).toEqual([
        { ownership: 'canonical', ref: 'linked' },
      ]);
      expect(result.continuation.intentions[0]!.generation).toBe(3);
      expect(setup).toEqual(snapshot);
    },
  );

  // Branch coverage: canonical normalization keeps semantically identical changes as no-ops.
  it('does not advance revision or generation for a normalized canonical no-op', () => {
    const setup = canonicalFixture('person');
    expect(
      applyParserContinuationCommand(setup.state, setup.continuation, {
        ...setup.refine,
        queryRef: 'linked',
        query: { text: ' Chris ', correction: null },
      }),
    ).toEqual({ status: 'unchanged', reason: 'no-effective-change' });
  });

  // Branch coverage: the current canonical schema cannot retain a separate correction hint.
  it('rejects an unrepresentable canonical correction rather than dropping original wording', () => {
    const setup = canonicalFixture('person');
    expect(
      applyParserContinuationCommand(setup.state, setup.continuation, {
        ...setup.refine,
        queryRef: 'linked',
      }),
    ).toEqual({ status: 'rejected', reason: 'unsupported-correction' });
  });

  // Statement coverage: parent discard delegates each canonical removal and preserves unrelated requests.
  it.each(['person', 'keyword'] as const)(
    'discards linked %s work without clearing independent work',
    (criterion) => {
      const setup = canonicalFixture(criterion);
      const result = applyParserContinuationCommand(setup.state, setup.continuation, {
        baseRevision: 4,
        intentionRef: 'replacement',
        expectedGeneration: 2,
        operation: 'discard',
        scope: 'intention',
      });
      if (result.status !== 'applied') throw new Error('Expected applied');
      const requests =
        criterion === 'person'
          ? result.state.pendingQueries.personQueries
          : result.state.pendingQueries.keywordQueries;
      expect(requests.map((query) => query.ref)).toEqual(['unrelated']);
      expect(result.state.revision).toBe(5);
      expect(result.continuation.intentions).toEqual([]);
      expect(result.state.people).toEqual(setup.state.people);
    },
  );

  // Branch coverage: safe revision bounds apply before delegating an effective canonical mutation.
  it('rejects revision exhaustion without removing a canonical request', () => {
    const setup = canonicalFixture('person');
    setup.state.revision = Number.MAX_SAFE_INTEGER;
    const snapshot = structuredClone(setup);
    expect(
      applyParserContinuationCommand(setup.state, setup.continuation, {
        baseRevision: Number.MAX_SAFE_INTEGER,
        intentionRef: 'replacement',
        expectedGeneration: 2,
        operation: 'discard',
        scope: 'intention',
      }),
    ).toEqual({ status: 'rejected', reason: 'invalid-result' });
    expect(setup).toEqual(snapshot);
  });
});
