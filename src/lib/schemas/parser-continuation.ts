import { z } from 'zod';
import {
  MAX_PARSER_CONTINUATION_INTENTIONS,
  MAX_PARSER_CONTINUATION_QUERIES,
  MAX_PARSER_CONTINUATION_TEXT_LENGTH,
} from '@lib/config/domain';
import { ParserInvocationSchema, ParserQuerySchema } from './parser';
import type { PendingEntityQueries } from './search-state';

const reference = ParserInvocationSchema.shape.requestRef;
const generation = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const source = z.union([
  z.object({ mode: z.literal('reference'), ref: reference }).strict(),
  z.object({ mode: z.literal('unresolved'), description: ParserQuerySchema.shape.text }).strict(),
]);
const child = z.discriminatedUnion('ownership', [
  z.object({ ownership: z.literal('canonical'), ref: reference }).strict(),
  z
    .object({
      ownership: z.literal('continuation'),
      ref: reference,
      generation,
      query: ParserQuerySchema,
    })
    .strict(),
]);
const base = {
  ref: reference,
  criterion: z.enum(['person', 'keyword', 'genre']),
  generation,
  inputExcerpt: ParserInvocationSchema.shape.userInput,
};
const children = z.array(child).min(1).max(MAX_PARSER_CONTINUATION_QUERIES);
const intention = z.discriminatedUnion('operation', [
  z.object({ ...base, operation: z.literal('add'), source: z.null(), children }).strict(),
  z.object({ ...base, operation: z.literal('replace'), source, children }).strict(),
  z.object({ ...base, operation: z.literal('replace_all'), source: z.null(), children }).strict(),
  z
    .object({ ...base, operation: z.literal('remove'), source, children: z.array(child).max(0) })
    .strict(),
]);

/**
 * Bounded open-intention ownership, not a second SearchState or an acceptance token.
 * Nested owned children have exactly one parent; canonical children store only refs.
 * Staged results, question bindings, allocation lifetime and transitions are separate.
 */
export const ParserContinuationSchema = z
  .object({
    intentions: z.array(intention).max(MAX_PARSER_CONTINUATION_INTENTIONS),
  })
  .strict()
  .superRefine((continuation, ctx) => {
    const refs = new Set<string>();
    let queryCount = 0;
    let textLength = 0;
    const fail = () =>
      ctx.addIssue({ code: 'custom', message: 'Inconsistent continuation ownership or bounds' });
    const register = (ref: string) => {
      if (refs.has(ref)) fail();
      refs.add(ref);
    };
    for (const entry of continuation.intentions) {
      register(entry.ref);
      textLength += entry.inputExcerpt.length;
      if (entry.source?.mode === 'unresolved') textLength += entry.source.description.length;
      if (entry.operation === 'replace_all' && entry.criterion === 'person') fail();
      for (const query of entry.children) {
        register(query.ref);
        queryCount += 1;
        if (query.ownership === 'canonical') {
          if (entry.operation !== 'add' || entry.criterion === 'genre') fail();
        } else {
          if (query.generation > entry.generation) fail();
          textLength += query.query.text.length + (query.query.correction?.length ?? 0);
        }
      }
    }
    if (
      queryCount > MAX_PARSER_CONTINUATION_QUERIES ||
      textLength > MAX_PARSER_CONTINUATION_TEXT_LENGTH
    )
      fail();
  });
export type ParserContinuation = z.infer<typeof ParserContinuationSchema>;

/**
 * Validates untrusted continuation data against previously validated canonical pending work.
 * Counts canonical queries once, including unlinked requests, without copying their text.
 * Does not validate accepted-source bindings, freshness, provenance or execution readiness.
 * @param input Proposed ephemeral continuation.
 * @param canonicalPending Current validated SearchState.pendingQueries.
 * @returns A Zod safe-parse result; neither input nor canonical state is mutated.
 */
export function validateParserContinuation(input: unknown, canonicalPending: PendingEntityQueries) {
  const canonical = new Map([
    ...canonicalPending.personQueries.map(
      (query) =>
        [
          query.ref,
          {
            criterion: 'person',
            operation: query.operation,
            query: query.query,
          },
        ] as const,
    ),
    ...canonicalPending.keywordQueries.map(
      (query) =>
        [
          query.ref,
          {
            criterion: 'keyword',
            operation: 'add',
            query: query.query,
          },
        ] as const,
    ),
  ]);
  return ParserContinuationSchema.superRefine((continuation, ctx) => {
    const fail = () =>
      ctx.addIssue({
        code: 'custom',
        message: 'Continuation does not match canonical pending work',
      });
    let queryCount = canonical.size;
    let textLength = [...canonical.values()].reduce((sum, query) => sum + query.query.length, 0);
    for (const entry of continuation.intentions) {
      if (canonical.has(entry.ref)) fail();
      textLength += entry.inputExcerpt.length;
      if (entry.source?.mode === 'unresolved') textLength += entry.source.description.length;
      for (const query of entry.children) {
        if (query.ownership === 'canonical') {
          const target = canonical.get(query.ref);
          if (
            !target ||
            target.criterion !== entry.criterion ||
            target.operation !== entry.operation
          )
            fail();
        } else {
          if (canonical.has(query.ref)) fail();
          queryCount += 1;
          textLength += query.query.text.length + (query.query.correction?.length ?? 0);
        }
      }
    }
    if (
      queryCount > MAX_PARSER_CONTINUATION_QUERIES ||
      textLength > MAX_PARSER_CONTINUATION_TEXT_LENGTH
    )
      fail();
  }).safeParse(input);
}
