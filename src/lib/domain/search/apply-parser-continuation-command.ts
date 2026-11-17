import { ParserContinuationCommandSchema } from '@lib/schemas/parser-continuation-command';
import { validateParserContinuation } from '@lib/schemas/parser-continuation';
import type { ParserContinuation } from '@lib/schemas/parser-continuation';
import { SearchStateSchema } from '@lib/schemas/search-state';
import type { SearchState } from '@lib/schemas/search-state';
import { applyPendingQueryCommand } from './pending-operations';

export type ParserContinuationTransitionResult =
  | {
      status: 'applied'; state: SearchState; continuation: ParserContinuation;
      invalidated: { intentionRefs: string[]; queryRefs: string[] };
    }
  | { status: 'unchanged'; reason: 'no-effective-change' }
  | {
      status: 'rejected';
      reason: 'invalid-input' | 'invalid-continuation' | 'stale-revision' |
        'unknown-intention' | 'stale-generation' | 'unknown-query' |
        'generation-exhausted' | 'unsupported-correction' |
        'canonical-transition-rejected' | 'invalid-result';
    };

/**
 * Refines or discards explicitly addressed open work without accepting criteria.
 * Canonical edits delegate to existing pending transitions on an isolated working copy.
 * Applied results must be persisted together; invalidation facts must be consumed by
 * the later coordinator before authorizing another response. No question is opened.
 * Session lifetime, invocation replay and staged-result reconciliation are not implemented here.
 * @param state Current validated application-owned search state.
 * @param continuationInput Current application-owned continuation to validate.
 * @param input Application-owned command bound to state revision and parent generation.
 * @returns A complete validated pair or a non-applied outcome without input mutation.
 */
export function applyParserContinuationCommand(
  state: SearchState,
  continuationInput: unknown,
  input: unknown,
): ParserContinuationTransitionResult {
  const commandResult = ParserContinuationCommandSchema.safeParse(input);
  if (!commandResult.success) return { status: 'rejected', reason: 'invalid-input' };
  const command = commandResult.data;
  if (command.baseRevision !== state.revision)
    return { status: 'rejected', reason: 'stale-revision' };
  const current = validateParserContinuation(continuationInput, state.pendingQueries);
  if (!current.success) return { status: 'rejected', reason: 'invalid-continuation' };
  const continuation = current.data;
  const entry = continuation.intentions.find((item) => item.ref === command.intentionRef);
  if (!entry) return { status: 'rejected', reason: 'unknown-intention' };
  if (entry.generation !== command.expectedGeneration)
    return { status: 'rejected', reason: 'stale-generation' };
  let workingState = structuredClone(state);
  const invalidatedQueries: string[] = [];

  if (command.operation === 'refine') {
    const query = entry.children.find((item) => item.ref === command.queryRef);
    if (!query) return { status: 'rejected', reason: 'unknown-query' };
    if (query.ownership === 'continuation') {
      if (query.query.text === command.query.text && query.query.correction === command.query.correction)
        return { status: 'unchanged', reason: 'no-effective-change' };
      if (entry.generation === Number.MAX_SAFE_INTEGER || query.generation === Number.MAX_SAFE_INTEGER)
        return { status: 'rejected', reason: 'generation-exhausted' };
      query.query = { ...command.query };
      query.generation += 1;
    } else {
      if (command.query.correction !== null)
        return { status: 'rejected', reason: 'unsupported-correction' };
      const requests = entry.criterion === 'person'
        ? workingState.pendingQueries.personQueries : workingState.pendingQueries.keywordQueries;
      const request = requests.find((item) => item.ref === query.ref);
      if (!request) return { status: 'rejected', reason: 'invalid-continuation' };
      if (request.query === command.query.text.trim())
        return { status: 'unchanged', reason: 'no-effective-change' };
      if (entry.generation === Number.MAX_SAFE_INTEGER)
        return { status: 'rejected', reason: 'generation-exhausted' };
      if (workingState.revision >= Number.MAX_SAFE_INTEGER)
        return { status: 'rejected', reason: 'invalid-result' };
      const outcome = applyPendingQueryCommand(workingState, {
        entity: entry.criterion, operation: 'change', baseRevision: workingState.revision,
        request: { ...request, query: command.query.text },
      });
      if (outcome.status !== 'applied')
        return { status: 'rejected', reason: 'canonical-transition-rejected' };
      workingState = outcome.state;
    }
    entry.generation += 1;
    invalidatedQueries.push(query.ref);
  } else {
    const targets = command.scope === 'intention'
      ? [...entry.children] : entry.children.filter((query) => query.ref === command.queryRef);
    if (command.scope === 'query' && targets.length === 0)
      return { status: 'rejected', reason: 'unknown-query' };
    const removesParent = command.scope === 'intention' || targets.length === entry.children.length;
    if (!removesParent && entry.generation === Number.MAX_SAFE_INTEGER)
      return { status: 'rejected', reason: 'generation-exhausted' };
    for (const query of targets) {
      if (query.ownership === 'canonical') {
        if (workingState.revision >= Number.MAX_SAFE_INTEGER)
          return { status: 'rejected', reason: 'invalid-result' };
        const outcome = applyPendingQueryCommand(workingState, {
          entity: entry.criterion, operation: 'remove', ref: query.ref,
          baseRevision: workingState.revision,
        });
        if (outcome.status !== 'applied')
          return { status: 'rejected', reason: 'canonical-transition-rejected' };
        workingState = outcome.state;
      }
      invalidatedQueries.push(query.ref);
    }
    if (removesParent) {
      continuation.intentions = continuation.intentions.filter((item) => item.ref !== entry.ref);
    } else {
      const removed = new Set(invalidatedQueries);
      entry.children = entry.children.filter((query) => !removed.has(query.ref));
      entry.generation += 1;
    }
  }

  const nextState = SearchStateSchema.safeParse(workingState);
  if (!nextState.success) return { status: 'rejected', reason: 'invalid-result' };
  const nextContinuation = validateParserContinuation(continuation, nextState.data.pendingQueries);
  if (!nextContinuation.success) return { status: 'rejected', reason: 'invalid-result' };
  return {
    status: 'applied', state: nextState.data, continuation: nextContinuation.data,
    invalidated: { intentionRefs: [entry.ref], queryRefs: invalidatedQueries },
  };
}
