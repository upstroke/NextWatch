import { describe, expect, it } from 'vitest';
import { MAX_KEYWORD_IDS, MAX_PERSON_IDS } from '@lib/config/domain';
import { createParserProposalJsonSchema } from '@lib/parser/create-parser-proposal-json-schema';
import { ParserProposalSchema } from '@lib/schemas/parser-proposal';
import { SearchFiltersSchema } from '@lib/schemas/search';

describe('createParserProposalJsonSchema', () => {
  // Statement coverage: the export preserves strict status branches and input-side optional defaults.
  it('exports each proposal status without granting additional fields', () => {
    const schema = createParserProposalJsonSchema();
    expect(schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
    const alternatives = schema.oneOf ?? schema.anyOf;
    expect(alternatives).toHaveLength(ParserProposalSchema.options.length);
    for (const status of ['ready', 'needs_clarification', 'unsupported']) {
      expect(alternatives).toEqual(expect.arrayContaining([expect.objectContaining({
        type: 'object',
        additionalProperties: false,
        required: status === 'ready' ? ['status'] : ['status', 'message'],
        properties: expect.objectContaining({
          status: expect.objectContaining({ const: status }),
          people: expect.objectContaining({ type: 'array', maxItems: MAX_PERSON_IDS }),
          keywords: expect.objectContaining({ type: 'array', maxItems: MAX_KEYWORD_IDS }),
        }),
      })]));
    }
  });

  // Statement coverage: typed edits and explicit null removal are derived instead of manually defined by the exporter.
  it('retains project-specific edit constraints inside the ready branch', () => {
    const schema = createParserProposalJsonSchema();
    const alternatives = schema.oneOf ?? schema.anyOf;
    expect(alternatives).toEqual(expect.arrayContaining([expect.objectContaining({
      properties: expect.objectContaining({
        status: expect.objectContaining({ const: 'ready' }),
        changes: expect.objectContaining({
          type: 'array',
          items: expect.objectContaining({
            anyOf: expect.arrayContaining([
              expect.objectContaining({
                additionalProperties: false,
                properties: expect.objectContaining({
                  field: expect.objectContaining({ const: 'minRating' }),
                  value: expect.objectContaining({
                    type: 'number',
                    minimum: SearchFiltersSchema.shape.minRating.unwrap().minValue,
                    maximum: SearchFiltersSchema.shape.minRating.unwrap().maxValue,
                  }),
                }),
              }),
              expect.objectContaining({
                properties: expect.objectContaining({
                  field: expect.objectContaining({ const: 'genreIds' }),
                  value: expect.objectContaining({ type: 'array' }),
                }),
              }),
              expect.objectContaining({
                properties: expect.objectContaining({
                  field: expect.objectContaining({ enum: ['minRating', 'minYear', 'maxYear'] }),
                  operation: expect.objectContaining({ const: 'remove' }),
                  value: expect.objectContaining({ type: 'null' }),
                }),
              }),
            ]),
          }),
        }),
      }),
    })]));
  });

  // Statement coverage: exporting input structure does not replace or weaken local normalization and validation.
  it('leaves runtime trimming, normalization and strict rejection intact', () => {
    const proposal = {
      status: 'ready',
      changes: [{ field: 'genreIds', operation: 'add', value: [101, 101] }],
      people: [' Example Person '],
    };
    const before = ParserProposalSchema.parse(proposal);
    createParserProposalJsonSchema();
    expect(ParserProposalSchema.parse(proposal)).toEqual(before);
    expect(before.people).toEqual(['Example Person']);
    expect(before.changes).toEqual([{ field: 'genreIds', operation: 'add', value: [101] }]);
    expect(ParserProposalSchema.safeParse({ status: 'ready', personIds: [501] }).success).toBe(false);
    expect(ParserProposalSchema.safeParse({ status: 'ready', people: [' '] }).success).toBe(false);
  });

  // Statement coverage: mutating an exported artifact cannot alter future schemas or the source contract.
  it('returns independent artifacts for later provider adaptation', () => {
    const first = createParserProposalJsonSchema();
    const before = structuredClone(first);
    first.title = 'Changed by a caller';
    expect(createParserProposalJsonSchema()).toEqual(before);
  });
});
