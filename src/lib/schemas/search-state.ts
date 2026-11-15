import { z } from 'zod';
import { MAX_KEYWORD_IDS, MAX_PERSON_IDS } from '@lib/config/domain';
import { SearchFiltersSchema } from '@lib/schemas/search';

/** Search mode; transitions are decided by the domain, not by this schema. */
export const SearchModeSchema = z.enum(['trending', 'discover']);
export type SearchMode = z.infer<typeof SearchModeSchema>;

/** Technical projection; person IDs are derived from accepted people, never stored twice. */
export const ActiveSearchFiltersSchema = SearchFiltersSchema.safeExtend({
  personIds: z.array(z.number().int().positive()).max(MAX_PERSON_IDS).default([]),
});
export type ActiveSearchFilters = z.infer<typeof ActiveSearchFiltersSchema>;

/** Accepted identity and display name; structure does not establish provider provenance. */
export const AcceptedPersonSchema = z
  .object({ id: z.number().int().positive(), name: z.string().trim().min(1) })
  .strict();
export type AcceptedPerson = z.infer<typeof AcceptedPersonSchema>;

const pendingReference = z.string().min(1).regex(/^\S+$/);
const pendingText = z.string().trim().min(1);

/** Application-owned reference and unresolved name with explicit addition or replacement context. */
export const PendingPersonQuerySchema = z.discriminatedUnion('operation', [
  z.object({ ref: pendingReference, query: pendingText, operation: z.literal('add') }).strict(),
  z.object({
    ref: pendingReference,
    query: pendingText,
    operation: z.literal('replace'),
    targetPersonId: AcceptedPersonSchema.shape.id,
  }).strict(),
]);
export type PendingPersonQuery = z.infer<typeof PendingPersonQuerySchema>;

/** Unresolved keyword addition; the reference is not a provider ID. */
export const PendingKeywordQuerySchema = z
  .object({ ref: pendingReference, query: pendingText })
  .strict();
export type PendingKeywordQuery = z.infer<typeof PendingKeywordQuerySchema>;

/** Referenced pending requests; references are unique across both entity kinds. */
export const PendingEntityQueriesSchema = z
  .object({
    personQueries: z.array(PendingPersonQuerySchema).max(MAX_PERSON_IDS).default([]),
    keywordQueries: z.array(PendingKeywordQuerySchema).max(MAX_KEYWORD_IDS).default([]),
  })
  .strict()
  .superRefine((pending, context) => {
    const references = new Set<string>();
    for (const field of ['personQueries', 'keywordQueries'] satisfies (keyof typeof pending)[]) {
      pending[field].forEach((request, index) => {
        if (references.has(request.ref)) {
          context.addIssue({ code: 'custom', path: [field, index, 'ref'], message: 'Pending references must be unique' });
        }
        references.add(request.ref);
      });
    }
  });
export type PendingEntityQueries = z.infer<typeof PendingEntityQueriesSchema>;

/**
 * Framework-independent search state. Accepted people are the single source of
 * truth for technical person IDs. Legacy ID storage and pending strings are rejected.
 * Additions reserve slots alongside accepted criteria; replacements reserve their
 * existing target rather than another slot. Only one replacement may target a person.
 * Domain transitions own mode, revision and identity acceptance decisions.
 *
 * Required rule for the forthcoming controlled person-acceptance transition:
 * deduplicate by person ID, not display name. Accepting an addition that resolves
 * to an already accepted ID removes its pending request without adding a duplicate.
 * For replacement A -> B when B is already accepted, remove A and the matching
 * pending replacement atomically, leaving B exactly once; this is not a conflict.
 * Preserve unrelated criteria and pending requests. An effective acceptance
 * increments revision exactly once, including when only the pending request is
 * removed. Validate the request reference and source revision before acceptance.
 * This schema only rejects duplicate stored IDs; it does not implement that
 * transition or deduplicate incoming state payloads.
 */
export const SearchStateSchema = z
  .object({
    mode: SearchModeSchema,
    revision: z.number().int().nonnegative(),
    filters: SearchFiltersSchema,
    people: z.array(AcceptedPersonSchema).max(MAX_PERSON_IDS)
      .refine((people) => new Set(people.map((person) => person.id)).size === people.length, {
        message: 'Accepted person IDs must be unique',
      }).default([]),
    pendingQueries: PendingEntityQueriesSchema.default(() => ({ personQueries: [], keywordQueries: [] })),
  })
  .strict()
  .superRefine((state, context) => {
    const additions = state.pendingQueries.personQueries.filter((request) => request.operation === 'add');
    if (state.people.length + additions.length > MAX_PERSON_IDS) {
      context.addIssue({ code: 'custom', path: ['pendingQueries', 'personQueries'], message: 'Accepted people and pending additions exceed the person limit' });
    }
    if (state.filters.keywordIds.length + state.pendingQueries.keywordQueries.length > MAX_KEYWORD_IDS) {
      context.addIssue({ code: 'custom', path: ['pendingQueries', 'keywordQueries'], message: 'Active keywords and pending additions exceed the keyword limit' });
    }
    const acceptedIds = new Set(state.people.map((person) => person.id));
    const replacementTargets = new Set<number>();
    state.pendingQueries.personQueries.forEach((request, index) => {
      if (request.operation !== 'replace') return;
      if (!acceptedIds.has(request.targetPersonId) || replacementTargets.has(request.targetPersonId)) {
        context.addIssue({ code: 'custom', path: ['pendingQueries', 'personQueries', index, 'targetPersonId'], message: 'Replacement target must exist and have only one pending replacement' });
      }
      replacementTargets.add(request.targetPersonId);
    });
  });
export type SearchState = z.infer<typeof SearchStateSchema>;
