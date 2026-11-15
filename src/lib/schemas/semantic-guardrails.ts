import { z } from 'zod';
import { MAX_PERSON_IDS } from '@lib/config/domain';
import { SearchFiltersSchema } from './search';
import { AcceptedPersonSchema, PendingKeywordQuerySchema, PendingPersonQuerySchema, SearchStateSchema } from './search-state';

const reference = PendingKeywordQuerySchema.shape.ref;
const binding = { clarificationRef: reference, sourceRevision: SearchStateSchema.shape.revision };
const replacementRequest = PendingPersonQuerySchema.options[0].pick({ ref: true, query: true });
const replacement = z.object({
  kind: z.literal('replacement-target'), sourceRevision: binding.sourceRevision,
  request: replacementRequest,
}).strict();
const yearConflict = z.object({
  kind: z.literal('year-conflict'), sourceRevision: binding.sourceRevision,
  minYear: SearchFiltersSchema.shape.minYear.unwrap(),
  maxYear: SearchFiltersSchema.shape.maxYear.unwrap(),
}).strict().refine((issue) => issue.minYear > issue.maxYear, {
  message: 'Recognized year conflict must contain contradictory bounds', path: ['maxYear'],
});
const keyword = z.object({
  kind: z.literal('keyword-meaning'), sourceRevision: binding.sourceRevision,
  request: PendingKeywordQuerySchema,
  options: z.array(z.object({
    optionRef: reference, label: z.string().trim().min(1), query: PendingKeywordQuerySchema.shape.query,
  }).strict()).min(2).refine((options) =>
    new Set(options.map((option) => option.optionRef)).size === options.length &&
    new Set(options.map((option) => option.query)).size === options.length,
  { message: 'Keyword choices require distinct references and query meanings' }),
}).strict();
const unsupported = z.object({
  kind: z.literal('unsupported'), sourceRevision: binding.sourceRevision,
  requirement: z.string().trim().min(1),
}).strict();

/** Already recognized situations, not natural-language parsing or arbitrary schema-error conversion. */
export const SemanticGuardrailInputSchema = z.discriminatedUnion('kind', [
  replacement, yearConflict, keyword, unsupported,
]);

/** Offered targets are application-owned accepted people, not newly resolved identities. */
export const SemanticClarificationSchema = z.discriminatedUnion('kind', [
  replacement.extend({
    clarificationRef: reference,
    targets: z.array(AcceptedPersonSchema).min(2).max(MAX_PERSON_IDS)
      .refine((targets) => new Set(targets.map((target) => target.id)).size === targets.length),
  }),
  yearConflict.safeExtend({ clarificationRef: reference }),
  keyword.extend({ clarificationRef: reference }),
]);
export type SemanticClarification = z.infer<typeof SemanticClarificationSchema>;

/** Application-owned session; retain sequence after closure and never trust a client-supplied question. */
export const SemanticGuardrailSessionSchema = z.object({
  sequence: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).default(0),
  activeQuestion: SemanticClarificationSchema.nullable().default(null),
}).strict().refine((session) => session.activeQuestion === null || (
  session.sequence > 0 &&
  session.activeQuestion.clarificationRef === `semantic-question-${session.sequence}`
), { message: 'Active question must match the issued session sequence' });
export type SemanticGuardrailSession = z.infer<typeof SemanticGuardrailSessionSchema>;

/** Null explicitly removes a year bound; omitted bounds or contradictory answers are malformed. */
export const SemanticGuardrailResponseSchema = z.discriminatedUnion('action', [
  z.object({ ...binding, action: z.literal('select-target'), personId: AcceptedPersonSchema.shape.id }).strict(),
  z.object({
    ...binding, action: z.literal('correct-years'),
    minYear: SearchFiltersSchema.shape.minYear.unwrap().nullable(),
    maxYear: SearchFiltersSchema.shape.maxYear.unwrap().nullable(),
  }).strict().refine((answer) => answer.minYear === null || answer.maxYear === null || answer.minYear <= answer.maxYear,
    { message: 'Corrected year bounds must be consistent', path: ['maxYear'] }),
  z.object({ ...binding, action: z.literal('select-meaning'), optionRef: reference }).strict(),
]);
