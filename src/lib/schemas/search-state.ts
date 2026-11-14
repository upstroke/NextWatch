import { z } from 'zod';
import { MAX_KEYWORD_IDS, MAX_PERSON_IDS } from '@lib/config/domain';
import { SearchFiltersSchema } from '@lib/schemas/search';

/** Search mode; transitions are decided by the domain, not by this schema. */
export const SearchModeSchema = z.enum(['trending', 'discover']);

export type SearchMode = z.infer<typeof SearchModeSchema>;

/** Active state filters, retaining the WP 008 rules and adding resolved cast IDs. */
export const ActiveSearchFiltersSchema = SearchFiltersSchema.safeExtend({
  personIds: z.array(z.number().int().positive()).max(MAX_PERSON_IDS).default([]),
});

export type ActiveSearchFilters = z.infer<typeof ActiveSearchFiltersSchema>;

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
 * Mode, revision and filters are explicit; initialization and transitions
 * are supplied by the domain in the subsequent implementation step.
 * This schema does not establish ID provenance or perform entity resolution.
 */
export const SearchStateSchema = z
  .object({
    mode: SearchModeSchema,
    revision: z.number().int().nonnegative(),
    filters: ActiveSearchFiltersSchema,
    pendingQueries: PendingEntityQueriesSchema.default(() => ({
      personQueries: [],
      keywordQueries: [],
    })),
  })
  .strict();

export type SearchState = z.infer<typeof SearchStateSchema>;
