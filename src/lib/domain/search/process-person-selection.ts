import type { PersonClarificationSession } from '@lib/schemas/person-clarification-session';
import type { PendingPersonQuery, SearchState } from '@lib/schemas/search-state';
import { PersonAcceptanceSchema } from '@lib/schemas/search-transition';
import { acceptResolvedPerson } from './pending-operations';
import type { PendingTransitionResult } from './pending-operations';
import { reconcilePersonClarification } from './person-clarification-lifecycle';
import { validatePersonSelection } from './validate-person-selection';
import type { ValidatePersonSelectionResult } from './validate-person-selection';

/**
 * Trusted application dependency, never a function/flag supplied by a client.
 * Must synchronously validate provider provenance from trusted resolution context
 * and return the matching WP 009 acceptance input, not a boolean assertion.
 * Structural parsing of that return value is not proof of provenance by itself.
 * The implementation must be side-effect-free; live lookup belongs to WP 014.
 */
export type PersonSelectionIdentityValidator = (context: {
  selection: Extract<ValidatePersonSelectionResult, { status: 'validated' }>;
  request: PendingPersonQuery;
}) => unknown;

export type ProcessPersonSelectionResult =
  | { status: 'rejected'; reason: 'invalid-session' }
  | {
      status: 'processed';
      session: PersonClarificationSession;
      outcome:
        | PendingTransitionResult
        | Extract<ValidatePersonSelectionResult, { status: 'rejected' }>
        | {
            status: 'rejected';
            reason:
              | 'resolution-validation-required'
              | 'resolution-validation-error'
              | 'invalid-resolution'
              | 'resolution-mismatch';
          };
      nextRequest?: PendingPersonQuery;
    };

/**
 * Coordinates selection with the current application-owned clarification session.
 * state must already be validated; sessionInput must come from application storage.
 * No identity is accepted without both offered-set validation and the trusted
 * resolution validator. Client names, IDs and approval flags are never acceptance
 * inputs. Provider-validated canonical names may differ from presentation names.
 * Rejected selections retain a still-current question; stale questions stay retired.
 * Successful WP 009 acceptance closes the question and returns the next pending
 * person, if any. Its offer must use outcome.state.revision and fresh resolution
 * data; candidates are not rebased and the next question is not fabricated here.
 * Inputs are not mutated. Persist the session and any applied state atomically
 * with concurrency control. No network, persistence, UI or search execution occurs.
 */
export function processPersonSelection(
  state: SearchState,
  sessionInput: unknown,
  input: unknown,
  validateIdentity?: PersonSelectionIdentityValidator,
): ProcessPersonSelectionResult {
  const current = reconcilePersonClarification(state, sessionInput);
  if (current.status === 'rejected') return { status: 'rejected', reason: 'invalid-session' };
  const session = current.session;
  const selected = validatePersonSelection(state, session.activeQuestion, input);
  if (selected.status === 'rejected') {
    return { status: 'processed', session, outcome: selected };
  }
  if (typeof validateIdentity !== 'function') {
    return {
      status: 'processed',
      session,
      outcome: { status: 'rejected', reason: 'resolution-validation-required' },
    };
  }
  const request = state.pendingQueries.personQueries.find((entry) => entry.ref === selected.ref);
  if (!request) {
    return { status: 'processed', session, outcome: { status: 'rejected', reason: 'unknown-request' } };
  }

  let resolution: unknown;
  try {
    resolution = validateIdentity({ selection: structuredClone(selected), request: { ...request } });
  } catch {
    return {
      status: 'processed',
      session,
      outcome: { status: 'rejected', reason: 'resolution-validation-error' },
    };
  }
  const acceptance = PersonAcceptanceSchema.safeParse(resolution);
  if (!acceptance.success) {
    return { status: 'processed', session, outcome: { status: 'rejected', reason: 'invalid-resolution' } };
  }
  if (
    acceptance.data.ref !== selected.ref ||
    acceptance.data.sourceRevision !== selected.sourceRevision ||
    acceptance.data.person.id !== selected.candidate.id
  ) {
    return { status: 'processed', session, outcome: { status: 'rejected', reason: 'resolution-mismatch' } };
  }

  const outcome = acceptResolvedPerson(state, acceptance.data);
  if (outcome.status !== 'applied') return { status: 'processed', session, outcome };
  session.activeQuestion = null;
  const nextRequest = outcome.state.pendingQueries.personQueries[0];
  return nextRequest
    ? { status: 'processed', session, outcome, nextRequest: { ...nextRequest } }
    : { status: 'processed', session, outcome };
}
