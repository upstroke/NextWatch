import {
  PersonCorrectionSchema,
  PersonRefinementContextSchema,
} from '@lib/schemas/person-correction';
import { PersonClarificationSessionSchema } from '@lib/schemas/person-clarification-session';
import type { SearchState } from '@lib/schemas/search-state';
import { applyPendingQueryCommand } from './pending-operations';
import type { PendingTransitionResult } from './pending-operations';

export type ApplyPersonCorrectionResult =
  | PendingTransitionResult
  | {
      status: 'rejected';
      reason:
        | 'invalid-session'
        | 'invalid-context'
        | 'invalid-correction'
        | 'obsolete-refinement'
        | 'refinement-mismatch'
        | 'request-changed';
    };

/**
 * Applies already parsed correction text using a stored, authorized refine context.
 * state is validated; session and context must come from application storage, not
 * from a client. Keep the captured follow-up after closing its visible question.
 * A newer question, changed revision or altered request invalidates that context.
 * Only query text is taken from the parser result; ref, operation and replacement
 * target come from the unchanged stored request. WP 009 owns normalization/no-op
 * and revision decisions. No parsing, identity resolution or search occurs here.
 * The returned session is not needed: the input session remains closed and intact.
 * Reconcile the lifecycle against any applied state and obtain fresh resolution
 * data before offering another question; never relabel old candidate revisions.
 * No inputs are mutated. Persist applied state/context consumption with concurrency control.
 */
export function applyPersonCorrection(
  state: SearchState,
  sessionInput: unknown,
  contextInput: unknown,
  input: unknown,
): ApplyPersonCorrectionResult {
  const session = PersonClarificationSessionSchema.safeParse(sessionInput);
  if (!session.success) return { status: 'rejected', reason: 'invalid-session' };
  const context = PersonRefinementContextSchema.safeParse(contextInput);
  if (!context.success) return { status: 'rejected', reason: 'invalid-context' };
  const correction = PersonCorrectionSchema.safeParse(input);
  if (!correction.success) return { status: 'rejected', reason: 'invalid-correction' };

  if (
    session.data.activeQuestion !== null ||
    session.data.sequence === 0 ||
    context.data.action.clarificationRef !== `person-question-${session.data.sequence}`
  ) {
    return { status: 'rejected', reason: 'obsolete-refinement' };
  }
  if (
    context.data.action.sourceRevision !== state.revision ||
    correction.data.sourceRevision !== state.revision
  ) {
    return { status: 'rejected', reason: 'stale-revision' };
  }
  if (
    correction.data.clarificationRef !== context.data.action.clarificationRef ||
    correction.data.ref !== context.data.action.ref
  ) {
    return { status: 'rejected', reason: 'refinement-mismatch' };
  }
  const captured = context.data.request;
  const request = state.pendingQueries.personQueries.find((entry) => entry.ref === captured.ref);
  if (!request) return { status: 'rejected', reason: 'unknown-request' };
  const sameOperation =
    captured.operation === 'add'
      ? request.operation === 'add'
      : request.operation === 'replace' && request.targetPersonId === captured.targetPersonId;
  if (
    !sameOperation ||
    request.query !== captured.query ||
    state.pendingQueries.personQueries[0]?.ref !== captured.ref
  ) {
    return { status: 'rejected', reason: 'request-changed' };
  }

  return applyPendingQueryCommand(state, {
    entity: 'person',
    operation: 'change',
    baseRevision: correction.data.sourceRevision,
    request: { ...request, query: correction.data.query },
  });
}
