import { z } from 'zod';
import { PersonSelectionClarificationSchema } from './clarification';
import {
  PersonClarificationSchema,
  PersonNoMatchClarificationSchema,
} from './person-clarification-flow';

/** Fresh application-supplied resolution data; the lifecycle issues the question reference. */
export const PersonClarificationOfferSchema = z.discriminatedUnion('kind', [
  PersonSelectionClarificationSchema.omit({ clarificationRef: true }),
  PersonNoMatchClarificationSchema.omit({ clarificationRef: true }),
]);
export type PersonClarificationOffer = z.infer<typeof PersonClarificationOfferSchema>;

/**
 * Application-owned session data, separate from SearchState and never client-authoritative.
 * Initialize once per session and retain sequence even when no question is active.
 * References are unique within that session; session routing/storage is the caller's responsibility.
 */
export const PersonClarificationSessionSchema = z
  .object({
    sequence: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).default(0),
    activeQuestion: PersonClarificationSchema.nullable().default(null),
  })
  .strict()
  .superRefine((session, context) => {
    if (
      session.activeQuestion !== null &&
      (session.sequence === 0 ||
        session.activeQuestion.clarificationRef !== `person-question-${session.sequence}`)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['activeQuestion', 'clarificationRef'],
        message: 'Active question must match the issued session sequence',
      });
    }
  });
export type PersonClarificationSession = z.infer<typeof PersonClarificationSessionSchema>;
