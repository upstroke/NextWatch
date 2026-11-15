import {
  SemanticGuardrailInputSchema,
  SemanticClarificationSchema,
  SemanticGuardrailSessionSchema,
  SemanticGuardrailResponseSchema,
} from '@lib/schemas/semantic-guardrails';
import type {
  SemanticClarification,
  SemanticGuardrailSession,
} from '@lib/schemas/semantic-guardrails';
import type { SearchState } from '@lib/schemas/search-state';
import { applyIntent } from './apply-intent';
import type { ApplyIntentResult } from './apply-intent';
import { applyPendingQueryCommand } from './pending-operations';
import type { PendingTransitionResult } from './pending-operations';

type Transition = ApplyIntentResult | PendingTransitionResult;
type Failure = {
  status: 'rejected';
  reason:
    | 'invalid-session'
    | 'invalid-input'
    | 'invalid-response'
    | 'stale-revision'
    | 'invalid-context'
    | 'sequence-exhausted'
    | 'no-active-question'
    | 'question-mismatch'
    | 'action-mismatch'
    | 'option-unavailable';
};
export type OfferSemanticGuardrailResult =
  | Failure
  | { status: 'active'; session: SemanticGuardrailSession }
  | {
      status: 'unsupported';
      requirement: string;
      session: SemanticGuardrailSession;
      outcome: ApplyIntentResult;
    };
export type ProcessSemanticGuardrailResult =
  | Failure
  | { status: 'rejected'; reason: 'transition-rejected'; outcome: Transition }
  | { status: 'processed'; session: SemanticGuardrailSession; outcome: Transition };

function referenceInUse(state: SearchState, ref: string): boolean {
  return [...state.pendingQueries.personQueries, ...state.pendingQueries.keywordQueries].some(
    (request) => request.ref === ref,
  );
}

/**
 * Offers a question for an already recognized situation without changing criteria.
 * state is validated; input comes from application-controlled recognition/resolution
 * context, not directly from a client. Request references are application-issued.
 * Unclear replacements are not pending person records until their target is chosen.
 * Keyword choices are descriptive queries, not provider identities. Unsupported
 * requirements reuse the existing unsupported intent outcome, never a fake question.
 * Persist the returned sequence even after closure; new offers retire old answers.
 * No parsing, provider access, UI, persistence or search execution occurs here.
 */
export function offerSemanticGuardrail(
  state: SearchState,
  sessionInput: unknown,
  input: unknown,
): OfferSemanticGuardrailResult {
  const session = SemanticGuardrailSessionSchema.safeParse(sessionInput);
  if (!session.success) return { status: 'rejected', reason: 'invalid-session' };
  const parsed = SemanticGuardrailInputSchema.safeParse(input);
  if (!parsed.success) return { status: 'rejected', reason: 'invalid-input' };
  const issue = parsed.data;
  if (issue.sourceRevision !== state.revision)
    return { status: 'rejected', reason: 'stale-revision' };
  if (session.data.sequence === Number.MAX_SAFE_INTEGER)
    return { status: 'rejected', reason: 'sequence-exhausted' };
  const sequence = session.data.sequence + 1;
  if (issue.kind === 'unsupported') {
    return {
      status: 'unsupported',
      requirement: issue.requirement,
      session: { sequence, activeQuestion: null },
      outcome: applyIntent(state, { status: 'unsupported', baseRevision: state.revision }),
    };
  }
  let question: SemanticClarification;
  const clarificationRef = `semantic-question-${sequence}`;
  if (issue.kind === 'replacement-target') {
    if (referenceInUse(state, issue.request.ref))
      return { status: 'rejected', reason: 'invalid-context' };
    const occupied = new Set(
      state.pendingQueries.personQueries.flatMap((request) =>
        request.operation === 'replace' ? [request.targetPersonId] : [],
      ),
    );
    const targets = state.people
      .filter((person) => !occupied.has(person.id))
      .map((person) => ({ ...person }));
    if (targets.length < 2) return { status: 'rejected', reason: 'invalid-context' };
    question = { ...issue, clarificationRef, targets };
  } else {
    if (
      issue.kind === 'keyword-meaning' &&
      !state.pendingQueries.keywordQueries.some(
        (request) => request.ref === issue.request.ref && request.query === issue.request.query,
      )
    ) {
      return { status: 'rejected', reason: 'invalid-context' };
    }
    question = { ...issue, clarificationRef };
  }
  return {
    status: 'active',
    session: { sequence, activeQuestion: SemanticClarificationSchema.parse(question) },
  };
}

/**
 * Applies only a bound answer to the application-stored active semantic question.
 * The caller owns validated state and trusted session storage. Check and persist
 * state/session atomically: revision alone does not serialize same-revision offers.
 * WP 009 pending commands and applyIntent own all criteria/revision/limit decisions.
 * Failures leave the question available; successful/no-op answers consume it.
 * A processed answer is not search permission: unresolved required criteria remain
 * blocking. Reconcile other question lifecycles after any effective state change.
 */
export function processSemanticGuardrailResponse(
  state: SearchState,
  sessionInput: unknown,
  input: unknown,
): ProcessSemanticGuardrailResult {
  const session = SemanticGuardrailSessionSchema.safeParse(sessionInput);
  if (!session.success) return { status: 'rejected', reason: 'invalid-session' };
  const question = session.data.activeQuestion;
  if (question === null) return { status: 'rejected', reason: 'no-active-question' };
  const parsed = SemanticGuardrailResponseSchema.safeParse(input);
  if (!parsed.success) return { status: 'rejected', reason: 'invalid-response' };
  const answer = parsed.data;
  if (question.sourceRevision !== state.revision || answer.sourceRevision !== state.revision) {
    return { status: 'rejected', reason: 'stale-revision' };
  }
  if (answer.clarificationRef !== question.clarificationRef)
    return { status: 'rejected', reason: 'question-mismatch' };
  let outcome: Transition;
  if (question.kind === 'replacement-target' && answer.action === 'select-target') {
    if (!question.targets.some((target) => target.id === answer.personId))
      return { status: 'rejected', reason: 'option-unavailable' };
    outcome = applyPendingQueryCommand(state, {
      entity: 'person',
      operation: 'add',
      baseRevision: state.revision,
      request: { ...question.request, operation: 'replace', targetPersonId: answer.personId },
    });
  } else if (question.kind === 'year-conflict' && answer.action === 'correct-years') {
    outcome = applyIntent(state, {
      status: 'ready',
      baseRevision: state.revision,
      changes: [
        {
          field: 'minYear',
          operation: answer.minYear === null ? 'remove' : 'set',
          value: answer.minYear,
        },
        {
          field: 'maxYear',
          operation: answer.maxYear === null ? 'remove' : 'set',
          value: answer.maxYear,
        },
      ],
    });
  } else if (question.kind === 'keyword-meaning' && answer.action === 'select-meaning') {
    const option = question.options.find((entry) => entry.optionRef === answer.optionRef);
    if (!option) return { status: 'rejected', reason: 'option-unavailable' };
    const request = state.pendingQueries.keywordQueries.find(
      (entry) => entry.ref === question.request.ref,
    );
    if (!request || request.query !== question.request.query)
      return { status: 'rejected', reason: 'invalid-context' };
    outcome = applyPendingQueryCommand(state, {
      entity: 'keyword',
      operation: 'change',
      baseRevision: state.revision,
      request: { ...request, query: option.query },
    });
  } else {
    return { status: 'rejected', reason: 'action-mismatch' };
  }
  if (outcome.status === 'rejected')
    return { status: 'rejected', reason: 'transition-rejected', outcome };
  return {
    status: 'processed',
    session: { sequence: session.data.sequence, activeQuestion: null },
    outcome,
  };
}
