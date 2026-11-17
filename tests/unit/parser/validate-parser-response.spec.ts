import { describe, expect, it } from 'vitest';
import { validateParserResponse } from '@lib/parser/validate-parser-response';

describe('validateParserResponse', () => {
  // Statement coverage: response parsing returns the existing contract's normalized proposal, not state or search authorization.
  it('validates and normalizes a ready response', () => {
    const text = JSON.stringify({
      status: 'ready',
      changes: [
        { field: 'genreIds', operation: 'add', value: [103, 103] },
        { field: 'minYear', operation: 'set', value: 2010 },
        { field: 'minRating', operation: 'set', value: 7 },
      ],
      people: [' Bryan Cranston '],
      keywords: [' time travel '],
    });
    expect(validateParserResponse(text)).toEqual({
      status: 'valid',
      proposal: {
        status: 'ready',
        changes: [
          { field: 'genreIds', operation: 'add', value: [103] },
          { field: 'minYear', operation: 'set', value: 2010 },
          { field: 'minRating', operation: 'set', value: 7 },
        ],
        people: ['Bryan Cranston'],
        keywords: ['time travel'],
      },
    });
  });

  // Statement coverage: omitted edits remain empty without inserting a default media change into a follow-up.
  it('retains the distinction between omitted wishes and requested changes', () => {
    expect(validateParserResponse(' {"status":"ready"} ')).toEqual({
      status: 'valid',
      proposal: { status: 'ready', changes: [], people: [], keywords: [] },
    });
  });

  // Branch coverage: semantic outcomes retain their explanation and unapplied wishes rather than becoming parser failures.
  it.each(['needs_clarification', 'unsupported'])('preserves a valid %s response', (status) => {
    expect(validateParserResponse(JSON.stringify({
      status, message: ' Please clarify the replacement ', people: ['Example Person'],
    }))).toEqual({
      status: 'valid',
      proposal: {
        status, message: 'Please clarify the replacement',
        changes: [], people: ['Example Person'], keywords: [],
      },
    });
  });

  // Branch coverage: a provider envelope or already-decoded object is not silently treated as response text.
  it.each([undefined, null, 42, { status: 'ready' }, { choices: [] }])(
    'rejects non-text response %j',
    (input) => {
      expect(validateParserResponse(input)).toEqual({
        status: 'rejected', reason: 'invalid-response-type',
      });
    },
  );

  // Branch coverage: malformed, fenced, prefixed and trailing JSON is rejected without extraction or repair.
  it.each([
    '',
    '   ',
    '{"status":',
    '```json\n{"status":"ready"}\n```',
    'Here is the result: {"status":"ready"}',
    '{"status":"ready"} trailing text',
  ])('rejects malformed response text %j', (text) => {
    expect(validateParserResponse(text)).toEqual({ status: 'rejected', reason: 'invalid-json' });
  });

  // Branch coverage: syntactically valid JSON cannot bypass contract authority, value or semantic-message rules.
  it.each([
    null,
    { status: 'ready', baseRevision: 0 },
    { status: 'ready', personIds: [501] },
    { status: 'ready', changes: [{ field: 'minRating', operation: 'set', value: 11 }] },
    { status: 'ready', people: [' '] },
    { status: 'unsupported' },
  ])('distinguishes a schema-invalid proposal %j from invalid JSON', (proposal) => {
    expect(validateParserResponse(JSON.stringify(proposal))).toEqual({
      status: 'rejected', reason: 'invalid-proposal',
    });
  });

  // Statement coverage: technical failure output contains neither the raw model content nor validation/exception details.
  it('returns only a stable sanitized error for sensitive-looking invalid content', () => {
    expect(validateParserResponse('synthetic-private-response-not-for-feedback')).toEqual({
      status: 'rejected', reason: 'invalid-json',
    });
  });
});
