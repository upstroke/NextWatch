import { z } from 'zod';
import {
  MAX_PERSON_CLARIFICATION_CANDIDATES,
  MAX_PERSON_CLARIFICATION_KNOWN_TITLES,
} from '@lib/config/domain';
import { AcceptedPersonSchema } from './search-state';
import { PersonAcceptanceSchema } from './search-transition';
import { TmdbMediaTypeSchema } from './tmdb';

const reference = PersonAcceptanceSchema.shape.ref;
const sourceRevision = PersonAcceptanceSchema.shape.sourceRevision;

/** Identity-selection aid, not a filmography entry or a final search result. */
export const PersonClarificationKnownTitleSchema = z
  .object({
    title: z.string().trim().min(1),
    mediaType: TmdbMediaTypeSchema.exclude(['person']),
    year: z.number().int().positive().optional(),
  })
  .strict();
export type PersonClarificationKnownTitle = z.infer<typeof PersonClarificationKnownTitleSchema>;

/** Structural candidate data does not establish provider provenance or acceptance. */
export const PersonClarificationCandidateSchema = AcceptedPersonSchema.extend({
  knownFor: z
    .array(PersonClarificationKnownTitleSchema)
    .max(MAX_PERSON_CLARIFICATION_KNOWN_TITLES)
    .default([]),
}).strict();
export type PersonClarificationCandidate = z.infer<typeof PersonClarificationCandidateSchema>;

/**
 * One offered candidate group for one pending person request, separate from criteria.
 * The application owns clarificationRef and must issue a new value when replacing
 * the offered question/group, including when the search revision has not changed.
 * ref links to the existing pending request; addition/replacement context remains
 * authoritative in SearchState rather than being copied into this contract.
 * hasMore reports further candidates, not completeness of a truncated lookup.
 */
export const PersonSelectionClarificationSchema = z
  .object({
    kind: z.literal('person-selection'),
    clarificationRef: reference,
    ref: reference,
    sourceRevision,
    candidates: z
      .array(PersonClarificationCandidateSchema)
      .min(1)
      .max(MAX_PERSON_CLARIFICATION_CANDIDATES)
      .refine(
        (candidates) =>
          new Set(candidates.map((candidate) => candidate.id)).size === candidates.length,
        {
          message: 'Person clarification candidate IDs must be unique',
        },
      ),
    hasMore: z.boolean(),
  })
  .strict();
export type PersonSelectionClarification = z.infer<typeof PersonSelectionClarificationSchema>;

/**
 * Untrusted selection bound to an offered question, pending request and revision.
 * Parsing alone does not check the active question, current revision, existence
 * of the pending request or membership in its offered candidates. The domain
 * boundary must check those facts before WP 014 validation and WP 009 acceptance.
 * Additional descriptive text is not an identity selection under this schema.
 */
export const PersonSelectionAnswerSchema = z
  .object({
    clarificationRef: reference,
    ref: reference,
    sourceRevision,
    personId: AcceptedPersonSchema.shape.id,
  })
  .strict();
export type PersonSelectionAnswer = z.infer<typeof PersonSelectionAnswerSchema>;
