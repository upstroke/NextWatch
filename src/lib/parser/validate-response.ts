import { MAX_PARSER_ITEMS, MAX_PARSER_QUERIES } from '@lib/config/domain';
import {
  ParserInvocationSchema,
  ParserProposalSchema,
  ParserResponseEnvelopeSchema,
} from '@lib/schemas/parser';
import type { ParserProposal, ParserResponseEnvelope } from '@lib/schemas/parser';

export type ParserValidationResult =
  | { status: 'valid-proposal'; requestRef: string; proposal: ParserProposal }
  | {
      status: 'rejected';
      reason:
        | 'invalid-invocation'
        | 'invalid-response'
        | 'request-mismatch'
        | Exclude<ParserResponseEnvelope['status'], 'complete'>
        | 'malformed-json'
        | 'schema-invalid'
        | 'aggregate-limit'
        | 'excerpt-mismatch'
        | 'context-mismatch';
    };

/**
 * Validates one normalized response against the original application-held invocation.
 * Valid-proposal is not identity acceptance, current-state freshness or search permission.
 * Current revision/session checks belong to the later coordinator. Diagnostics contain
 * fixed reasons only, never raw model content, provider errors or conversation excerpts.
 */
export function validateParserResponse(
  input: unknown,
  originalInvocation: unknown,
): ParserValidationResult {
  const invocation = ParserInvocationSchema.safeParse(originalInvocation);
  if (!invocation.success) return { status: 'rejected', reason: 'invalid-invocation' };
  const response = ParserResponseEnvelopeSchema.safeParse(input);
  if (!response.success) return { status: 'rejected', reason: 'invalid-response' };
  if (response.data.requestRef !== invocation.data.requestRef)
    return { status: 'rejected', reason: 'request-mismatch' };
  if (response.data.status !== 'complete')
    return { status: 'rejected', reason: response.data.status };
  let decoded: unknown;
  try {
    decoded = JSON.parse(response.data.content);
  } catch {
    return { status: 'rejected', reason: 'malformed-json' };
  }
  const proposal = ParserProposalSchema.safeParse(decoded);
  if (!proposal.success) return { status: 'rejected', reason: 'schema-invalid' };
  const items = proposal.data.groups.flatMap((group) => group.items);
  const queryCount = items.reduce(
    (count, item) => count + ('queries' in item ? item.queries.length : 'query' in item ? 1 : 0),
    0,
  );
  if (items.length > MAX_PARSER_ITEMS || queryCount > MAX_PARSER_QUERIES)
    return { status: 'rejected', reason: 'aggregate-limit' };
  const { context, userInput } = invocation.data;
  const accepted = new Map<string, 'person' | 'keyword' | 'genre'>();
  for (const entry of context.criteria.people) accepted.set(entry.ref, 'person');
  for (const entry of context.criteria.keywords) accepted.set(entry.ref, 'keyword');
  for (const entry of context.criteria.genres) accepted.set(entry.ref, 'genre');
  const pending = new Map(context.pending.map((entry) => [entry.ref, entry]));
  const matchesPending = (
    ref: string,
    scope: 'query' | 'intention',
    criterion?: 'person' | 'keyword' | 'genre',
  ) => {
    const entry = pending.get(ref);
    return entry?.scope === scope && (criterion === undefined || entry.criterion === criterion);
  };
  for (const item of items) {
    if (!userInput.includes(item.inputExcerpt))
      return { status: 'rejected', reason: 'excerpt-mismatch' };
    if (item.kind === 'entity' || item.kind === 'genre') {
      const criterion = item.kind === 'entity' ? item.entityType : 'genre';
      if (
        'source' in item &&
        item.source.mode === 'reference' &&
        accepted.get(item.source.ref) !== criterion
      )
        return { status: 'rejected', reason: 'context-mismatch' };
      if (item.operation === 'refine' && !matchesPending(item.pendingRef, 'query', criterion))
        return { status: 'rejected', reason: 'context-mismatch' };
      if (
        item.operation === 'discard' &&
        !matchesPending(item.target.ref, item.target.scope, criterion)
      )
        return { status: 'rejected', reason: 'context-mismatch' };
    }
    if (item.kind === 'clarification' && item.relatedTarget !== null) {
      const target = item.relatedTarget;
      const entry = pending.get(target.ref);
      if (
        !matchesPending(target.ref, target.scope) ||
        ((item.subject === 'person' || item.subject === 'keyword' || item.subject === 'genre') &&
          entry?.criterion !== item.subject)
      )
        return { status: 'rejected', reason: 'context-mismatch' };
    }
    if (item.kind === 'clarification_answer') {
      const active = context.activeClarification;
      if (item.action === 'select_source') {
        if (
          active?.kind !== 'replacement_source' ||
          !active.options.some((option) => option.ref === item.sourceRef)
        )
          return { status: 'rejected', reason: 'context-mismatch' };
      } else if (
        active?.kind !== 'keyword_meaning' ||
        !active.options.some((option) => option.ref === item.optionRef)
      ) {
        return { status: 'rejected', reason: 'context-mismatch' };
      }
    }
  }
  return {
    status: 'valid-proposal',
    requestRef: invocation.data.requestRef,
    proposal: proposal.data,
  };
}
