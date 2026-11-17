import { z } from 'zod';
import {
  MAX_GENRE_IDS,
  MAX_KEYWORD_IDS,
  MAX_PERSON_IDS,
  MAX_PARSER_INPUT_LENGTH,
  MAX_PARSER_QUERY_LENGTH,
  MAX_PARSER_REFERENCE_LENGTH,
  MAX_PARSER_GROUPS,
  MAX_PARSER_ITEMS,
  MAX_PARSER_QUERIES,
} from '@lib/config/domain';
import { MediaTypeSchema, SearchSortSchema, SearchFiltersSchema } from './search';
import { GenreCatalogsSchema } from './genre-catalogs';

/** External parser contract revision, independent of instruction wording. */
export const PARSER_CONTRACT_VERSION = '0.1.0-draft';

const reference = z.string().min(1).max(MAX_PARSER_REFERENCE_LENGTH).regex(/^\S+$/);
const term = z.string().min(1).max(MAX_PARSER_QUERY_LENGTH).regex(/\S/);
const inputText = z.string().min(1).max(MAX_PARSER_INPUT_LENGTH).regex(/\S/);
const criterion = z.enum(['person', 'keyword', 'genre']);
const operation = z.enum(['add', 'replace', 'replace_all', 'remove']);
const rating = SearchFiltersSchema.shape.minRating.unwrap();
const minYear = SearchFiltersSchema.shape.minYear.unwrap();
const maxYear = SearchFiltersSchema.shape.maxYear.unwrap();
const accepted = z.object({ ref: reference, label: term }).strict();
const pendingTarget = z.object({ scope: z.enum(['intention', 'query']), ref: reference }).strict();
const source = z.union([
  z.object({ mode: z.literal('reference'), ref: reference }).strict(),
  z.object({ mode: z.literal('unresolved'), description: term }).strict(),
]);

/** Original query wording and an optional hint; neither establishes identity. */
export const ParserQuerySchema = z.object({ text: term, correction: term.nullable() }).strict();
export type ParserQuery = z.infer<typeof ParserQuerySchema>;
const queries = z.array(ParserQuerySchema).min(1).max(MAX_PARSER_QUERIES);
const base = { inputExcerpt: inputText };
const entityBase = {
  ...base,
  kind: z.literal('entity'),
  entityType: z.enum(['person', 'keyword']),
};
const genreBase = { ...base, kind: z.literal('genre') };

const filterItem = z.union([
  z
    .object({
      ...base,
      kind: z.literal('filter'),
      operation: z.literal('set'),
      field: z.literal('mediaType'),
      value: MediaTypeSchema,
    })
    .strict(),
  z
    .object({
      ...base,
      kind: z.literal('filter'),
      operation: z.literal('set'),
      field: z.literal('sortBy'),
      value: SearchSortSchema,
    })
    .strict(),
  z
    .object({
      ...base,
      kind: z.literal('filter'),
      operation: z.literal('set'),
      field: z.literal('minRating'),
      value: rating,
    })
    .strict(),
  z
    .object({
      ...base,
      kind: z.literal('filter'),
      operation: z.literal('set'),
      field: z.literal('minYear'),
      value: minYear,
    })
    .strict(),
  z
    .object({
      ...base,
      kind: z.literal('filter'),
      operation: z.literal('set'),
      field: z.literal('maxYear'),
      value: maxYear,
    })
    .strict(),
  z
    .object({
      ...base,
      kind: z.literal('filter'),
      operation: z.literal('remove'),
      field: z.enum(['minRating', 'minYear', 'maxYear']),
    })
    .strict(),
]);
const item = z.union([
  filterItem,
  z.object({ ...entityBase, operation: z.literal('add'), queries }).strict(),
  z
    .object({
      ...entityBase,
      operation: z.literal('refine'),
      pendingRef: reference,
      query: ParserQuerySchema,
    })
    .strict(),
  z.object({ ...entityBase, operation: z.literal('replace'), source, queries }).strict(),
  z.object({ ...entityBase, operation: z.literal('remove'), source }).strict(),
  z.object({ ...entityBase, operation: z.literal('discard'), target: pendingTarget }).strict(),
  z
    .object({
      ...base,
      kind: z.literal('entity'),
      entityType: z.literal('keyword'),
      operation: z.literal('replace_all'),
      queries,
    })
    .strict(),
  z.object({ ...genreBase, operation: z.literal('add'), queries }).strict(),
  z
    .object({
      ...genreBase,
      operation: z.literal('refine'),
      pendingRef: reference,
      query: ParserQuerySchema,
    })
    .strict(),
  z.object({ ...genreBase, operation: z.literal('replace'), source, queries }).strict(),
  z.object({ ...genreBase, operation: z.literal('remove'), source }).strict(),
  z.object({ ...genreBase, operation: z.literal('discard'), target: pendingTarget }).strict(),
  z.object({ ...genreBase, operation: z.literal('replace_all'), queries }).strict(),
  z
    .object({
      ...base,
      kind: z.literal('clarification_answer'),
      action: z.literal('select_source'),
      sourceRef: reference,
    })
    .strict(),
  z
    .object({
      ...base,
      kind: z.literal('clarification_answer'),
      action: z.literal('select_meaning'),
      optionRef: reference,
    })
    .strict(),
  z
    .object({
      ...base,
      kind: z.literal('clarification'),
      subject: z.enum([
        'person',
        'keyword',
        'genre',
        'mediaType',
        'minRating',
        'minYear',
        'maxYear',
        'yearRange',
        'sortBy',
        'workflow',
      ]),
      reason: z.enum(['missing_value', 'ambiguous_meaning', 'ambiguous_reference']),
      relatedTarget: pendingTarget.nullable(),
    })
    .strict(),
  z
    .object({
      ...base,
      kind: z.literal('unsupported'),
      reason: z.enum(['unsupported_criterion', 'unsupported_operation']),
    })
    .strict(),
]);

/** JSON-Schema-compatible structural proposal; contextual checks are separate. */
export const ParserProposalSchema = z
  .object({
    contractVersion: z.literal(PARSER_CONTRACT_VERSION),
    groups: z
      .array(z.object({ items: z.array(item).min(1).max(MAX_PARSER_ITEMS) }).strict())
      .max(MAX_PARSER_GROUPS),
  })
  .strict();
export type ParserProposal = z.infer<typeof ParserProposalSchema>;

const pending = z.union([
  z
    .object({
      scope: z.literal('intention'),
      ref: reference,
      criterion,
      operation,
      source: source.nullable(),
      queryRefs: z.array(reference).max(MAX_PARSER_QUERIES),
      blockers: z
        .array(z.enum(['source', 'identity', 'capacity', 'semantic_conflict', 'unsupported']))
        .max(5),
    })
    .strict(),
  z
    .object({
      scope: z.literal('query'),
      ref: reference,
      criterion,
      operation: z.enum(['add', 'replace', 'replace_all']),
      parentRef: reference.nullable(),
      source: source.nullable(),
      query: ParserQuerySchema,
      status: z.enum(['unresolved', 'needs_clarification', 'resolved']),
    })
    .strict(),
]);
const activeClarification = z.union([
  z
    .object({
      kind: z.literal('person'),
      pendingRef: reference,
      reason: z.enum(['ambiguous', 'no_match']),
    })
    .strict(),
  z
    .object({
      kind: z.literal('replacement_source'),
      intentionRef: reference,
      options: z.array(accepted).min(2).max(MAX_PERSON_IDS),
    })
    .strict(),
  z.object({ kind: z.literal('year_conflict'), minYear, maxYear }).strict(),
  z
    .object({
      kind: z.literal('keyword_meaning'),
      pendingRef: reference,
      options: z
        .array(z.object({ ref: reference, label: term, query: ParserQuerySchema }).strict())
        .min(2)
        .max(MAX_PARSER_QUERIES),
    })
    .strict(),
  z
    .object({
      kind: z.literal('capacity'),
      criterion,
      targets: z.array(pendingTarget).min(1).max(MAX_PARSER_ITEMS),
      occupied: z.number().int().nonnegative(),
      reserved: z.number().int().nonnegative(),
      maximum: z.number().int().positive(),
    })
    .strict(),
]);

/** Prepared application metadata, not provider provenance or a second SearchState. */
export const ParserPreparedContextSchema = z
  .object({
    criteria: z
      .object({
        mediaType: MediaTypeSchema,
        sortBy: SearchSortSchema,
        minRating: rating.nullable(),
        minYear: minYear.nullable(),
        maxYear: maxYear.nullable(),
        people: z.array(accepted).max(MAX_PERSON_IDS),
        keywords: z.array(accepted).max(MAX_KEYWORD_IDS),
        genres: z
          .array(accepted.extend({ activity: z.enum(['active', 'inactive']) }).strict())
          .max(MAX_GENRE_IDS),
      })
      .strict(),
    pending: z.array(pending).max(MAX_PARSER_ITEMS + MAX_PARSER_QUERIES),
    activeClarification: activeClarification.nullable(),
    genreCatalogs: GenreCatalogsSchema,
  })
  .strict()
  .superRefine((context, ctx) => {
    const fail = () =>
      ctx.addIssue({ code: 'custom', message: 'Inconsistent parser context association' });
    const acceptedRefs = new Map<string, { criterion: z.infer<typeof criterion>; label: string }>();
    const allRefs = new Set<string>();
    const register = (ref: string) => {
      if (allRefs.has(ref)) fail();
      allRefs.add(ref);
    };
    for (const person of context.criteria.people) {
      register(person.ref);
      acceptedRefs.set(person.ref, { criterion: 'person', label: person.label });
    }
    for (const keyword of context.criteria.keywords) {
      register(keyword.ref);
      acceptedRefs.set(keyword.ref, { criterion: 'keyword', label: keyword.label });
    }
    for (const genre of context.criteria.genres) {
      register(genre.ref);
      acceptedRefs.set(genre.ref, { criterion: 'genre', label: genre.label });
    }
    const byRef = new Map(context.pending.map((entry) => [entry.ref, entry]));
    let queryCount = 0;
    let intentionCount = 0;
    for (const entry of context.pending) {
      register(entry.ref);
      if (entry.scope === 'query') queryCount += 1;
      else intentionCount += 1;
      if (entry.operation === 'replace_all' && entry.criterion === 'person') fail();
      if (entry.operation === 'replace' || entry.operation === 'remove') {
        if (entry.source === null) fail();
      } else if (entry.source !== null) fail();
      const entrySource = entry.source;
      if (
        entrySource !== null &&
        entrySource.mode === 'reference' &&
        acceptedRefs.get(entrySource.ref)?.criterion !== entry.criterion
      )
        fail();
      if (entry.scope === 'query' && entry.parentRef !== null) {
        const parent = byRef.get(entry.parentRef);
        if (
          parent?.scope !== 'intention' ||
          parent.criterion !== entry.criterion ||
          parent.operation !== entry.operation ||
          !parent.queryRefs.includes(entry.ref) ||
          JSON.stringify(parent.source) !== JSON.stringify(entry.source)
        )
          fail();
      }
      if (entry.scope === 'intention') {
        if (new Set(entry.queryRefs).size !== entry.queryRefs.length) fail();
        if (entry.operation !== 'remove' && entry.queryRefs.length === 0) fail();
        if (entry.operation === 'remove' && entry.queryRefs.length !== 0) fail();
        for (const ref of entry.queryRefs) {
          const child = byRef.get(ref);
          if (child?.scope !== 'query' || child.parentRef !== entry.ref) fail();
        }
      }
    }
    if (queryCount > MAX_PARSER_QUERIES || intentionCount > MAX_PARSER_ITEMS) fail();
    const { minYear: lower, maxYear: upper } = context.criteria;
    if (lower !== null && upper !== null && lower > upper) fail();
    const active = context.activeClarification;
    if (active?.kind === 'person' || active?.kind === 'keyword_meaning') {
      const request = byRef.get(active.pendingRef);
      const expected = active.kind === 'person' ? 'person' : 'keyword';
      if (
        request?.scope !== 'query' ||
        request.criterion !== expected ||
        request.status !== 'needs_clarification'
      )
        fail();
    }
    if (active?.kind === 'year_conflict' && active.minYear <= active.maxYear) fail();
    if (active?.kind === 'replacement_source') {
      const request = byRef.get(active.intentionRef);
      if (
        request?.scope !== 'intention' ||
        request.criterion !== 'person' ||
        request.operation !== 'replace' ||
        request.source?.mode !== 'unresolved'
      )
        fail();
      const options = new Set<string>();
      for (const option of active.options) {
        const record = acceptedRefs.get(option.ref);
        if (
          options.has(option.ref) ||
          record?.criterion !== 'person' ||
          record.label !== option.label
        )
          fail();
        options.add(option.ref);
      }
    }
    if (active?.kind === 'keyword_meaning') {
      for (const option of active.options) register(option.ref);
      if (new Set(active.options.map((option) => option.query.text)).size !== active.options.length)
        fail();
    }
    if (active?.kind === 'capacity') {
      const limit =
        active.criterion === 'person'
          ? MAX_PERSON_IDS
          : active.criterion === 'keyword'
            ? MAX_KEYWORD_IDS
            : MAX_GENRE_IDS;
      if (active.maximum !== limit || active.occupied + active.reserved > limit) fail();
      const targets = new Set<string>();
      for (const target of active.targets) {
        const request = byRef.get(target.ref);
        if (
          targets.has(target.ref) ||
          request?.scope !== target.scope ||
          request.criterion !== active.criterion
        )
          fail();
        targets.add(target.ref);
      }
    }
  });
export type ParserPreparedContext = z.infer<typeof ParserPreparedContextSchema>;

/** Immutable-at-call-time association supplied by the application, not the model. */
export const ParserInvocationSchema = z
  .object({
    requestRef: reference,
    baseRevision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    sessionSequence: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    context: ParserPreparedContextSchema,
    userInput: inputText,
  })
  .strict();
export type ParserInvocation = z.infer<typeof ParserInvocationSchema>;

/** Provider-neutral completed/failed response envelope; no raw provider errors. */
export const ParserResponseEnvelopeSchema = z.union([
  z.object({ requestRef: reference, status: z.literal('complete'), content: z.string() }).strict(),
  z
    .object({
      requestRef: reference,
      status: z.enum(['refused', 'incomplete', 'timeout', 'transport_error']),
    })
    .strict(),
]);
export type ParserResponseEnvelope = z.infer<typeof ParserResponseEnvelopeSchema>;

/** Exports structural constraints; local contextual/aggregate checks remain mandatory. */
export function createParserResponseJsonSchema() {
  return z.toJSONSchema(ParserProposalSchema);
}
