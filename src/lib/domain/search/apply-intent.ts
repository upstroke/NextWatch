import { ChatIntentSchema } from '@lib/schemas/chat';
import type { ChatIntent } from '@lib/schemas/chat';
import { SearchFiltersSchema } from '@lib/schemas/search';
import type { SearchFilters } from '@lib/schemas/search';
import { SearchStateSchema } from '@lib/schemas/search-state';
import type { SearchState } from '@lib/schemas/search-state';
import { applyChangeTo } from './extraction';
import { getSearchMode } from './get-search-mode';

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

/** Compares schema-normalized, unique ID lists without assigning meaning to order. */
function idSetsEqual(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((id) => b.includes(id));
}

/** Compares effective filter criteria, not the presentation order of ID lists. */
function filtersEqual(a: SearchFilters, b: SearchFilters): boolean {
  return (
    a.mediaType === b.mediaType &&
    a.sortBy === b.sortBy &&
    a.minRating === b.minRating &&
    a.minYear === b.minYear &&
    a.maxYear === b.maxYear &&
    idSetsEqual(a.keywordIds, b.keywordIds) &&
    idSetsEqual(a.genreIds, b.genreIds)
  );
}

/**
 * Validates a chat intent and atomically applies supported filter changes.
 * Only effective accepted changes update mode and increment revision once.
 * Genre/keyword order and duplicate IDs are not effective criteria changes.
 * Unchanged ID sets retain their existing order even when another filter changes.
 * Accepted people and referenced pending requests are preserved, not resolved.
 * Whole-state validation prevents active filter changes from consuming slots
 * already reserved by pending requests. Applied states share no mutable records
 * or arrays with the input. Non-applied outcomes request no search.
 * @param state Current, previously validated search state.
 * @param intent Untrusted structured chat intent.
 * @returns A complete new state or a non-applied outcome.
 */
export function applyIntent(state: SearchState, intent: unknown): ApplyIntentResult {
  const parsedIntent = ChatIntentSchema.safeParse(intent);
  if (!parsedIntent.success) return { status: 'rejected', reason: 'invalid-intent' };
  if (parsedIntent.data.baseRevision !== state.revision)
    return { status: 'rejected', reason: 'stale-revision' };
  if (parsedIntent.data.status === 'needs_clarification') {
    return {
      status: 'unchanged',
      reason: 'clarification',
      clarification: parsedIntent.data.clarification,
    };
  }
  if (parsedIntent.data.status === 'unsupported')
    return { status: 'unchanged', reason: 'unsupported' };
  if (parsedIntent.data.status === 'error') return { status: 'unchanged', reason: 'error-status' };

  const candidate: SearchFilters = { ...state.filters };
  for (const change of parsedIntent.data.changes) {
    const application = applyChangeTo(candidate, change);
    if (!application.ok)
      return { status: 'rejected', reason: application.reason, field: change.field };
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
  if (filtersEqual(state.filters, validated.data))
    return { status: 'unchanged', reason: 'no-effective-change' };

  // Preserve presentation order for unchanged sets in an otherwise effective intent.
  if (idSetsEqual(state.filters.keywordIds, validated.data.keywordIds)) {
    validated.data.keywordIds = [...state.filters.keywordIds];
  }
  if (idSetsEqual(state.filters.genreIds, validated.data.genreIds)) {
    validated.data.genreIds = [...state.filters.genreIds];
  }

  const nextState = SearchStateSchema.safeParse({
    ...state,
    filters: validated.data,
    mode: getSearchMode({ ...state, filters: validated.data }),
    revision: state.revision + 1,
  });
  if (!nextState.success) return { status: 'rejected', reason: 'invalid-value' };
  return { status: 'applied', state: nextState.data };
}
