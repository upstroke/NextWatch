import { z } from 'zod';
import { ParserInvocationSchema, ParserQuerySchema } from './parser';

const base = {
  baseRevision: ParserInvocationSchema.shape.baseRevision,
  intentionRef: ParserInvocationSchema.shape.requestRef,
  expectedGeneration: ParserInvocationSchema.shape.baseRevision,
};

/** Application-owned edit command; not model authority or a clarification answer. */
export const ParserContinuationCommandSchema = z.union([
  z.object({
    ...base, operation: z.literal('refine'),
    queryRef: ParserInvocationSchema.shape.requestRef, query: ParserQuerySchema,
  }).strict(),
  z.object({ ...base, operation: z.literal('discard'), scope: z.literal('intention') }).strict(),
  z.object({
    ...base, operation: z.literal('discard'), scope: z.literal('query'),
    queryRef: ParserInvocationSchema.shape.requestRef,
  }).strict(),
]);
export type ParserContinuationCommand = z.infer<typeof ParserContinuationCommandSchema>;
