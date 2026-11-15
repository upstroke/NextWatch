import { ChatIntentSchema } from '@lib/schemas/chat';
import type { ChatIntent } from '@lib/schemas/chat';
import { SearchFiltersSchema } from '@lib/schemas/search';
import type { SearchFilters } from '@lib/schemas/search';
import type { SearchState } from '@lib/schemas/search-state';
import { applyChangeTo } from './extraction';

type Clarification = Extract<ChatIntent, { status: 'needs_clarification' }>['clarification'];

/** Non-applied outcomes leave the caller's complete search state authoritative. */
export type ApplyIntentResult =
  | { status: 'applied'; state: SearchState }
  | { status: 'unchanged'; reason: 'clarification'; clarification: Clarification }
  | { status: 'unchanged'; reason: 'unsupported' | 'error-status' | 'no-effective-change' }
  | {
      status: 'rejected';
      reason:
        | 'invalid-intent'
        | 'stale-revision'
        | 'unknown-field'
        | 'invalid-operation'
        | 'invalid-value';
      field?: string;
    };

/** Compares stored filters without changing the existing ID-list ordering semantics. */
function filtersEqual(a: SearchFilters, b: SearchFilters): boolean {
  return (
    a.mediaType === b.mediaType &&
    a.sortBy === b.sortBy &&
    a.minRating === b.minRating &&
    a.minYear === b.minYear &&
    a.maxYear === b.maxYear &&
    a.keywordIds.length === b.keywordIds.length &&
    a.keywordIds.every((id, index) => id === b.keywordIds[index]) &&
    a.genreIds.length === b.genreIds.length &&
    a.genreIds.every((id, index) => id === b.genreIds[index])
  );
}

/** Default media scope and popularity sorting alone are not individual search criteria. */
function hasSearchCriteria(
  filters: SearchFilters,
  people: SearchState['people'],
  pending: SearchState['pendingQueries'],
) {
  return (
    filters.mediaType !== 'all' ||
    filters.sortBy !== 'popularity.desc' ||
    filters.minRating !== undefined ||
    filters.minYear !== undefined ||
    filters.maxYear !== undefined ||
    filters.genreIds.length > 0 ||
    filters.keywordIds.length > 0 ||
    people.length > 0 ||
    pending.personQueries.length > 0 ||
    pending.keywordQueries.length > 0
  );
}

/**
 * Validates a chat intent and atomically applies supported filter changes to search state.
 * Structural validation precedes the revision guard for every status.
 * Only effective accepted changes update mode and increment revision once.
 * Accepted people, including IDs and display names, and pending queries are
 * preserved. This entry point neither accepts person changes nor resolves
 * or extracts entities, and never stores derived person IDs in filters.
 * Non-applied outcomes leave the original state unchanged and request no search.
 *
 * @param state Current, previously validated domain search state.
 * @param intent Untrusted chat intent input.
 * @returns A new complete state when applied, otherwise a non-applied outcome.
 */
export function applyIntent(state: SearchState, intent: unknown): ApplyIntentResult {
  const parsedIntent = ChatIntentSchema.safeParse(intent);
  if (!parsedIntent.success) {
    return { status: 'rejected', reason: 'invalid-intent' };
  }
  if (parsedIntent.data.baseRevision !== state.revision) {
    return { status: 'rejected', reason: 'stale-revision' };
  }
  if (parsedIntent.data.status === 'needs_clarification') {
    return {
      status: 'unchanged',
      reason: 'clarification',
      clarification: parsedIntent.data.clarification,
    };
  }
  if (parsedIntent.data.status === 'unsupported') {
    return { status: 'unchanged', reason: 'unsupported' };
  }
  if (parsedIntent.data.status === 'error') {
    return { status: 'unchanged', reason: 'error-status' };
  }

  const candidate: SearchFilters = { ...state.filters };
  for (const change of parsedIntent.data.changes) {
    const application = applyChangeTo(candidate, change);
    if (!application.ok) {
      return { status: 'rejected', reason: application.reason, field: change.field };
    }
  }
  const validated = SearchFiltersSchema.safeParse(candidate);
  if (!validated.success) {
    const field = validated.error.issues[0]?.path[0];
    return {
      status: 'rejected',
      reason: 'invalid-value',
      field: typeof field === 'string' ? field : undefined,
    };
  }
  if (filtersEqual(state.filters, validated.data)) {
    return { status: 'unchanged', reason: 'no-effective-change' };
  }
  return {
    status: 'applied',
    state: {
      ...state,
      filters: validated.data,
      people: state.people.map((person) => ({ ...person })),
      pendingQueries: {
        personQueries: [...state.pendingQueries.personQueries],
        keywordQueries: [...state.pendingQueries.keywordQueries],
      },
      mode: hasSearchCriteria(validated.data, state.people, state.pendingQueries)
        ? 'discover'
        : 'trending',
      revision: state.revision + 1,
    },
  };
}
