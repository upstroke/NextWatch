import { z } from 'zod';
import { MAX_KEYWORD_IDS, MAX_PERSON_IDS } from '@lib/config/domain';
import { MediaTypeSchema, SearchFiltersSchema, SearchSortSchema } from '@lib/schemas/search';
import { PendingKeywordQuerySchema } from '@lib/schemas/search-state';

const assignment = z.enum(['set', 'replace']);

/** Parser-supported filter edits; IDs are allowed only for supplied catalog genres. */
export const ParserFilterChangeSchema = z.union([
  z.object({ field: z.literal('mediaType'), operation: assignment, value: MediaTypeSchema }).strict(),
  z.object({
    field: z.literal('sortBy'), operation: assignment, value: SearchSortSchema,
  }).strict(),
  z.object({
    field: z.literal('minRating'),
    operation: assignment,
    value: SearchFiltersSchema.shape.minRating.unwrap(),
  }).strict(),
  z.object({
    field: z.literal('minYear'),
    operation: assignment,
    value: SearchFiltersSchema.shape.minYear.unwrap(),
  }).strict(),
  z.object({
    field: z.literal('maxYear'),
    operation: assignment,
    value: SearchFiltersSchema.shape.maxYear.unwrap(),
  }).strict(),
  z.object({
    field: z.literal('genreIds'),
    operation: z.enum(['set', 'replace', 'add', 'remove']),
    value: z.array(z.number().int().positive()).pipe(SearchFiltersSchema.shape.genreIds),
  }).strict(),
  z.object({
    field: z.enum(['minRating', 'minYear', 'maxYear']),
    operation: z.literal('remove'),
    value: z.null(),
  }).strict(),
]);

const pendingTargetKey = z.string().regex(/^(person|keyword)-[1-9]\d*$/);

/** Local target syntax only; offered membership and request association require application checks. */
export const ParserPendingOperationSchema = z.discriminatedUnion('operation', [
  z.object({
    operation: z.literal('refine'),
    targetKey: pendingTargetKey,
    query: PendingKeywordQuerySchema.shape.query,
  }).strict(),
  z.object({
    operation: z.literal('discard'),
    targetKey: pendingTargetKey,
  }).strict(),
]);
export type ParserPendingOperation = z.infer<typeof ParserPendingOperationSchema>;

const proposalFields = {
  changes: z.array(ParserFilterChangeSchema).default([]),
  people: z.array(PendingKeywordQuerySchema.shape.query).max(MAX_PERSON_IDS).default([]),
  keywords: z.array(PendingKeywordQuerySchema.shape.query).max(MAX_KEYWORD_IDS).default([]),
  pendingOperations: z.array(ParserPendingOperationSchema)
    .max(MAX_PERSON_IDS + MAX_KEYWORD_IDS)
    .refine((operations) => new Set(operations.map((entry) => entry.targetKey)).size === operations.length, {
      message: 'A pending target may occur only once per proposal',
    })
    .optional(),
};

/**
 * Untrusted parser output, not replacement state or execution authorization.
 * People/keywords remain unresolved additions. Optional pendingOperations propose
 * refinement/discard of offered request-local targets, not accepted identities.
 * Missing operations mean no change; their presence does not authorize application.
 * Other entity operations require clarification/unsupported with a retained message.
 * Internal references, revisions and resolved identities remain application-owned.
 */
export const ParserProposalSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('ready'), ...proposalFields }).strict(),
  z.object({
    status: z.literal('needs_clarification'),
    ...proposalFields,
    message: z.string().trim().min(1),
  }).strict(),
  z.object({
    status: z.literal('unsupported'),
    ...proposalFields,
    message: z.string().trim().min(1),
  }).strict(),
]);

export type ParserProposal = z.infer<typeof ParserProposalSchema>;
