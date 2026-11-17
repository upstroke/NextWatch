import { PersonClarificationSessionSchema } from '@lib/schemas/person-clarification-session';
import type { PersonClarificationSession } from '@lib/schemas/person-clarification-session';
import type { SearchState } from '@lib/schemas/search-state';
import { applyParserContinuationCommand } from './apply-parser-continuation-command';
import type { ParserContinuationTransitionResult } from './apply-parser-continuation-command';
import { reconcilePersonClarification } from './person-clarification-lifecycle';

export type ProcessParserContinuationCommandResult =
  | Exclude<ParserContinuationTransitionResult, { status: 'applied' }>
  | { status: 'rejected'; reason: 'invalid-session' }
  | (Extract<ParserContinuationTransitionResult, { status: 'applied' }> & {
      session: PersonClarificationSession;
    });

/**
 * Applies an application-owned continuation edit and retires affected or stale
 * canonical person questions. Rejected/no-op commands do not reconcile sessions.
 * Inputs are not mutated. Persist the applied state, continuation and session
 * together under concurrency control; never persist an intermediate result.
 * No new question, lookup, retry or search is started. Owned-child question
 * bindings, staged results and full invocation lifetime remain separate work.
 * @param state Current previously validated search state.
 * @param continuationInput Application-owned current continuation.
 * @param sessionInput Application-owned stored person session, never client authority.
 * @param input Application-owned revision/generation-bound continuation command.
 * @returns A complete applied triple with invalidations, or a non-applied outcome.
 */
export function processParserContinuationCommand(
  state: SearchState,
  continuationInput: unknown,
  sessionInput: unknown,
  input: unknown,
): ProcessParserContinuationCommandResult {
  const parsedSession = PersonClarificationSessionSchema.safeParse(sessionInput);
  if (!parsedSession.success) return { status: 'rejected', reason: 'invalid-session' };
  const outcome = applyParserContinuationCommand(state, continuationInput, input);
  if (outcome.status !== 'applied') return outcome;

  const session = parsedSession.data;
  if (
    session.activeQuestion !== null &&
    outcome.invalidated.queryRefs.includes(session.activeQuestion.ref)
  ) {
    session.activeQuestion = null;
  }
  const reconciled = reconcilePersonClarification(outcome.state, session);
  if (reconciled.status === 'rejected') return { status: 'rejected', reason: 'invalid-session' };
  return { ...outcome, session: reconciled.session };
}
