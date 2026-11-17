import { describe, expect, it } from 'vitest';
import { ParserPreparedContextSchema, ParserProposalSchema, createParserResponseJsonSchema } from '@lib/schemas/parser';
import { parserInvocationFixture, mixedParserProposalFixture } from '@test-fixtures/parser/contract';

describe('parser proposal contract', () => {
  // Statement coverage: mixed proposals stay separate from the ready-only ChatIntent boundary.
  it('retains the independent filter and unresolved person terms', () => {
    const proposal = mixedParserProposalFixture();
    expect(ParserProposalSchema.parse(proposal)).toEqual(proposal);
  });

  // Branch coverage: contradiction is extractable without weakening accepted SearchState years.
  it('represents individually valid but contradictory proposed year bounds', () => {
    expect(ParserProposalSchema.safeParse({
      contractVersion: '0.1.0-draft', groups: [{ items: [
        { kind: 'filter', operation: 'set', field: 'minYear', value: 2020, inputExcerpt: 'ab 2020' },
        { kind: 'filter', operation: 'set', field: 'maxYear', value: 2010, inputExcerpt: 'bis 2010' },
      ] }],
    }).success).toBe(true);
  });

  // Branch coverage: wire operations cannot bypass provider identity acceptance or criterion semantics.
  it.each([
    { kind: 'filter', operation: 'set', field: 'personIds', value: [123] },
    { kind: 'entity', entityType: 'person', operation: 'replace_all', queries: [{ text: 'Chris', correction: null }] },
    { kind: 'filter', operation: 'set', field: 'mediaType', value: 8 },
    { kind: 'filter', operation: 'remove', field: 'mediaType' },
    { kind: 'genre', operation: 'replace_all', queries: [] },
    { kind: 'entity', entityType: 'person', operation: 'remove', source: { mode: 'reference', ref: 'p' }, queries: [{ text: 'Other', correction: null }] },
  ])('rejects a forbidden domain/operation combination: %j', (invalid) => {
    expect(ParserProposalSchema.safeParse({ contractVersion: '0.1.0-draft', groups: [{ items: [{ ...invalid, inputExcerpt: 'input' }] }] }).success).toBe(false);
  });

  // Statement coverage: dedicated variants export without domain ID-list transforms or runtime refinements.
  it('exports a strict structural response contract without undefined values', () => {
    const schema = createParserResponseJsonSchema();
    expect(schema.type).toBe('object');
    expect(schema.additionalProperties).toBe(false);
    expect(schema.required).toEqual(expect.arrayContaining(['contractVersion', 'groups']));
    expect(JSON.parse(JSON.stringify(schema))).toEqual(schema);
  });

  // Branch coverage: proposed query corrections must retain original wording instead of omitting the explicit null/hint decision.
  it('does not silently default a missing spelling-correction field', () => {
    expect(ParserProposalSchema.safeParse({ contractVersion: '0.1.0-draft', groups: [{ items: [
      { kind: 'entity', entityType: 'person', operation: 'add', inputExcerpt: 'Chris', queries: [{ text: 'Chris' }] },
    ] }] }).success).toBe(false);
  });

});

describe('prepared parser context associations', () => {
  // Branch coverage: proposed conflict is distinct from previously accepted valid criteria.
  it('allows a year question without inventing an entity request', () => {
    const input = parserInvocationFixture();
    input.context.activeClarification = { kind: 'year_conflict', minYear: 2020, maxYear: 2010 };
    expect(ParserPreparedContextSchema.safeParse(input.context).success).toBe(true);
  });

  // Branch coverage: parent membership and source identity cannot drift from an explicitly scoped child.
  it('rejects a dangling or mismatched child-parent association', () => {
    const input = parserInvocationFixture();
    input.context.pending = [{ scope: 'query', ref: 'child', criterion: 'person', operation: 'add', parentRef: 'missing-parent', source: null, query: { text: 'Chris', correction: null }, status: 'unresolved' }];
    expect(ParserPreparedContextSchema.safeParse(input.context).success).toBe(false);
  });

  // Branch coverage: supplied references cannot ambiguously target both accepted and pending work.
  it('rejects a reference collision across accepted and pending scopes', () => {
    const input = parserInvocationFixture();
    input.context.pending = [{ scope: 'query', ref: 'accepted-tom', criterion: 'person', operation: 'add', parentRef: null, source: null, query: { text: 'Chris', correction: null }, status: 'unresolved' }];
    expect(ParserPreparedContextSchema.safeParse(input.context).success).toBe(false);
  });
});
