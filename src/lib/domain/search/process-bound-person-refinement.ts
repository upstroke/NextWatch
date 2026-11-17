import { BoundPersonRefinementRequestSchema } from '@lib/schemas/bound-person-refinement-request';
import { validateParserContinuation } from '@lib/schemas/parser-continuation';
import type { ParserContinuation } from '@lib/schemas/parser-continuation';
import type { ParserContinuationBindingRegistry } from '@lib/schemas/parser-continuation-binding';
import { PersonClarificationSessionSchema } from '@lib/schemas/person-clarification-session';
import type { PersonClarificationSession } from '@lib/schemas/person-clarification-session';
import { SearchStateSchema } from '@lib/schemas/search-state';
import type { SearchState } from '@lib/schemas/search-state';
import { validateParserResponse } from '@lib/parser/validate-response';
import { applyParserContinuationCommand } from './apply-parser-continuation-command';
import { applyPersonClarificationAction } from './apply-person-clarification-action';
import { applyPendingQueryCommand } from './pending-operations';
import {
  checkParserContinuationBinding,
  consumeParserContinuationBinding,
  reconcileParserContinuationBindings,
} from './parser-continuation-binding';
import type { ParserContinuationBindingContext } from './parser-continuation-binding';

type BindingReason = Extract<
  ReturnType<typeof checkParserContinuationBinding>,
  { status: 'rejected' }
>['reason'];
type ActionReason = Extract<
  ReturnType<typeof applyPersonClarificationAction>,
  { status: 'rejected' }
>['reason'];
type ParserReason = Extract<
  ReturnType<typeof validateParserResponse>,
  { status: 'rejected' }
>['reason'];
type TransitionReason = Extract<
  ReturnType<typeof applyParserContinuationCommand> | ReturnType<typeof applyPendingQueryCommand>,
  { status: 'rejected' }
>['reason'];
type ReconcileReason = Extract<
  ReturnType<typeof reconcileParserContinuationBindings>,
  { status: 'rejected' }
>['reason'];

export type ProcessBoundPersonRefinementResult =
  | {
      status: 'applied';
      queryChanged: boolean;
      requestRef: string;
      state: SearchState;
      continuation: ParserContinuation;
      session: PersonClarificationSession;
      registry: ParserContinuationBindingRegistry;
      consumedBindingRef: string;
      retiredBindingRefs: string[];
      invalidated: { queryRefs: string[]; intentionRefs: string[] };
    }
  | { status: 'rejected'; stage: 'request'; reason: 'invalid-request' }
  | { status: 'rejected'; stage: 'binding' | 'consumption'; reason: BindingReason }
  | { status: 'rejected'; stage: 'action'; reason: ActionReason | 'unexpected-action-outcome' }
  | { status: 'rejected'; stage: 'invocation'; reason: 'invocation-mismatch' }
  | { status: 'rejected'; stage: 'parser'; reason: ParserReason }
  | {
      status: 'rejected';
      stage: 'interpretation';
      reason: 'unsupported-interpretation' | 'target-mismatch' | 'unsupported-correction';
    }
  | { status: 'rejected'; stage: 'transition'; reason: TransitionReason }
  | { status: 'rejected'; stage: 'reconciliation'; reason: ReconcileReason }
  | { status: 'rejected'; stage: 'result'; reason: 'invalid-result' };

/**
 * Applies exactly one parsed refinement under the original still-live question.
 * This is an alternative to the deferred action path, not a consumer of its
 * followUp output: do not consume/close that question before calling this function.
 * Load the original request and coherent current stores from trusted application
 * storage. The caller associates the stored invocation with its original submission,
 * never accepts a client-supplied replacement request, locks conflicting work and
 * persists the complete proposal with concurrency control. Pure checks alone do
 * not implement storage, global invocation allocation or exactly-once execution.
 * Technical/unsupported responses reject without consumption or partial stores.
 * A successful no-op query edit still closes the question and consumes its binding;
 * queryChanged distinguishes this from revision/generation-changing refinement.
 * No parser/provider call, new binding/question, identity acceptance or search occurs.
 * @param context Current validated state and coherent application-held session context.
 * @param registryInput Current stored registry from that same lifetime.
 * @param originalRequestInput Immutable original submission and invocation from trusted storage.
 * @param responseInput Untrusted normalized parser response, not an asserted validated query.
 * @returns A complete isolated four-store proposal or a stage-specific rejection.
 */
export function processBoundPersonRefinement(
  context: ParserContinuationBindingContext,
  registryInput: unknown,
  originalRequestInput: unknown,
  responseInput: unknown,
): ProcessBoundPersonRefinementResult {
  const stored = BoundPersonRefinementRequestSchema.safeParse(originalRequestInput);
  if (!stored.success) return { status: 'rejected', stage: 'request', reason: 'invalid-request' };
  const { association, action, invocation } = stored.data;
  const checked = checkParserContinuationBinding(
    context,
    registryInput,
    association,
    'question_answer',
  );
  if (checked.status === 'rejected')
    return { status: 'rejected', stage: 'binding', reason: checked.reason };
  const session = PersonClarificationSessionSchema.safeParse(context.personSession);
  const current = validateParserContinuation(context.continuation, context.state.pendingQueries);
  if (!session.success || !current.success)
    return { status: 'rejected', stage: 'binding', reason: 'invalid-context' };
  const actionOutcome = applyPersonClarificationAction(
    context.state,
    session.data.activeQuestion,
    action,
  );
  if (actionOutcome.status === 'rejected')
    return { status: 'rejected', stage: 'action', reason: actionOutcome.reason };
  if (actionOutcome.status !== 'follow-up')
    return { status: 'rejected', stage: 'action', reason: 'unexpected-action-outcome' };

  const originalTarget = invocation.context.pending.find((entry) => entry.ref === action.ref);
  const active = invocation.context.activeClarification;
  if (
    invocation.baseRevision !== context.state.revision ||
    invocation.sessionSequence !== session.data.sequence ||
    invocation.userInput !== action.text ||
    active?.kind !== 'person' ||
    active.pendingRef !== action.ref ||
    originalTarget?.scope !== 'query' ||
    originalTarget.criterion !== 'person' ||
    originalTarget.status !== 'needs_clarification' ||
    originalTarget.operation !== actionOutcome.request.operation ||
    originalTarget.query.text !== actionOutcome.request.query ||
    originalTarget.query.correction !== null
  )
    return { status: 'rejected', stage: 'invocation', reason: 'invocation-mismatch' };

  const response = validateParserResponse(responseInput, invocation);
  if (response.status === 'rejected')
    return { status: 'rejected', stage: 'parser', reason: response.reason };
  const items = response.proposal.groups.flatMap((group) => group.items);
  const item = items[0];
  if (
    response.proposal.groups.length !== 1 ||
    items.length !== 1 ||
    item?.kind !== 'entity' ||
    item.entityType !== 'person' ||
    item.operation !== 'refine'
  )
    return { status: 'rejected', stage: 'interpretation', reason: 'unsupported-interpretation' };
  if (item.pendingRef !== action.ref)
    return { status: 'rejected', stage: 'interpretation', reason: 'target-mismatch' };
  if (item.query.correction !== null)
    return { status: 'rejected', stage: 'interpretation', reason: 'unsupported-correction' };

  let state = context.state;
  let continuation = current.data;
  let queryChanged = false;
  const invalidated: { queryRefs: string[]; intentionRefs: string[] } = {
    queryRefs: [],
    intentionRefs: [],
  };
  const parent = continuation.intentions.find((entry) =>
    entry.children.some((child) => child.ownership === 'canonical' && child.ref === action.ref),
  );
  if (parent) {
    const edit = applyParserContinuationCommand(state, continuation, {
      operation: 'refine',
      baseRevision: state.revision,
      intentionRef: parent.ref,
      expectedGeneration: parent.generation,
      queryRef: action.ref,
      query: item.query,
    });
    if (edit.status === 'rejected')
      return { status: 'rejected', stage: 'transition', reason: edit.reason };
    if (edit.status === 'applied') {
      state = edit.state;
      continuation = edit.continuation;
      queryChanged = true;
      invalidated.queryRefs = edit.invalidated.queryRefs;
      invalidated.intentionRefs = edit.invalidated.intentionRefs;
    }
  } else {
    if (
      item.query.text.trim() !== actionOutcome.request.query &&
      state.revision === Number.MAX_SAFE_INTEGER
    )
      return { status: 'rejected', stage: 'transition', reason: 'invalid-result' };
    const edit = applyPendingQueryCommand(state, {
      entity: 'person',
      operation: 'change',
      baseRevision: state.revision,
      request: { ...actionOutcome.request, query: item.query.text },
    });
    if (edit.status === 'rejected')
      return { status: 'rejected', stage: 'transition', reason: edit.reason };
    if (edit.status === 'applied') {
      state = edit.state;
      queryChanged = true;
      invalidated.queryRefs.push(action.ref);
    }
  }
  const validState = SearchStateSchema.safeParse(state);
  const validContinuation = validateParserContinuation(continuation, state.pendingQueries);
  if (!validState.success || !validContinuation.success)
    return { status: 'rejected', stage: 'result', reason: 'invalid-result' };

  const consumed = consumeParserContinuationBinding(
    context,
    registryInput,
    association,
    'question_answer',
  );
  if (consumed.status === 'rejected')
    return { status: 'rejected', stage: 'consumption', reason: consumed.reason };
  session.data.activeQuestion = null;
  const reconciled = reconcileParserContinuationBindings(
    {
      expectedSessionRef: context.expectedSessionRef,
      state: validState.data,
      continuation: validContinuation.data,
      personSession: session.data,
    },
    consumed.registry,
    invalidated.queryRefs,
  );
  if (reconciled.status === 'rejected')
    return { status: 'rejected', stage: 'reconciliation', reason: reconciled.reason };
  return {
    status: 'applied',
    queryChanged,
    requestRef: invocation.requestRef,
    state: validState.data,
    continuation: validContinuation.data,
    session: session.data,
    registry: reconciled.registry,
    consumedBindingRef: consumed.binding.bindingRef,
    retiredBindingRefs: reconciled.status === 'reconciled' ? reconciled.retiredBindingRefs : [],
    invalidated,
  };
}
