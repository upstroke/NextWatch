import {
  PersonClarificationActionSchema,
  PersonClarificationSchema,
} from '@lib/schemas/person-clarification-flow';
import type { PersonClarificationAction } from '@lib/schemas/person-clarification-flow';
import type { PendingPersonQuery, SearchState } from '@lib/schemas/search-state';
import { applyPendingQueryCommand } from './pending-operations';
import type { PendingTransitionResult } from './pending-operations';

export type ApplyPersonClarificationActionResult =
  | PendingTransitionResult
  | {
      status: 'follow-up';
      action: Extract<PersonClarificationAction, { action: 'refine' | 'more-candidates' }>;
      request: PendingPersonQuery;
    }
  | {
      status: 'rejected';
      reason:
        | 'no-active-clarification'
        | 'invalid-clarification'
        | 'invalid-action'
        | 'question-mismatch'
        | 'action-unavailable';
    };

/**
 * Processes an untrusted follow-up against an application-owned active question.
 * state must already be validated. activeClarification must come from application
 * storage, not from the client; parsing checks structure rather than provenance.
 * Only explicit removal/discard changes state, through the existing WP 009 command.
 * Follow-up results carry copied request context for later parsing or resolution;
 * they do not apply hints as new queries, fetch candidates or start a search.
 * The caller owns question lifecycle: retire a completed question and issue a new
 * clarificationRef for a replacement group, even without a revision change.
 * No inputs are mutated. Accepted replacement targets are never removed here.
 * @param state Current, previously validated search state.
 * @param activeClarification Application-owned selection/no-match question, or null/undefined.
 * @param input Untrusted clarification action.
 * @returns A pending transition, a deferred follow-up or a rejection.
 */
export function applyPersonClarificationAction(
  state: SearchState,
  activeClarification: unknown,
  input: unknown,
): ApplyPersonClarificationActionResult {
  if (activeClarification === null || activeClarification === undefined) {
    return { status: 'rejected', reason: 'no-active-clarification' };
  }
  const question = PersonClarificationSchema.safeParse(activeClarification);
  if (!question.success) return { status: 'rejected', reason: 'invalid-clarification' };
  const parsedAction = PersonClarificationActionSchema.safeParse(input);
  if (!parsedAction.success) return { status: 'rejected', reason: 'invalid-action' };
  const action = parsedAction.data;

  if (question.data.sourceRevision !== state.revision || action.sourceRevision !== state.revision) {
    return { status: 'rejected', reason: 'stale-revision' };
  }
  if (
    action.clarificationRef !== question.data.clarificationRef ||
    action.ref !== question.data.ref
  ) {
    return { status: 'rejected', reason: 'question-mismatch' };
  }
  const request = state.pendingQueries.personQueries.find((entry) => entry.ref === action.ref);
  if (!request) return { status: 'rejected', reason: 'unknown-request' };

  if (
    action.action === 'more-candidates' &&
    (question.data.kind !== 'person-selection' || !question.data.hasMore)
  ) {
    return { status: 'rejected', reason: 'action-unavailable' };
  }
  if (action.action === 'refine' || action.action === 'more-candidates') {
    return { status: 'follow-up', action, request: { ...request } };
  }

  return applyPendingQueryCommand(state, {
    entity: 'person',
    operation: 'remove',
    baseRevision: action.sourceRevision,
    ref: action.ref,
  });
}
