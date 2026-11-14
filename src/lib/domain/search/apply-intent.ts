import { ChatIntentSchema } from '@lib/schemas/chat';
import type { ChatIntent } from '@lib/schemas/chat';
import { SearchFiltersSchema } from '@lib/schemas/search';
import type { SearchFilters } from '@lib/schemas/search';
import { applyChangeTo } from './extraction';

type Clarification = ChatIntent['clarification'];

/**
 * Result of applying a chat intent to the active search filters.
 *
 * - `applied`: the intent was valid; `filters` is the new state (possibly
 *   equal to the previous state when the changes were ineffective).
 * - `unchanged`: the intent was not applied; `reason` describes why and
 *   `clarification` carries the pending clarification requirement, if any.
 * - `rejected`: the intent was structurally invalid or violates the
 *   revision guard; the previous state remains authoritative.
 */
export type ApplyIntentResult =
  | { status: 'applied'; filters: SearchFilters }
  | {
      status: 'unchanged';
      reason: 'clarification' | 'unsupported' | 'error-status' | 'no-effective-change';
      clarification?: Clarification;
    }
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

/**
 * Compares two search filter objects for equality, independent of key order.
 * Both contain only strings, numbers, arrays of numbers and undefined.
 */
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

/**
 * Applies a validated chat intent to the active search filters.
 *
 * The application is atomic: either every change is valid and applied, or
 * nothing changes. The previous filters are never modified; a successful
 * application returns a new filters object. Unknown fields and invalid
 * operations or values reject the whole intent. The intent must carry the
 * current revision; a stale revision is rejected.
 *
 * @param filters Active search filters (unchanged on any non-applied outcome).
 * @param intent Chat intent as produced by the parser.
 * @param revision Current search state revision the intent must match.
 * @returns The application result; see {@link ApplyIntentResult}.
 */
export function applyIntent(
  filters: SearchFilters,
  intent: ChatIntent,
  revision: number,
): ApplyIntentResult {
  const parsedIntent = ChatIntentSchema.safeParse(intent);
  if (!parsedIntent.success) {
    return { status: 'rejected', reason: 'invalid-intent' };
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

  if (parsedIntent.data.baseRevision !== revision) {
    return { status: 'rejected', reason: 'stale-revision' };
  }

  const candidate: SearchFilters = { ...filters };

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

  if (filtersEqual(filters, validated.data)) {
    return { status: 'unchanged', reason: 'no-effective-change' };
  }

  return { status: 'applied', filters: validated.data };
}
