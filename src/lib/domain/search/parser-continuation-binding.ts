import { z } from 'zod';
import { MAX_PARSER_CONTINUATION_BINDINGS } from '@lib/config/domain';
import { ParserInvocationSchema } from '@lib/schemas/parser';
import { validateParserContinuation } from '@lib/schemas/parser-continuation';
import type { ParserContinuation } from '@lib/schemas/parser-continuation';
import { PersonClarificationSessionSchema } from '@lib/schemas/person-clarification-session';
import type { PersonClarificationSession } from '@lib/schemas/person-clarification-session';
import type { SearchState } from '@lib/schemas/search-state';
import {
  ParserContinuationBindingRegistrySchema, ParserContinuationBindingCommandSchema,
  ParserContinuationBindingAssociationSchema, ParserContinuationBindingPurposeSchema,
  ParserContinuationBindingInvalidationsSchema, ParserContinuationBindingSchema,
  getParserContinuationBindingKey,
} from '@lib/schemas/parser-continuation-binding';
import type { ParserContinuationBinding, ParserContinuationBindingTarget, ParserContinuationBindingRegistry } from '@lib/schemas/parser-continuation-binding';

export type ParserContinuationBindingContext = {
  expectedSessionRef: string; state: SearchState; continuation: unknown; personSession: unknown;
};
type CurrentContext = Omit<ParserContinuationBindingContext, 'continuation' | 'personSession'> & { continuation: ParserContinuation; personSession: PersonClarificationSession };
type RegistryReason = 'invalid-registry' | 'invalid-context' | 'session-mismatch';
type TargetReason = 'unknown-target' | 'target-mismatch' | 'stale-generation' | 'stale-question';
type CheckReason = RegistryReason | TargetReason | 'invalid-association' | 'invalid-command' | 'epoch-mismatch' | 'unknown-binding' | 'purpose-mismatch' | 'stale-revision';
type IssueReason = RegistryReason | TargetReason | 'invalid-command' | 'renewal-mismatch' | 'unsupported-owned-question' | 'binding-exists' | 'sequence-exhausted' | 'capacity-exceeded';
type Rejected<R extends string> = { status: 'rejected'; reason: R };

function rejected<R extends string>(reason: R): Rejected<R> { return { status: 'rejected', reason }; }

function prepareRegistry(expectedSessionRef: string, input: unknown): { status: 'ready'; registry: ParserContinuationBindingRegistry } | Rejected<RegistryReason> {
  const parsed = ParserContinuationBindingRegistrySchema.safeParse(input);
  if (!parsed.success) return rejected('invalid-registry');
  if (!ParserInvocationSchema.shape.requestRef.safeParse(expectedSessionRef).success) return rejected('invalid-context');
  if (parsed.data.sessionRef !== expectedSessionRef) return rejected('session-mismatch');
  return { status: 'ready', registry: parsed.data };
}

function prepare(context: ParserContinuationBindingContext, input: unknown): { status: 'ready'; registry: ParserContinuationBindingRegistry; context: CurrentContext } | Rejected<RegistryReason> {
  const registry = ParserContinuationBindingRegistrySchema.safeParse(input);
  if (!registry.success) return rejected('invalid-registry');
  const session = PersonClarificationSessionSchema.safeParse(context.personSession);
  const continuation = validateParserContinuation(context.continuation, context.state.pendingQueries);
  if (!ParserInvocationSchema.shape.requestRef.safeParse(context.expectedSessionRef).success || !session.success || !continuation.success) return rejected('invalid-context');
  if (registry.data.sessionRef !== context.expectedSessionRef) return rejected('session-mismatch');
  return { status: 'ready', registry: registry.data, context: { ...context, personSession: session.data, continuation: continuation.data } };
}

function targetProblem(context: CurrentContext, target: ParserContinuationBindingTarget, checkGeneration = true): TargetReason | null {
  const canonicalCriterion = context.state.pendingQueries.personQueries.some((query) => query.ref === target.queryRef) ? 'person' : context.state.pendingQueries.keywordQueries.some((query) => query.ref === target.queryRef) ? 'keyword' : null;
  const parent = context.continuation.intentions.find((entry) => entry.children.some((query) => query.ownership === 'continuation' && query.ref === target.queryRef));
  if (target.ownership === 'canonical') {
    if (canonicalCriterion === null) return parent ? 'target-mismatch' : 'unknown-target';
    return canonicalCriterion === target.criterion ? null : 'target-mismatch';
  }
  if (!parent) return canonicalCriterion === null ? 'unknown-target' : 'target-mismatch';
  if (parent.ref !== target.intentionRef || parent.criterion !== target.criterion) return 'target-mismatch';
  const child = parent.children.find((query) => query.ref === target.queryRef);
  if (!child || child.ownership !== 'continuation') return 'target-mismatch';
  return checkGeneration && child.generation !== target.queryGeneration ? 'stale-generation' : null;
}

function questionProblem(context: CurrentContext, target: ParserContinuationBindingTarget, question: { kind: string; questionRef: string }): 'stale-question' | null {
  const active = context.personSession.activeQuestion;
  return target.ownership !== 'canonical' || target.criterion !== 'person' || active === null || active.sourceRevision !== context.state.revision || active.ref !== target.queryRef || context.state.pendingQueries.personQueries[0]?.ref !== target.queryRef || active.kind !== question.kind || active.clarificationRef !== question.questionRef ? 'stale-question' : null;
}

function freshnessProblem(context: CurrentContext, binding: ParserContinuationBinding): TargetReason | 'stale-revision' | null {
  if (binding.sourceRevision !== context.state.revision) return 'stale-revision';
  const problem = targetProblem(context, binding.target);
  if (problem !== null) return problem;
  return binding.purpose === 'question_answer' ? questionProblem(context, binding.target, binding.question) : null;
}

function reconcileCurrent(context: CurrentContext, registry: ParserContinuationBindingRegistry, invalidations: Set<string>) {
  const retained = registry.outstanding.filter((binding) => !invalidations.has(binding.target.queryRef) && freshnessProblem(context, binding) === null);
  const retainedRefs = new Set(retained.map((binding) => binding.bindingRef));
  return { registry: { ...registry, outstanding: retained }, retiredBindingRefs: registry.outstanding.filter((binding) => !retainedRefs.has(binding.bindingRef)).map((binding) => binding.bindingRef) };
}

function locate(context: CurrentContext, registry: ParserContinuationBindingRegistry, input: unknown, expectedPurpose: unknown): { status: 'current'; binding: ParserContinuationBinding } | Rejected<CheckReason> {
  const association = ParserContinuationBindingAssociationSchema.safeParse(input);
  if (!association.success) return rejected('invalid-association');
  const purpose = ParserContinuationBindingPurposeSchema.safeParse(expectedPurpose);
  if (!purpose.success) return rejected('invalid-command');
  if (association.data.sessionRef !== context.expectedSessionRef) return rejected('session-mismatch');
  if (association.data.epoch !== registry.epoch) return rejected('epoch-mismatch');
  const binding = registry.outstanding.find((entry) => entry.bindingRef === association.data.bindingRef);
  if (!binding) return rejected('unknown-binding');
  if (binding.purpose !== purpose.data) return rejected('purpose-mismatch');
  const problem = freshnessProblem(context, binding);
  return problem === null ? { status: 'current', binding } : rejected(problem);
}

/**
 * Issues or explicitly renews one application-owned binding after private cleanup.
 * @param context Current coherent application session; caller enforces workflow issuance permission.
 * @param registryInput Stored registry, not response-supplied authority.
 * @param input Strict create/renew command.
 * @returns An isolated issuance proposal with ordered retirements, or rejection without changes.
 */
export function issueParserContinuationBinding(context: ParserContinuationBindingContext, registryInput: unknown, input: unknown): { status: 'issued'; registry: ParserContinuationBindingRegistry; binding: ParserContinuationBinding; retiredBindingRefs: string[] } | Rejected<IssueReason> {
  const current = prepare(context, registryInput);
  if (current.status === 'rejected') return current;
  const parsed = ParserContinuationBindingCommandSchema.safeParse(input);
  if (!parsed.success) return rejected('invalid-command');
  const command = parsed.data;
  const key = getParserContinuationBindingKey(command);
  const existing = current.registry.outstanding.find((entry) => getParserContinuationBindingKey(entry) === key);
  if (command.allocation.mode === 'renew' && existing?.bindingRef !== command.allocation.expectedBindingRef) return rejected('renewal-mismatch');
  const membership = targetProblem(current.context, command.target, false);
  if (membership !== null) return rejected(membership);
  if (command.purpose === 'question_answer' && command.target.ownership === 'continuation') return rejected('unsupported-owned-question');
  const generation = targetProblem(current.context, command.target);
  if (generation !== null) return rejected(generation);
  if (command.purpose === 'question_answer') {
    const problem = questionProblem(current.context, command.target, command.question);
    if (problem !== null) return rejected(problem);
  }
  const cleaned = reconcileCurrent(current.context, current.registry, new Set());
  if (command.allocation.mode === 'create' && cleaned.registry.outstanding.some((entry) => getParserContinuationBindingKey(entry) === key)) return rejected('binding-exists');
  const retained = cleaned.registry.outstanding.filter((entry) => command.allocation.mode !== 'renew' || entry.bindingRef !== existing?.bindingRef);
  if (current.registry.sequence === Number.MAX_SAFE_INTEGER) return rejected('sequence-exhausted');
  if (retained.length >= MAX_PARSER_CONTINUATION_BINDINGS) return rejected('capacity-exceeded');
  const sequence = current.registry.sequence + 1;
  const payload = command.purpose === 'query_resolution' ? { purpose: command.purpose, target: command.target } : { purpose: command.purpose, target: command.target, question: command.question };
  const binding = ParserContinuationBindingSchema.parse({ ...payload, bindingRef: `continuation-binding-${sequence}`, sessionRef: current.registry.sessionRef, epoch: current.registry.epoch, sourceRevision: current.context.state.revision });
  const retainedRefs = new Set(retained.map((entry) => entry.bindingRef));
  return { status: 'issued', binding, registry: { ...current.registry, sequence, outstanding: [...retained, binding] }, retiredBindingRefs: current.registry.outstanding.filter((entry) => !retainedRefs.has(entry.bindingRef)).map((entry) => entry.bindingRef) };
}

/**
 * Checks an incoming association against current stored authority without consuming it.
 * @param context Current coherent application context.
 * @param registryInput Stored registry.
 * @param input Incoming lifetime/epoch/reference association.
 * @param expectedPurpose Application-selected processing purpose, never response authority.
 * @returns Current binding data or rejection; data is not a durable authorization token.
 */
export function checkParserContinuationBinding(context: ParserContinuationBindingContext, registryInput: unknown, input: unknown, expectedPurpose: unknown): { status: 'current'; binding: ParserContinuationBinding } | Rejected<CheckReason> {
  const current = prepare(context, registryInput);
  return current.status === 'rejected' ? current : locate(current.context, current.registry, input, expectedPurpose);
}

/**
 * Rechecks and proposes consumption of exactly one binding; validates no result payload.
 * @param context Current pre-transition application snapshot.
 * @param registryInput Current stored registry.
 * @param input Incoming association, not an earlier check result.
 * @param expectedPurpose Application-selected processing purpose.
 * @returns An isolated consume proposal or rejection; caller commits it with successful payload processing.
 */
export function consumeParserContinuationBinding(context: ParserContinuationBindingContext, registryInput: unknown, input: unknown, expectedPurpose: unknown): { status: 'consumed'; registry: ParserContinuationBindingRegistry; binding: ParserContinuationBinding } | Rejected<CheckReason> {
  const current = prepare(context, registryInput);
  if (current.status === 'rejected') return current;
  const checked = locate(current.context, current.registry, input, expectedPurpose);
  if (checked.status === 'rejected') return checked;
  return { status: 'consumed', binding: checked.binding, registry: { ...current.registry, outstanding: current.registry.outstanding.filter((entry) => entry.bindingRef !== checked.binding.bindingRef) } };
}

/**
 * Retires stale or explicitly invalidated bindings without rebasing or starting work.
 * @param context Current coherent application context.
 * @param registryInput Stored registry.
 * @param invalidationsInput Application-owned query-reference list, not parent invalidations.
 * @returns An isolated unchanged/reconciled registry with ordered retirements, or boundary rejection.
 */
export function reconcileParserContinuationBindings(context: ParserContinuationBindingContext, registryInput: unknown, invalidationsInput: unknown): { status: 'unchanged'; registry: ParserContinuationBindingRegistry } | { status: 'reconciled'; registry: ParserContinuationBindingRegistry; retiredBindingRefs: string[] } | Rejected<RegistryReason | 'invalid-invalidations'> {
  const current = prepare(context, registryInput);
  if (current.status === 'rejected') return current;
  const invalidations = ParserContinuationBindingInvalidationsSchema.safeParse(invalidationsInput);
  if (!invalidations.success) return rejected('invalid-invalidations');
  const next = reconcileCurrent(current.context, current.registry, new Set(invalidations.data));
  return next.retiredBindingRefs.length === 0 ? { status: 'unchanged', registry: next.registry } : { status: 'reconciled', ...next };
}

/**
 * Withdraws all registry authorizations by advancing epoch, preserving sequence.
 * @param expectedSessionRef Trusted routed lifetime reference.
 * @param registryInput Current stored registry.
 * @returns An isolated epoch-retirement proposal or rejection; does not pause workflow or close questions.
 */
export function retireParserContinuationBindings(expectedSessionRef: string, registryInput: unknown): { status: 'retired'; registry: ParserContinuationBindingRegistry; retiredBindingRefs: string[] } | Rejected<RegistryReason | 'epoch-exhausted'> {
  const current = prepareRegistry(expectedSessionRef, registryInput);
  if (current.status === 'rejected') return current;
  if (current.registry.epoch === Number.MAX_SAFE_INTEGER) return rejected('epoch-exhausted');
  return { status: 'retired', registry: { ...current.registry, epoch: current.registry.epoch + 1, outstanding: [] }, retiredBindingRefs: current.registry.outstanding.map((entry) => entry.bindingRef) };
}
