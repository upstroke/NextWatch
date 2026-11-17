import { describe, expect, it } from 'vitest';
import { MAX_PARSER_ITEMS, MAX_PARSER_QUERIES } from '@lib/config/domain';
import { validateParserResponse } from '@lib/parser/validate-response';
import type { ParserInvocation } from '@lib/schemas/parser';
import {
  parserInvocationFixture,
  mixedParserProposalFixture,
} from '@test-fixtures/parser/contract';

function validateContent(
  content: unknown,
  invocation: ParserInvocation = parserInvocationFixture(),
) {
  return validateParserResponse(
    { requestRef: invocation.requestRef, status: 'complete', content: JSON.stringify(content) },
    invocation,
  );
}

function oneItem(item: object) {
  return { contractVersion: '0.1.0-draft', groups: [{ items: [item] }] };
}

describe('validateParserResponse', () => {
  // Statement coverage: validation returns proposals only, without modifying accepted or pending state.
  it('accepts a mixed proposal with mutation isolation and no readiness assertion', () => {
    const invocation = parserInvocationFixture();
    const snapshot = structuredClone(invocation);
    const proposal = mixedParserProposalFixture();
    expect(validateContent(proposal, invocation)).toEqual({
      status: 'valid-proposal',
      requestRef: invocation.requestRef,
      proposal,
    });
    expect(invocation).toEqual(snapshot);
  });

  // Branch coverage: provider failures do not require success JSON and never trigger repair or parsing.
  it.each(['refused', 'incomplete', 'timeout', 'transport_error'])(
    'preserves the normalized %s outcome without raw provider diagnostics',
    (status) => {
      const invocation = parserInvocationFixture();
      expect(
        validateParserResponse({ requestRef: invocation.requestRef, status }, invocation),
      ).toEqual({ status: 'rejected', reason: status });
    },
  );

  // Branch coverage: an unrelated invocation cannot contribute even an otherwise valid proposal.
  it('rejects the wrong invocation before interpreting response content', () => {
    expect(
      validateParserResponse(
        { requestRef: 'other-call', status: 'complete', content: '{}' },
        parserInvocationFixture(),
      ),
    ).toEqual({ status: 'rejected', reason: 'request-mismatch' });
  });

  // Branch coverage: malformed and schema-invalid model payloads have distinct sanitized outcomes.
  it.each([
    { content: '{', reason: 'malformed-json' },
    { content: '{"contractVersion":"unknown","groups":[]}', reason: 'schema-invalid' },
  ])('classifies $reason without returning model text', ({ content, reason }) => {
    const invocation = parserInvocationFixture();
    expect(
      validateParserResponse(
        { requestRef: invocation.requestRef, status: 'complete', content },
        invocation,
      ),
    ).toEqual({ status: 'rejected', reason });
  });

  // Branch coverage: typed references are checked against original application context, not guessed names.
  it.each([
    {
      kind: 'entity',
      entityType: 'person',
      operation: 'refine',
      pendingRef: 'accepted-tom',
      query: { text: 'Chris Evans', correction: null },
    },
    {
      kind: 'entity',
      entityType: 'keyword',
      operation: 'remove',
      source: { mode: 'reference', ref: 'accepted-tom' },
    },
    { kind: 'clarification_answer', action: 'select_source', sourceRef: 'accepted-tom' },
    { kind: 'genre', operation: 'discard', target: { scope: 'query', ref: 'invented' } },
  ])('rejects an unoffered or wrong-scope association: %j', (item) => {
    expect(validateContent(oneItem({ ...item, inputExcerpt: 'Chris' }))).toEqual({
      status: 'rejected',
      reason: 'context-mismatch',
    });
  });

  // Statement coverage: an explicitly addressed non-first pending person remains refinable without reordering.
  it('accepts a supplied pending query while preserving original typo wording', () => {
    const invocation = parserInvocationFixture();
    invocation.userInput = 'Mit Chris meine ich Chris Evnas';
    invocation.context.pending = [
      {
        scope: 'query',
        ref: 'tom',
        criterion: 'person',
        operation: 'add',
        parentRef: null,
        source: null,
        query: { text: 'Tom', correction: null },
        status: 'unresolved',
      },
      {
        scope: 'query',
        ref: 'chris',
        criterion: 'person',
        operation: 'add',
        parentRef: null,
        source: null,
        query: { text: 'Chris', correction: null },
        status: 'unresolved',
      },
    ];
    const proposal = oneItem({
      kind: 'entity',
      inputExcerpt: 'Chris Evnas',
      entityType: 'person',
      operation: 'refine',
      pendingRef: 'chris',
      query: { text: 'Chris Evnas', correction: 'Chris Evans' },
    });
    expect(validateContent(proposal, invocation)).toEqual({
      status: 'valid-proposal',
      requestRef: invocation.requestRef,
      proposal,
    });
  });

  // Branch coverage: copied evidence is associated with current input; paraphrased evidence is rejected.
  it('rejects an excerpt not present in the current input', () => {
    expect(
      validateContent(
        oneItem({
          kind: 'filter',
          operation: 'set',
          field: 'minRating',
          value: 8,
          inputExcerpt: 'mindestens 8',
        }),
      ),
    ).toEqual({ status: 'rejected', reason: 'excerpt-mismatch' });
  });

  // Branch coverage: splitting into valid groups cannot evade the complete-response item bound.
  it('checks aggregate item limits across groups', () => {
    const item = {
      kind: 'filter',
      operation: 'set',
      field: 'minRating',
      value: 8,
      inputExcerpt: 'Chris',
    };
    expect(
      validateContent({
        contractVersion: '0.1.0-draft',
        groups: [
          { items: Array.from({ length: MAX_PARSER_ITEMS }, () => item) },
          { items: [item] },
        ],
      }),
    ).toEqual({ status: 'rejected', reason: 'aggregate-limit' });
  });

  // Branch coverage: a correction hint is not another requested identity, but extra queries are counted globally.
  it('checks aggregate query limits across items', () => {
    const query = { text: 'Chris', correction: 'Chris Evans' };
    const item = {
      kind: 'entity',
      entityType: 'person',
      operation: 'add',
      inputExcerpt: 'Chris',
      queries: Array.from({ length: MAX_PARSER_QUERIES }, () => query),
    };
    expect(
      validateContent({
        contractVersion: '0.1.0-draft',
        groups: [{ items: [item, { ...item, queries: [query] }] }],
      }),
    ).toEqual({ status: 'rejected', reason: 'aggregate-limit' });
  });

  // Statement coverage: an empty interpretation stays a valid proposal, never a search-ready status.
  it('does not equate no extracted changes with execution readiness', () => {
    const proposal = { contractVersion: '0.1.0-draft', groups: [] };
    expect(validateContent(proposal)).toEqual({
      status: 'valid-proposal',
      requestRef: 'parser-call-1',
      proposal,
    });
  });

  // Statement coverage: several destinations remain one proposal, with no accepted identity or source removal.
  it('retains the full multi-person replacement proposal', () => {
    const invocation = parserInvocationFixture();
    invocation.userInput = 'Ersetze Tom Hanks durch Chris Evans und Brad Pitt';
    const proposal = oneItem({
      kind: 'entity',
      operation: 'replace',
      entityType: 'person',
      inputExcerpt: invocation.userInput,
      source: { mode: 'reference', ref: 'accepted-tom' },
      queries: [
        { text: 'Chris Evans', correction: null },
        { text: 'Brad Pitt', correction: null },
      ],
    });
    const snapshot = structuredClone(invocation);
    expect(validateContent(proposal, invocation)).toEqual({
      status: 'valid-proposal',
      requestRef: invocation.requestRef,
      proposal,
    });
    expect(invocation).toEqual(snapshot);
  });

  // Statement coverage: the meaning selected is one actually supplied by the application, never a keyword ID.
  it('accepts an offered keyword meaning reference', () => {
    const invocation = parserInvocationFixture();
    invocation.userInput = 'Zeitreisen';
    invocation.context.pending = [
      {
        scope: 'query',
        ref: 'keyword',
        criterion: 'keyword',
        operation: 'add',
        parentRef: null,
        source: null,
        query: { text: 'Zeit', correction: null },
        status: 'needs_clarification',
      },
    ];
    invocation.context.activeClarification = {
      kind: 'keyword_meaning',
      pendingRef: 'keyword',
      options: [
        {
          ref: 'meaning-travel',
          label: 'Zeitreisen',
          query: { text: 'time travel', correction: null },
        },
        {
          ref: 'meaning-period',
          label: 'Historische Epoche',
          query: { text: 'historical period', correction: null },
        },
      ],
    };
    const proposal = oneItem({
      kind: 'clarification_answer',
      action: 'select_meaning',
      optionRef: 'meaning-travel',
      inputExcerpt: 'Zeitreisen',
    });
    expect(validateContent(proposal, invocation)).toEqual({
      status: 'valid-proposal',
      requestRef: invocation.requestRef,
      proposal,
    });
  });

  // Statement coverage: only a mentioned year bound is proposed; completing the pair remains adapter work.
  it('retains a single-bound answer to a supplied year-conflict context', () => {
    const invocation = parserInvocationFixture();
    invocation.userInput = 'Dann ab 2000';
    invocation.context.activeClarification = {
      kind: 'year_conflict',
      minYear: 2020,
      maxYear: 2010,
    };
    const proposal = oneItem({
      kind: 'filter',
      field: 'minYear',
      operation: 'set',
      value: 2000,
      inputExcerpt: 'ab 2000',
    });
    expect(validateContent(proposal, invocation)).toEqual({
      status: 'valid-proposal',
      requestRef: invocation.requestRef,
      proposal,
    });
  });

  // Statement coverage: entire genre selection replacement preserves original wording, including inactive wishes in context.
  it('validates a full genre replacement without creating genre IDs', () => {
    const invocation = parserInvocationFixture();
    invocation.userInput = 'Nur noch Komödien und Thriller';
    invocation.context.criteria.genres = [
      { ref: 'old-horror', label: 'Horror', activity: 'inactive' },
    ];
    const proposal = oneItem({
      kind: 'genre',
      operation: 'replace_all',
      inputExcerpt: invocation.userInput,
      queries: [
        { text: 'Komödien', correction: null },
        { text: 'Thriller', correction: null },
      ],
    });
    expect(validateContent(proposal, invocation)).toEqual({
      status: 'valid-proposal',
      requestRef: invocation.requestRef,
      proposal,
    });
  });

  // Statement coverage: selecting an offered accepted source binds the retained replacement without accepting destinations.
  it('accepts a supplied source choice for the current replacement question', () => {
    const invocation = parserInvocationFixture();
    invocation.userInput = 'Tom Hardy';
    invocation.context.criteria.people.push({ ref: 'accepted-hardy', label: 'Tom Hardy' });
    const source = { mode: 'unresolved', description: 'Tom' } satisfies {
      mode: 'unresolved';
      description: string;
    };
    invocation.context.pending = [
      {
        scope: 'intention',
        ref: 'replacement',
        criterion: 'person',
        operation: 'replace',
        source,
        queryRefs: ['replacement-child'],
        blockers: ['source'],
      },
      {
        scope: 'query',
        ref: 'replacement-child',
        criterion: 'person',
        operation: 'replace',
        parentRef: 'replacement',
        source,
        query: { text: 'Chris', correction: null },
        status: 'unresolved',
      },
    ];
    invocation.context.activeClarification = {
      kind: 'replacement_source',
      intentionRef: 'replacement',
      options: structuredClone(invocation.context.criteria.people),
    };
    const proposal = oneItem({
      kind: 'clarification_answer',
      action: 'select_source',
      sourceRef: 'accepted-hardy',
      inputExcerpt: 'Tom Hardy',
    });
    expect(validateContent(proposal, invocation)).toEqual({
      status: 'valid-proposal',
      requestRef: invocation.requestRef,
      proposal,
    });
  });

  // Branch coverage: invalid invocation metadata and unsanitized provider envelopes cannot enter interpretation.
  it('rejects invalid associations and response envelopes without leaking payloads', () => {
    expect(validateParserResponse({}, {})).toEqual({
      status: 'rejected',
      reason: 'invalid-invocation',
    });
    expect(
      validateParserResponse(
        { requestRef: 'parser-call-1', status: 'refused', rawError: { secret: 'not-returned' } },
        parserInvocationFixture(),
      ),
    ).toEqual({ status: 'rejected', reason: 'invalid-response' });
  });
});
