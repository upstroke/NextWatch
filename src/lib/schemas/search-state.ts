import { z } from 'zod';
import { MAX_KEYWORD_IDS, MAX_PERSON_IDS } from '@lib/config/domain';
import { SearchFiltersSchema } from '@lib/schemas/search';

/** Search mode; transitions are decided by the domain, not by this schema. */
export const SearchModeSchema = z.enum(['trending', 'discover']);

export type SearchMode = z.infer<typeof SearchModeSchema>;

/**
 * Technical filter contract, including derived person IDs.
 * SearchState stores accepted people separately instead of persisting this projection.
 * This schema establishes neither ID provenance nor provider execution support.
 */
export const ActiveSearchFiltersSchema = SearchFiltersSchema.safeExtend({
  personIds: z.array(z.number().int().positive()).max(MAX_PERSON_IDS).default([]),
});

export type ActiveSearchFilters = z.infer<typeof ActiveSearchFiltersSchema>;

/**
 * Accepted person identity with its display name.
 * Structural validation does not establish provider provenance.
 */
export const AcceptedPersonSchema = z
  .object({
    id: z.number().int().positive(),
    name: z.string().trim().min(1),
  })
  .strict();

export type AcceptedPerson = z.infer<typeof AcceptedPersonSchema>;

/** Unresolved names and terms; parsing never converts these queries into IDs. */
export const PendingEntityQueriesSchema = z
  .object({
    personQueries: z.array(z.string().trim().min(1)).max(MAX_PERSON_IDS).default([]),
    keywordQueries: z.array(z.string().trim().min(1)).max(MAX_KEYWORD_IDS).default([]),
  })
  .strict();

export type PendingEntityQueries = z.infer<typeof PendingEntityQueriesSchema>;

/**
 * Framework-independent search state data contract.
 * Accepted people are the single source of truth for technical person IDs.
 * Legacy filters.personIds payloads are rejected by SearchFiltersSchema.
 * Pending-query references and replacement context are a subsequent migration.
 * Domain transitions own mode, revision and identity acceptance decisions.
 */
export const SearchStateSchema = z
  .object({
    mode: SearchModeSchema,
    revision: z.number().int().nonnegative(),
    filters: SearchFiltersSchema,
    people: z
      .array(AcceptedPersonSchema)
      .max(MAX_PERSON_IDS)
      .refine(
        (people) => new Set(people.map((person) => person.id)).size === people.length,
        { message: 'Accepted person IDs must be unique' },
      )
      .default([]),
    pendingQueries: PendingEntityQueriesSchema.default(() => ({
      personQueries: [],
      keywordQueries: [],
    })),
  })
  .strict();

export type SearchState = z.infer<typeof SearchStateSchema>;
