import { ParserContinuationSchema, validateParserContinuation } from '@lib/schemas/parser-continuation';
import type { ParserContinuation } from '@lib/schemas/parser-continuation';
import { PersonClarificationSessionSchema } from '@lib/schemas/person-clarification-session';
import type { PersonClarificationSession } from '@lib/schemas/person-clarification-session';
import { SearchStateSchema } from '@lib/schemas/search-state';
import type { SearchState } from '@lib/schemas/search-state';
import type { ParserContinuationBindingRegistry } from '@lib/schemas/parser-continuation-binding';
import { applyPersonClarificationAction } from './apply-person-clarification-action';
import type { ApplyPersonClarificationActionResult } from './apply-person-clarification-action';
import { checkParserContinuationBinding, consumeParserContinuationBinding, reconcileParserContinuationBindings } from './parser-continuation-binding';
import type { ParserContinuationBindingContext } from './parser-continuation-binding';

type BindingReason = Extract<ReturnType<typeof checkParserContinuationBinding>, { status: 'rejected' }>['reason'];
type ReconcileReason = Extract<ReturnType<typeof reconcileParserContinuationBindings>, { status: 'rejected' }>['reason'];
type ActionReason = Extract<ApplyPersonClarificationActionResult, { status: 'rejected' }>['reason'];
type FollowUp = Pick<Extract<ApplyPersonClarificationActionResult, { status: 'follow-up' }>, 'action' | 'request'>;
type CompleteProposal = {
  state: SearchState;
  continuation: ParserContinuation;
  session: PersonClarificationSession;
  registry: ParserContinuationBindingRegistry;
  consumedBindingRef: string;
  retiredBindingRefs: string[];
  invalidated: { queryRefs: string[]; intentionRefs: string[] };
};
export type ProcessBoundPersonClarificationActionResult =
  | (CompleteProposal & { status: 'applied' })
  | (CompleteProposal & { status: 'follow-up'; followUp: FollowUp })
  | { status: 'rejected'; stage: 'context' | 'binding' | 'consumption'; reason: BindingReason }
  | { status: 'rejected'; stage: 'action'; reason: ActionReason | 'unexpected-action-outcome' }
  | { status: 'rejected'; stage: 'continuation'; reason: 'generation-exhausted' | 'invalid-continuation' }
  | { status: 'rejected'; stage: 'reconciliation'; reason: ReconcileReason }
  | { status: 'rejected'; stage: 'result'; reason: 'invalid-result' };

/**
 * Processes a structured person action under an issued question-answer binding.
 * Uses one coherent pre-state for action/consumption and the completed post-state
 * for reconciliation. Every result is a private proposal: persist all four stores
 * together with concurrency control. A failed stage exposes no partial stores.
 * Refine/more-candidates only return ephemeral follow-up data; no provider/parser
 * call, new question/binding, identity acceptance, retry or search is started.
 * The caller owns coherent session routing/loading; these values are never client authority.
 * @param context Current application-owned session context with validated search state.
 * @param registryInput Current stored registry from the same lifetime.
 * @param associationInput Incoming session/epoch/binding-reference association.
 * @param actionInput Existing structured person action; identity selections are excluded.
 * @returns An isolated complete applied/follow-up proposal, or a stage-specific rejection.
 */
export function processBoundPersonClarificationAction(
  context: ParserContinuationBindingContext,
  registryInput: unknown,
  associationInput: unknown,
  actionInput: unknown,
): ProcessBoundPersonClarificationActionResult {
  const checked = checkParserContinuationBinding(context, registryInput, associationInput, 'question_answer');
  if (checked.status === 'rejected') {
    const stage = checked.reason === 'invalid-registry' || checked.reason === 'invalid-context' || checked.reason === 'session-mismatch' ? 'context' : 'binding';
    return { status: 'rejected', stage, reason: checked.reason };
  }
  if (checked.binding.purpose !== 'question_answer')
    return { status: 'rejected', stage: 'binding', reason: 'purpose-mismatch' };
  const continuation = ParserContinuationSchema.safeParse(context.continuation);
  const session = PersonClarificationSessionSchema.safeParse(context.personSession);
  if (!continuation.success || !session.success)
    return { status: 'rejected', stage: 'context', reason: 'invalid-context' };

  const outcome = applyPersonClarificationAction(context.state, session.data.activeQuestion, actionInput);
  if (outcome.status === 'rejected') return { status: 'rejected', stage: 'action', reason: outcome.reason };
  if (outcome.status !== 'applied' && outcome.status !== 'follow-up')
    return { status: 'rejected', stage: 'action', reason: 'unexpected-action-outcome' };

  const nextState = outcome.status === 'applied' ? outcome.state : context.state;
  const nextContinuation = continuation.data;
  const invalidated: CompleteProposal['invalidated'] = { queryRefs: [], intentionRefs: [] };
  if (outcome.status === 'applied') {
    const ref = checked.binding.target.queryRef;
    invalidated.queryRefs.push(ref);
    const parent = nextContinuation.intentions.find((entry) => entry.children.some((child) => child.ownership === 'canonical' && child.ref === ref));
    if (parent) {
      const children = parent.children.filter((child) => child.ownership !== 'canonical' || child.ref !== ref);
      invalidated.intentionRefs.push(parent.ref);
      if (children.length === 0) {
        nextContinuation.intentions = nextContinuation.intentions.filter((entry) => entry.ref !== parent.ref);
      } else {
        if (parent.generation === Number.MAX_SAFE_INTEGER)
          return { status: 'rejected', stage: 'continuation', reason: 'generation-exhausted' };
        parent.children = children;
        parent.generation += 1;
      }
    }
  }
  const validContinuation = validateParserContinuation(nextContinuation, nextState.pendingQueries);
  if (!validContinuation.success)
    return { status: 'rejected', stage: 'continuation', reason: 'invalid-continuation' };

  const consumed = consumeParserContinuationBinding(context, registryInput, associationInput, 'question_answer');
  if (consumed.status === 'rejected')
    return { status: 'rejected', stage: 'consumption', reason: consumed.reason };
  session.data.activeQuestion = null;
  const reconciled = reconcileParserContinuationBindings({
    expectedSessionRef: context.expectedSessionRef, state: nextState,
    continuation: validContinuation.data, personSession: session.data,
  }, consumed.registry, invalidated.queryRefs);
  if (reconciled.status === 'rejected')
    return { status: 'rejected', stage: 'reconciliation', reason: reconciled.reason };

  const validState = SearchStateSchema.safeParse(nextState);
  if (!validState.success) return { status: 'rejected', stage: 'result', reason: 'invalid-result' };
  const proposal: CompleteProposal = {
    state: validState.data, continuation: validContinuation.data, session: session.data,
    registry: reconciled.registry, consumedBindingRef: consumed.binding.bindingRef,
    retiredBindingRefs: reconciled.status === 'reconciled' ? reconciled.retiredBindingRefs : [],
    invalidated,
  };
  return outcome.status === 'follow-up'
    ? { status: 'follow-up', ...proposal, followUp: { action: outcome.action, request: outcome.request } }
    : { status: 'applied', ...proposal };
}
