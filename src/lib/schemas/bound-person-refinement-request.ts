import { z } from 'zod';
import { ParserInvocationSchema } from './parser';
import { ParserContinuationBindingAssociationSchema } from './parser-continuation-binding';
import { PersonRefinementActionSchema } from './person-clarification-flow';

/**
 * Application-held original refinement submission and parser invocation.
 * Load this immutable association from trusted request storage, never the response.
 * Shape validation does not prove routing, provenance or invocation ownership.
 * The invocation is the existing parser snapshot, not another mutable query owner.
 */
export const BoundPersonRefinementRequestSchema = z
  .object({
    association: ParserContinuationBindingAssociationSchema,
    action: PersonRefinementActionSchema,
    invocation: ParserInvocationSchema,
  })
  .strict();
export type BoundPersonRefinementRequest = z.infer<typeof BoundPersonRefinementRequestSchema>;
