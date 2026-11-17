import { ParserInvocationSchema } from '@lib/schemas/parser';
import { ParserContinuationBindingRegistrySchema } from '@lib/schemas/parser-continuation-binding';
import type { ParserContinuationBindingRegistry } from '@lib/schemas/parser-continuation-binding';
import { PersonClarificationSessionSchema } from '@lib/schemas/person-clarification-session';
import type { PersonClarificationSession } from '@lib/schemas/person-clarification-session';
import type { SearchState } from '@lib/schemas/search-state';
import { applyParserContinuationCommand } from './apply-parser-continuation-command';
import type { ParserContinuationTransitionResult } from './apply-parser-continuation-command';
import { reconcileParserContinuationBindings } from './parser-continuation-binding';
import { reconcilePersonClarification } from './person-clarification-lifecycle';

export type ProcessParserContinuationCommandResult =
  | Exclude<ParserContinuationTransitionResult, { status: 'applied' }>
  | { status: 'rejected'; reason: 'invalid-session' }
  | Extract<ReturnType<typeof reconcileParserContinuationBindings>, { status: 'rejected' }>
  | (Extract<ParserContinuationTransitionResult, { status: 'applied' }> & {
      session: PersonClarificationSession;
      registry: ParserContinuationBindingRegistry;
      retiredBindingRefs: string[];
    });

/**
 * Applies a continuation edit and reconciles person questions and binding authority.
 * Registry and routed lifetime are checked first; rejected/no-op edits do not
 * reconcile or return partial stores. Applied proposals must be persisted together
 * under concurrency control. Registry, state, continuation and person session must
 * come from the same application-owned lifetime, never mixed client snapshots.
 * No binding/question is issued, no response consumed, and no lookup/retry/search
 * or pause/resume workflow starts. Staging and response processing remain separate.
 * @param state Current previously validated search state.
 * @param continuationInput Current application-owned continuation.
 * @param sessionInput Current application-owned person clarification session.
 * @param input Revision/generation-bound application edit command.
 * @param bindings Trusted routed session reference and stored binding registry.
 * @returns A complete applied four-store proposal with invalidations and retired refs, or a non-applied outcome.
 */
export function processParserContinuationCommand(
  state: SearchState,
  continuationInput: unknown,
  sessionInput: unknown,
  input: unknown,
  bindings: { expectedSessionRef: string; registry: unknown },
): ProcessParserContinuationCommandResult {
  const registry = ParserContinuationBindingRegistrySchema.safeParse(bindings.registry);
  if (!registry.success) return { status: 'rejected', reason: 'invalid-registry' };
  if (!ParserInvocationSchema.shape.requestRef.safeParse(bindings.expectedSessionRef).success)
    return { status: 'rejected', reason: 'invalid-context' };
  if (registry.data.sessionRef !== bindings.expectedSessionRef)
    return { status: 'rejected', reason: 'session-mismatch' };
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
  const reconciledBindings = reconcileParserContinuationBindings(
    {
      expectedSessionRef: bindings.expectedSessionRef,
      state: outcome.state,
      continuation: outcome.continuation,
      personSession: reconciled.session,
    },
    registry.data,
    outcome.invalidated.queryRefs,
  );
  if (reconciledBindings.status === 'rejected') return reconciledBindings;
  return {
    ...outcome,
    session: reconciled.session,
    registry: reconciledBindings.registry,
    retiredBindingRefs:
      reconciledBindings.status === 'reconciled' ? reconciledBindings.retiredBindingRefs : [],
  };
}
