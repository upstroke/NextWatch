import { z } from 'zod';
import { AcceptedPersonSchema, PendingKeywordQuerySchema, PendingPersonQuerySchema, SearchStateSchema } from './search-state';

const revision = SearchStateSchema.shape.revision;
const reference = PendingKeywordQuerySchema.shape.ref;

/** Application-supplied pending operations; references never come from model guesses. */
export const PendingQueryCommandSchema = z.union([
  z.object({
    entity: z.literal('person'),
    operation: z.enum(['add', 'change']),
    baseRevision: revision,
    request: PendingPersonQuerySchema,
  }).strict(),
  z.object({
    entity: z.literal('keyword'),
    operation: z.enum(['add', 'change']),
    baseRevision: revision,
    request: PendingKeywordQuerySchema,
  }).strict(),
  z.object({
    entity: z.enum(['person', 'keyword']),
    operation: z.literal('remove'),
    baseRevision: revision,
    ref: reference,
  }).strict(),
]);
export type PendingQueryCommand = z.infer<typeof PendingQueryCommandSchema>;

/**
 * Acceptance input from a trusted resolution boundary, not from a chat intent.
 * Structural validation cannot prove provider provenance or candidate membership;
 * WP 014 must establish these before calling the controlled domain transition.
 */
export const PersonAcceptanceSchema = z.object({
  ref: reference,
  sourceRevision: revision,
  person: AcceptedPersonSchema,
}).strict();
export type PersonAcceptance = z.infer<typeof PersonAcceptanceSchema>;
