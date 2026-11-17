import { describe, expect, it } from 'vitest';
import { MAX_PERSON_IDS } from '@lib/config/domain';
import { ParserProposalSchema } from '@lib/schemas/parser-proposal';

describe('ParserProposalSchema', () => {
  // Statement coverage: missing edits mean no change, while unresolved terms are trimmed.
  it('keeps missing edits empty without supplying a media choice or identity', () => {
    expect(ParserProposalSchema.parse({ status: 'ready', people: [' Example Person '] })).toEqual({
      status: 'ready', changes: [], people: ['Example Person'], keywords: [],
    });
  });
  // Statement coverage: supported changes reuse field validation and normalize genre sets.
  it('accepts scalar removal and normalizes repeated genre IDs', () => {
    const result = ParserProposalSchema.parse({ status: 'ready', changes: [
      { field: 'minYear', operation: 'remove', value: null },
      { field: 'genreIds', operation: 'add', value: [101, 101] },
    ] });
    expect(result.changes).toEqual([
      { field: 'minYear', operation: 'remove', value: null },
      { field: 'genreIds', operation: 'add', value: [101] },
    ]);
  });
  // Branch coverage: model-controlled identities, authority and unsupported edits fail closed.
  it.each([
    { status: 'ready', baseRevision: 0 },
    { status: 'ready', people: [{ id: 501, name: 'Example' }] },
    { status: 'ready', personRefs: ['p-1'] },
    { status: 'ready', people: [' '] },
    { status: 'ready', people: Array.from({ length: MAX_PERSON_IDS + 1 }, () => 'Example') },
    { status: 'ready', changes: [{ field: 'personIds', operation: 'add', value: [501] }] },
    { status: 'ready', changes: [{ field: 'keywordIds', operation: 'add', value: [301] }] },
    { status: 'ready', changes: [{ field: 'minRating', operation: 'set', value: 11 }] },
    { status: 'ready', changes: [{ field: 'minYear', operation: 'set', value: 2010.5 }] },
    { status: 'ready', changes: [{ field: 'mediaType', operation: 'remove', value: null }] },
    { status: 'ready', changes: [{ field: 'genreIds', operation: 'set' }] },
    { status: 'ready', changes: [{ field: 'mediaType', operation: 'set' }] },
    { status: 'ready', changes: [{ field: 'minRating', operation: 'remove' }] },
    { status: 'needs_clarification', message: ' ' },
  ])('rejects an unsupported or unauthorized proposal %j', (input) => {
    expect(ParserProposalSchema.safeParse(input).success).toBe(false);
  });
  // Branch coverage: blocked proposals retain both their explanation and unapplied supported parts.
  it.each(['needs_clarification', 'unsupported'])('retains %s work', (status) => {
    expect(ParserProposalSchema.parse({
      status, message: ' Clarify the replacement ', people: ['Example'],
    })).toMatchObject({ status, message: 'Clarify the replacement', people: ['Example'] });
  });
});
