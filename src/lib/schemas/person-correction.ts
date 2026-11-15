import { z } from 'zod';
import { PersonRefinementActionSchema } from './person-clarification-flow';
import { PendingPersonQuerySchema } from './search-state';

/** Application-stored output of an authorized refine follow-up, not client-authoritative data. */
export const PersonRefinementContextSchema = z
  .object({ action: PersonRefinementActionSchema, request: PendingPersonQuerySchema })
  .strict()
  .refine((context) => context.action.ref === context.request.ref, {
    path: ['request', 'ref'],
    message: 'Refinement must refer to its captured pending person request',
  });
export type PersonRefinementContext = z.infer<typeof PersonRefinementContextSchema>;

/** Parsed correction text only; request operation and replacement target remain application-owned. */
export const PersonCorrectionSchema = PersonRefinementActionSchema.omit({
  action: true,
  text: true,
})
  .extend({ query: PendingPersonQuerySchema.options[0].shape.query })
  .strict();
export type PersonCorrection = z.infer<typeof PersonCorrectionSchema>;
