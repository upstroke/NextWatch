import { describe, expect, it } from 'vitest';
import { MAX_KEYWORD_IDS, MAX_PERSON_IDS } from '@lib/config/domain';
import { applyParserProposal } from '@lib/domain/search/apply-parser-proposal';
import { createInitialSearchState } from '@lib/domain/search/create-initial-search-state';
import { createParserProposalJsonSchema } from '@lib/parser/create-parser-proposal-json-schema';
import { validateParserResponse } from '@lib/parser/validate-parser-response';
import { ParserPendingOperationSchema, ParserProposalSchema } from '@lib/schemas/parser-proposal';

describe('pending operation proposal contract', () => {
  it('accepts and trims refinement text while retaining discard targets', () => {
    const result = ParserProposalSchema.parse({
      status: 'ready',
      pendingOperations: [
        { operation: 'refine', targetKey: 'person-1', query: ' Bryan Cranston ' },
        { operation: 'discard', targetKey: 'keyword-1' },
      ],
    });
    expect(result.pendingOperations).toEqual([
      { operation: 'refine', targetKey: 'person-1', query: 'Bryan Cranston' },
      { operation: 'discard', targetKey: 'keyword-1' },
    ]);
    expect(result.people).toEqual([]);
    expect(result.keywords).toEqual([]);
  });

  it('keeps existing parsed output unchanged when operations are absent', () => {
    expect(ParserProposalSchema.parse({ status: 'ready' })).toEqual({
      status: 'ready', changes: [], people: [], keywords: [],
    });
    expect(ParserProposalSchema.parse({ status: 'ready', pendingOperations: [] })
      .pendingOperations).toEqual([]);
  });

  it.each([
    { operation: 'refine', targetKey: 'person-1' },
    { operation: 'refine', targetKey: 'person-1', query: ' ' },
    { operation: 'discard', targetKey: 'person-1', query: 'Unexpected' },
    { operation: 'discard', targetKey: 'internal-reference' },
    { operation: 'discard', targetKey: 'person-0' },
    { operation: 'discard', targetKey: 'keyword-01' },
    { operation: 'discard', targetKey: ' person-1 ' },
    { operation: 'discard', targetKey: 501 },
    { operation: 'replace', targetKey: 'person-1', query: 'Another person' },
    { operation: 'discard', targetKey: 'person-1', ref: 'internal-reference' },
    { operation: 'discard', targetKey: 'person-1', sourceRevision: 12 },
    { operation: 'refine', targetKey: 'person-1', query: 'Example', targetPersonId: 501 },
  ])('rejects malformed or authority-bearing operation %j', (operation) => {
    expect(ParserPendingOperationSchema.safeParse(operation).success).toBe(false);
    expect(ParserProposalSchema.safeParse({
      status: 'ready', pendingOperations: [operation],
    }).success).toBe(false);
  });

  it('rejects repeated targets instead of defining implicit command ordering', () => {
    expect(ParserProposalSchema.safeParse({
      status: 'ready',
      pendingOperations: [
        { operation: 'refine', targetKey: 'person-1', query: 'Example' },
        { operation: 'discard', targetKey: 'person-1' },
      ],
    }).success).toBe(false);
  });

  it('bounds operation count by the existing combined pending capacity', () => {
    const limit = MAX_PERSON_IDS + MAX_KEYWORD_IDS;
    const operations = Array.from({ length: limit + 1 }, (_, index) => ({
      operation: 'discard', targetKey: `person-${index + 1}`,
    }));
    expect(ParserProposalSchema.safeParse({
      status: 'ready', pendingOperations: operations.slice(0, limit),
    }).success).toBe(true);
    expect(ParserProposalSchema.safeParse({
      status: 'ready', pendingOperations: operations,
    }).success).toBe(false);
  });

  it('validates syntax without claiming that a target was actually offered', () => {
    expect(ParserPendingOperationSchema.safeParse({
      operation: 'discard', targetKey: 'person-999',
    }).success).toBe(true);
  });

  it.each(['needs_clarification', 'unsupported'])('retains operations in %s proposals', (status) => {
    const pendingOperations = [{ operation: 'discard', targetKey: 'person-1' }];
    expect(ParserProposalSchema.parse({
      status, message: ' Clarify target ', pendingOperations,
    })).toMatchObject({ status, message: 'Clarify target', pendingOperations });
  });

  it('exports the new contract and validates a scripted JSON response through the real boundary', () => {
    const serialized = JSON.stringify(createParserProposalJsonSchema());
    expect(serialized).toContain('pendingOperations');
    expect(serialized).toContain('targetKey');
    expect(serialized).toContain('refine');
    expect(serialized).toContain('discard');
    const pendingOperations = [
      { operation: 'refine', targetKey: 'keyword-1', query: ' time travel ' },
    ];
    const result = validateParserResponse(JSON.stringify({ status: 'ready', pendingOperations }));
    expect(result).toMatchObject({
      status: 'valid',
      proposal: { pendingOperations: [
        { operation: 'refine', targetKey: 'keyword-1', query: 'time travel' },
      ] },
    });
  });

  it.each(['refine', 'discard'])('blocks %s proposals in full until bound application exists', (operation) => {
    const state = createInitialSearchState();
    const before = structuredClone(state);
    const proposal = {
      status: 'ready',
      changes: [{ field: 'minRating', operation: 'set', value: 7 }],
      people: ['New Person'],
      pendingOperations: [operation === 'refine'
        ? { operation, targetKey: 'person-1', query: 'New text' }
        : { operation, targetKey: 'person-1' }],
    };
    const result = applyParserProposal(state, proposal, {
      expectedRevision: state.revision, personRefs: ['fresh-person'], keywordRefs: [],
    });
    expect(result).toEqual({
      status: 'blocked', reason: 'unsupported-pending-operations',
      proposal: ParserProposalSchema.parse(proposal),
    });
    expect(result).not.toHaveProperty('state');
    expect(state).toEqual(before);
  });

  it('allows explicit empty operations without blocking existing filter changes', () => {
    const state = createInitialSearchState();
    const result = applyParserProposal(state, {
      status: 'ready', pendingOperations: [],
      changes: [{ field: 'minRating', operation: 'set', value: 7 }],
    }, { expectedRevision: state.revision, personRefs: [], keywordRefs: [] });
    expect(result).toMatchObject({ status: 'applied', state: { filters: { minRating: 7 } } });
  });
});
