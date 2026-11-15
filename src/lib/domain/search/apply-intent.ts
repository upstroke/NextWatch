import { ChatIntentSchema } from '@lib/schemas/chat';
import type { ChatIntent } from '@lib/schemas/chat';
import { SearchFiltersSchema } from '@lib/schemas/search';
import type { SearchFilters } from '@lib/schemas/search';
import { SearchStateSchema } from '@lib/schemas/search-state';
import type { InactiveGenre, SearchState } from '@lib/schemas/search-state';
import { applyChangeTo } from './extraction';
import { getSearchMode } from './get-search-mode';
import { getGenreWish, prepareGenreCompatibility } from './genre-compatibility';
import type { GenreCompatibilityFailure, GenreMediaChange } from './genre-compatibility';

type Clarification = Extract<ChatIntent, { status: 'needs_clarification' }>['clarification'];

/** Non-applied outcomes leave the caller's complete search state authoritative. */
export type ApplyIntentResult =
  | { status: 'applied'; state: SearchState; mediaChange?: GenreMediaChange }
  | { status: 'unchanged'; reason: 'clarification'; clarification: Clarification }
  | { status: 'unchanged'; reason: 'unsupported' | 'error-status' | 'no-effective-change' }
  | {
      status: 'rejected';
      reason:
        | 'invalid-intent'
        | 'stale-revision'
        | 'unknown-field'
        | 'invalid-operation'
        | 'invalid-value'
        | GenreCompatibilityFailure;
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

function inactiveGenresEqual(a: InactiveGenre[], b: InactiveGenre[]): boolean {
  return (
    a.length === b.length &&
    a.every((genre) =>
      b.some((other) => genre.id === other.id && genre.position === other.position),
    )
  );
}

/**
 * Validates a chat intent and atomically applies supported criteria changes.
 * Genre operations address the complete wish, including remembered inactive values.
 * A media change partitions that wish using supplied complete genre catalogs.
 * Effective filter or return-value changes increment revision exactly once.
 * Reordering/repeating IDs alone preserves state and revision. Unchanged active
 * ID sets keep their stored order even when another filter changes.
 * Accepted people and pending queries remain preserved; no network or UI work occurs.
 * @param state Current, previously validated search state.
 * @param intent Untrusted structured chat intent, not catalog data.
 * @param genreCatalogs Complete loaded Movie/TV lists from the application, not the LLM.
 * @returns A new state and optional feedback facts, otherwise a non-applied outcome.
 */
export function applyIntent(
  state: SearchState,
  intent: unknown,
  genreCatalogs?: unknown,
): ApplyIntentResult {
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

  const originalWish = getGenreWish(state);
  const candidate: SearchFilters = { ...state.filters, genreIds: [...originalWish] };
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
  if (idSetsEqual(originalWish, validated.data.genreIds)) {
    validated.data.genreIds = [...originalWish];
  }
  const prepared = prepareGenreCompatibility(state, validated.data, genreCatalogs);
  if (!prepared.ok) return { status: 'rejected', reason: prepared.reason };
  const nextFilters = prepared.filters;
  if (
    filtersEqual(state.filters, nextFilters) &&
    inactiveGenresEqual(state.inactiveGenres ?? [], prepared.inactiveGenres)
  ) {
    return { status: 'unchanged', reason: 'no-effective-change' };
  }

  if (idSetsEqual(state.filters.keywordIds, nextFilters.keywordIds)) {
    nextFilters.keywordIds = [...state.filters.keywordIds];
  }
  if (idSetsEqual(state.filters.genreIds, nextFilters.genreIds)) {
    nextFilters.genreIds = [...state.filters.genreIds];
  }
  const nextCandidate: SearchState = {
    ...state,
    filters: nextFilters,
    mode: getSearchMode({ ...state, filters: nextFilters }),
    revision: state.revision + 1,
  };
  if (prepared.inactiveGenres.length > 0) nextCandidate.inactiveGenres = prepared.inactiveGenres;
  else delete nextCandidate.inactiveGenres;
  const nextState = SearchStateSchema.safeParse(nextCandidate);
  if (!nextState.success) return { status: 'rejected', reason: 'invalid-value' };
  return prepared.mediaChange
    ? { status: 'applied', state: nextState.data, mediaChange: prepared.mediaChange }
    : { status: 'applied', state: nextState.data };
}
