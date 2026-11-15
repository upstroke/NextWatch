import { SearchStateSchema } from '@lib/schemas/search-state';
import type { SearchState } from '@lib/schemas/search-state';
import { PendingQueryCommandSchema, PersonAcceptanceSchema } from '@lib/schemas/search-transition';
import { getSearchMode } from './get-search-mode';

/** Non-applied outcomes preserve the caller's original state and request no search. */
export type PendingTransitionResult =
  | { status: 'applied'; state: SearchState }
  | { status: 'unchanged'; reason: 'no-effective-change' }
  | {
      status: 'rejected';
      reason:
        | 'invalid-input'
        | 'stale-revision'
        | 'unknown-request'
        | 'reference-in-use'
        | 'invalid-value';
    };

/** Whole-state acceptance enforces shared limits and creates independent records. */
function acceptCandidate(state: SearchState, candidate: SearchState): PendingTransitionResult {
  const parsed = SearchStateSchema.safeParse({
    ...candidate,
    mode: getSearchMode(candidate),
    revision: state.revision + 1,
  });
  if (!parsed.success) return { status: 'rejected', reason: 'invalid-value' };
  return { status: 'applied', state: parsed.data };
}

/**
 * Adds, changes or removes an application-referenced pending request atomically.
 * Changing a request preserves its reference; changing its query or replacement
 * context invalidates older responses by advancing revision. No names are parsed,
 * no IDs are resolved and no network requests or searches are started.
 * @param state Current, previously validated search state.
 * @param input Untrusted command with the current base revision.
 * @returns An accepted state, unchanged outcome or rejection without mutation.
 */
export function applyPendingQueryCommand(
  state: SearchState,
  input: unknown,
): PendingTransitionResult {
  const parsed = PendingQueryCommandSchema.safeParse(input);
  if (!parsed.success) return { status: 'rejected', reason: 'invalid-input' };
  const command = parsed.data;
  if (command.baseRevision !== state.revision)
    return { status: 'rejected', reason: 'stale-revision' };

  if (command.operation === 'remove') {
    const requests =
      command.entity === 'person'
        ? state.pendingQueries.personQueries
        : state.pendingQueries.keywordQueries;
    if (!requests.some((request) => request.ref === command.ref)) {
      return { status: 'rejected', reason: 'unknown-request' };
    }
    return acceptCandidate(state, {
      ...state,
      pendingQueries: {
        personQueries:
          command.entity === 'person'
            ? state.pendingQueries.personQueries.filter((request) => request.ref !== command.ref)
            : state.pendingQueries.personQueries,
        keywordQueries:
          command.entity === 'keyword'
            ? state.pendingQueries.keywordQueries.filter((request) => request.ref !== command.ref)
            : state.pendingQueries.keywordQueries,
      },
    });
  }

  const ref = command.request.ref;
  const referenceExists = [
    ...state.pendingQueries.personQueries,
    ...state.pendingQueries.keywordQueries,
  ].some((request) => request.ref === ref);
  if (command.operation === 'add' && referenceExists) {
    return { status: 'rejected', reason: 'reference-in-use' };
  }

  if (command.entity === 'person') {
    const request = command.request;
    const existing = state.pendingQueries.personQueries.find((entry) => entry.ref === ref);
    if (command.operation === 'change') {
      if (!existing) return { status: 'rejected', reason: 'unknown-request' };
      const sameContext =
        existing.operation === 'add'
          ? request.operation === 'add'
          : request.operation === 'replace' && existing.targetPersonId === request.targetPersonId;
      if (existing.query === request.query && sameContext) {
        return { status: 'unchanged', reason: 'no-effective-change' };
      }
    }
    const personQueries =
      command.operation === 'add'
        ? [...state.pendingQueries.personQueries, request]
        : state.pendingQueries.personQueries.map((entry) => (entry.ref === ref ? request : entry));
    return acceptCandidate(state, {
      ...state,
      pendingQueries: { ...state.pendingQueries, personQueries },
    });
  }

  const request = command.request;
  const existing = state.pendingQueries.keywordQueries.find((entry) => entry.ref === ref);
  if (command.operation === 'change') {
    if (!existing) return { status: 'rejected', reason: 'unknown-request' };
    if (existing.query === request.query)
      return { status: 'unchanged', reason: 'no-effective-change' };
  }
  const keywordQueries =
    command.operation === 'add'
      ? [...state.pendingQueries.keywordQueries, request]
      : state.pendingQueries.keywordQueries.map((entry) => (entry.ref === ref ? request : entry));
  return acceptCandidate(state, {
    ...state,
    pendingQueries: { ...state.pendingQueries, keywordQueries },
  });
}

/**
 * Accepts a trusted resolution outcome for the matching current pending person.
 * The caller must establish provider provenance and selection membership (WP 014);
 * this boundary validates structure, request association, revision and state rules.
 * Acceptance removes the pending request and adds or replaces the identity atomically.
 * IDs are deduplicated: A -> already accepted B removes A and retains B once.
 * An already accepted identity keeps its existing display name. Even duplicate
 * acceptance advances revision once because removing the pending request is effective.
 * @param state Current, previously validated search state.
 * @param input Resolution acceptance bound to its pending reference and source revision.
 * @returns An accepted state or rejection, preserving all unrelated criteria.
 */
export function acceptResolvedPerson(state: SearchState, input: unknown): PendingTransitionResult {
  const parsed = PersonAcceptanceSchema.safeParse(input);
  if (!parsed.success) return { status: 'rejected', reason: 'invalid-input' };
  const acceptance = parsed.data;
  if (acceptance.sourceRevision !== state.revision)
    return { status: 'rejected', reason: 'stale-revision' };
  const request = state.pendingQueries.personQueries.find((entry) => entry.ref === acceptance.ref);
  if (!request) return { status: 'rejected', reason: 'unknown-request' };

  const existing = state.people.find((person) => person.id === acceptance.person.id);
  const people =
    request.operation === 'replace'
      ? state.people.filter((person) => person.id !== request.targetPersonId)
      : [...state.people];
  if (!people.some((person) => person.id === acceptance.person.id)) {
    const position =
      request.operation === 'replace'
        ? state.people.findIndex((person) => person.id === request.targetPersonId)
        : people.length;
    people.splice(position, 0, existing ?? acceptance.person);
  }
  return acceptCandidate(state, {
    ...state,
    people,
    pendingQueries: {
      ...state.pendingQueries,
      personQueries: state.pendingQueries.personQueries.filter(
        (entry) => entry.ref !== acceptance.ref,
      ),
    },
  });
}
