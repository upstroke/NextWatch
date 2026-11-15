import {
  PersonClarificationOfferSchema,
  PersonClarificationSessionSchema,
} from '@lib/schemas/person-clarification-session';
import type { PersonClarificationSession } from '@lib/schemas/person-clarification-session';
import type { PendingPersonQuery, SearchState } from '@lib/schemas/search-state';
import { applyPersonClarificationAction } from './apply-person-clarification-action';
import type { ApplyPersonClarificationActionResult } from './apply-person-clarification-action';

export type PersonClarificationLifecycleResult =
  | { status: 'active'; session: PersonClarificationSession }
  | { status: 'needs-question'; session: PersonClarificationSession; request: PendingPersonQuery }
  | { status: 'complete'; session: PersonClarificationSession }
  | {
      status: 'rejected';
      reason:
        | 'invalid-session'
        | 'invalid-offer'
        | 'stale-revision'
        | 'unknown-request'
        | 'out-of-order-request'
        | 'sequence-exhausted';
    };

/**
 * Keeps at most the current first pending person's question. Stale questions are
 * retired, never rebased. A needs-question result requires fresh, current offer
 * data rather than reuse of old candidates. complete concerns people only, not
 * keyword resolution or permission to execute a search. Inputs are not mutated.
 * state is previously validated; sessionInput is application-owned stored data.
 * Call after any accepted WP 009 transition, including trusted person acceptance.
 */
export function reconcilePersonClarification(
  state: SearchState,
  sessionInput: unknown,
): PersonClarificationLifecycleResult {
  const parsed = PersonClarificationSessionSchema.safeParse(sessionInput);
  if (!parsed.success) return { status: 'rejected', reason: 'invalid-session' };
  const session = parsed.data;
  const request = state.pendingQueries.personQueries[0];
  if (
    session.activeQuestion !== null &&
    session.activeQuestion.sourceRevision === state.revision &&
    session.activeQuestion.ref === request?.ref
  ) {
    return { status: 'active', session };
  }
  session.activeQuestion = null;
  return request
    ? { status: 'needs-question', session, request: { ...request } }
    : { status: 'complete', session };
}

/**
 * Offers fresh application-owned selection/no-match data for the first pending
 * person and issues a new session-scoped reference, even at the same revision.
 * Does not establish provider provenance, fetch data or alter search criteria.
 * Persist returned sessions; do not reset their sequence or accept them from a client.
 */
export function offerPersonClarification(
  state: SearchState,
  sessionInput: unknown,
  offerInput: unknown,
): PersonClarificationLifecycleResult {
  const current = reconcilePersonClarification(state, sessionInput);
  if (current.status === 'rejected') return current;
  const offer = PersonClarificationOfferSchema.safeParse(offerInput);
  if (!offer.success) return { status: 'rejected', reason: 'invalid-offer' };
  if (offer.data.sourceRevision !== state.revision) {
    return { status: 'rejected', reason: 'stale-revision' };
  }
  if (!state.pendingQueries.personQueries.some((request) => request.ref === offer.data.ref)) {
    return { status: 'rejected', reason: 'unknown-request' };
  }
  if (state.pendingQueries.personQueries[0]?.ref !== offer.data.ref) {
    return { status: 'rejected', reason: 'out-of-order-request' };
  }
  if (current.session.sequence === Number.MAX_SAFE_INTEGER) {
    return { status: 'rejected', reason: 'sequence-exhausted' };
  }
  const sequence = current.session.sequence + 1;
  return {
    status: 'active',
    session: {
      sequence,
      activeQuestion: { ...offer.data, clarificationRef: `person-question-${sequence}` },
    },
  };
}

export type ProcessPersonClarificationActionResult =
  | { status: 'rejected'; reason: 'invalid-session' }
  | {
      status: 'processed';
      session: PersonClarificationSession;
      outcome: ApplyPersonClarificationActionResult;
    };

/**
 * Reconciles the active question, delegates action rules and retires consumed
 * questions. Rejected actions retain a still-current question. Stale/removed
 * questions stay retired and cannot be recreated from a client answer.
 * Follow-up only prepares later parsing/resolution; it does not accept a correction.
 * The caller must persist the returned session and any applied outcome.state
 * together, with concurrency control. No persistence, provider or UI work occurs.
 */
export function processPersonClarificationAction(
  state: SearchState,
  sessionInput: unknown,
  input: unknown,
): ProcessPersonClarificationActionResult {
  const current = reconcilePersonClarification(state, sessionInput);
  if (current.status === 'rejected') return { status: 'rejected', reason: 'invalid-session' };
  const outcome = applyPersonClarificationAction(state, current.session.activeQuestion, input);
  if (outcome.status === 'applied' || outcome.status === 'follow-up') {
    current.session.activeQuestion = null;
  }
  return { status: 'processed', session: current.session, outcome };
}
