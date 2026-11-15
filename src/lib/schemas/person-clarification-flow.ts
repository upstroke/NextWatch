import { z } from 'zod';
import {
  PersonSelectionAnswerSchema,
  PersonSelectionClarificationSchema,
} from './clarification';

const questionBinding = PersonSelectionAnswerSchema.omit({ personId: true });

/** A genuine no-match question offers correction or explicit removal, never candidates. */
export const PersonNoMatchClarificationSchema = questionBinding
  .extend({ kind: z.literal('person-no-match') })
  .strict();
export type PersonNoMatchClarification = z.infer<typeof PersonNoMatchClarificationSchema>;

/** Semantic person questions only; provider failures are deliberately excluded. */
export const PersonClarificationSchema = z.discriminatedUnion('kind', [
  PersonSelectionClarificationSchema,
  PersonNoMatchClarificationSchema,
]);
export type PersonClarification = z.infer<typeof PersonClarificationSchema>;

/**
 * Sanitized technical outcome, not a semantic question or a no-match assertion.
 * No raw provider error, automatic retry or user-selectable identity is carried.
 */
export const PersonResolutionErrorSchema = questionBinding
  .omit({ clarificationRef: true })
  .extend({ kind: z.literal('person-resolution-error') })
  .strict();
export type PersonResolutionError = z.infer<typeof PersonResolutionErrorSchema>;

/**
 * Untrusted follow-up actions, bound to an application-owned question and revision.
 * refine.text is an unparsed hint/correction, not a competing pending-request model.
 * Later parsing/resolution must preserve the existing request reference and its
 * addition/replacement context when producing a WP 009 pending command.
 * remove explicitly removes the pending condition; discard-change abandons the
 * pending change. Neither action implicitly removes an accepted replacement target.
 * more-candidates changes the offered group, not the accepted search criteria.
 * Parsing does not authorize an action: the domain must check the active question,
 * current revision, matching pending person and action availability (including
 * hasMore for more-candidates). No state transition or provider lookup occurs here.
 */
export const PersonClarificationActionSchema = z.discriminatedUnion('action', [
  questionBinding
    .extend({ action: z.literal('refine'), text: z.string().trim().min(1) })
    .strict(),
  questionBinding.extend({ action: z.literal('more-candidates') }).strict(),
  questionBinding.extend({ action: z.literal('remove') }).strict(),
  questionBinding.extend({ action: z.literal('discard-change') }).strict(),
]);
export type PersonClarificationAction = z.infer<typeof PersonClarificationActionSchema>;

/** Keeps existing selection answers compatible; additional text is never an identity selection. */
export const PersonClarificationResponseSchema = z.union([
  PersonSelectionAnswerSchema,
  PersonClarificationActionSchema,
]);
export type PersonClarificationResponse = z.infer<typeof PersonClarificationResponseSchema>;
