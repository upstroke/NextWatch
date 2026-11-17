import { validateParserContinuation } from '@lib/schemas/parser-continuation';
import type { ParserContinuation } from '@lib/schemas/parser-continuation';
import type { ParserContinuationBindingRegistry } from '@lib/schemas/parser-continuation-binding';
import type { PersonClarificationSession } from '@lib/schemas/person-clarification-session';
import { SearchStateSchema } from '@lib/schemas/search-state';
import type { SearchState } from '@lib/schemas/search-state';
import { processPersonSelection } from './process-person-selection';
import type {
  PersonSelectionIdentityValidator,
  ProcessPersonSelectionResult,
} from './process-person-selection';
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
type SelectionOutcome = Extract<ProcessPersonSelectionResult, { status: 'processed' }>['outcome'];
type SelectionReason = Extract<SelectionOutcome, { status: 'rejected' }>['reason'];
type ReconcileReason = Extract<
  ReturnType<typeof reconcileParserContinuationBindings>,
  { status: 'rejected' }
>['reason'];

export type ProcessBoundPersonSelectionResult =
  | {
      status: 'applied';
      state: SearchState;
      continuation: ParserContinuation;
      session: PersonClarificationSession;
      registry: ParserContinuationBindingRegistry;
      completedQueryRef: string;
      consumedBindingRef: string;
      retiredBindingRefs: string[];
      invalidated: { queryRefs: string[]; intentionRefs: string[] };
    }
  | { status: 'rejected'; stage: 'binding' | 'consumption'; reason: BindingReason }
  | {
      status: 'rejected';
      stage: 'selection';
      reason: SelectionReason | 'invalid-session' | 'unexpected-selection-outcome';
    }
  | { status: 'rejected'; stage: 'acceptance'; reason: 'revision-exhausted' }
  | {
      status: 'rejected';
      stage: 'continuation';
      reason: 'generation-exhausted' | 'invalid-continuation';
    }
  | { status: 'rejected'; stage: 'reconciliation'; reason: ReconcileReason }
  | { status: 'rejected'; stage: 'result'; reason: 'invalid-result' };

/**
 * Coordinates one canonical person selection with its question binding and open links.
 * Reuses processPersonSelection for offered-set/provenance checks and controlled
 * singular acceptance, including deduplication; it does not accept compound children.
 * Checks authority first and rejects revision exhaustion before calling the trusted
 * validator. Acceptance/link cleanup remain private until original pre-state
 * consumption and post-state registry reconciliation both succeed. Rejections expose
 * no partial stores or cleanup. completedQueryRef records fulfillment, not discard;
 * invalidated query refs withdraw response authority for the completed open work.
 *
 * The caller loads coherent application-owned stores, supplies a synchronous pure
 * identity validator and persists the complete proposal with concurrency control.
 * Shape checks are not provenance, storage or exactly-once external execution.
 * Existing first-canonical-person restrictions remain. No next question/binding,
 * lookup, parser call, retry, staging, pause/resume or search is started.
 * @param context Current validated search state and trusted application session context.
 * @param registryInput Current stored registry from the same lifetime.
 * @param associationInput Incoming session/epoch/binding reference, not authority.
 * @param input Untrusted existing person-selection answer.
 * @param validateIdentity Trusted side-effect-free identity validator; absence fails closed.
 * @returns An isolated four-store acceptance proposal or a stage-specific rejection.
 */
export function processBoundPersonSelection(
  context: ParserContinuationBindingContext,
  registryInput: unknown,
  associationInput: unknown,
  input: unknown,
  validateIdentity?: PersonSelectionIdentityValidator,
): ProcessBoundPersonSelectionResult {
  const checked = checkParserContinuationBinding(
    context,
    registryInput,
    associationInput,
    'question_answer',
  );
  if (checked.status === 'rejected')
    return { status: 'rejected', stage: 'binding', reason: checked.reason };
  if (context.state.revision >= Number.MAX_SAFE_INTEGER)
    return { status: 'rejected', stage: 'acceptance', reason: 'revision-exhausted' };
  const current = validateParserContinuation(context.continuation, context.state.pendingQueries);
  if (!current.success)
    return { status: 'rejected', stage: 'continuation', reason: 'invalid-continuation' };

  const selected = processPersonSelection(
    context.state,
    context.personSession,
    input,
    validateIdentity,
  );
  if (selected.status === 'rejected')
    return { status: 'rejected', stage: 'selection', reason: selected.reason };
  if (selected.outcome.status === 'rejected')
    return { status: 'rejected', stage: 'selection', reason: selected.outcome.reason };
  if (selected.outcome.status !== 'applied')
    return { status: 'rejected', stage: 'selection', reason: 'unexpected-selection-outcome' };

  const queryRef = checked.binding.target.queryRef;
  const continuation = current.data;
  const invalidated = { queryRefs: [queryRef], intentionRefs: [] as string[] };
  const parent = continuation.intentions.find((entry) =>
    entry.children.some((child) => child.ownership === 'canonical' && child.ref === queryRef),
  );
  if (parent) {
    const children = parent.children.filter(
      (child) => child.ownership !== 'canonical' || child.ref !== queryRef,
    );
    invalidated.intentionRefs.push(parent.ref);
    if (children.length === 0) {
      continuation.intentions = continuation.intentions.filter((entry) => entry.ref !== parent.ref);
    } else {
      if (parent.generation === Number.MAX_SAFE_INTEGER)
        return { status: 'rejected', stage: 'continuation', reason: 'generation-exhausted' };
      parent.children = children;
      parent.generation += 1;
    }
  }
  const state = SearchStateSchema.safeParse(selected.outcome.state);
  if (!state.success) return { status: 'rejected', stage: 'result', reason: 'invalid-result' };
  const validContinuation = validateParserContinuation(continuation, state.data.pendingQueries);
  if (!validContinuation.success)
    return { status: 'rejected', stage: 'continuation', reason: 'invalid-continuation' };

  const consumed = consumeParserContinuationBinding(
    context,
    registryInput,
    associationInput,
    'question_answer',
  );
  if (consumed.status === 'rejected')
    return { status: 'rejected', stage: 'consumption', reason: consumed.reason };
  const reconciled = reconcileParserContinuationBindings(
    {
      expectedSessionRef: context.expectedSessionRef,
      state: state.data,
      continuation: validContinuation.data,
      personSession: selected.session,
    },
    consumed.registry,
    invalidated.queryRefs,
  );
  if (reconciled.status === 'rejected')
    return { status: 'rejected', stage: 'reconciliation', reason: reconciled.reason };
  return {
    status: 'applied',
    state: state.data,
    continuation: validContinuation.data,
    session: selected.session,
    registry: reconciled.registry,
    completedQueryRef: queryRef,
    consumedBindingRef: consumed.binding.bindingRef,
    retiredBindingRefs: reconciled.status === 'reconciled' ? reconciled.retiredBindingRefs : [],
    invalidated,
  };
}
