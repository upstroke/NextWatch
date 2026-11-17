import { z } from 'zod';
import { MAX_KEYWORD_IDS, MAX_PERSON_IDS } from '@lib/config/domain';
import { GenreCatalogsSchema } from '@lib/schemas/genre-catalogs';
import { ParserProposalSchema } from '@lib/schemas/parser-proposal';
import type { ParserProposal } from '@lib/schemas/parser-proposal';
import { PendingKeywordQuerySchema, SearchStateSchema } from '@lib/schemas/search-state';
import type { SearchState } from '@lib/schemas/search-state';
import type { PendingQueryCommand } from '@lib/schemas/search-transition';
import { applyIntent } from './apply-intent';
import type { GenreMediaChange } from './genre-compatibility';
import { applyPendingQueryCommand } from './pending-operations';

const pendingBindingsSchema = z.object({
  expectedRevision: SearchStateSchema.shape.revision,
  pendingTargets: z.array(z.object({
    targetKey: z.string(),
    entity: z.enum(['person', 'keyword']),
    ref: PendingKeywordQuerySchema.shape.ref,
  }).strict()).max(MAX_PERSON_IDS + MAX_KEYWORD_IDS),
}).strict();

type RejectionReason =
  | 'invalid-state'
  | 'invalid-proposal'
  | 'stale-revision'
  | 'invalid-bindings'
  | 'invalid-genre-catalogs'
  | 'unknown-genre'
  | 'invalid-change'
  | 'invalid-pending-command';

export type ApplyParserProposalResult =
  | {
      status: 'applied';
      state: SearchState;
      mediaChange?: GenreMediaChange;
      pendingInvalidation?: { sourceRevision: number; refs: string[] };
    }
  | { status: 'unchanged'; reason: 'no-effective-change' }
  | {
      status: 'blocked';
      reason: 'clarification' | 'unsupported' | 'unsupported-genre-scope' | 'unsupported-pending-operations';
      proposal: ParserProposal;
    }
  | { status: 'rejected'; reason: RejectionReason; proposal: unknown; detail?: string };

/**
 * Applies proposals privately through existing pure transitions, exposing no partial state.
 * pendingBindings must be the original application-owned buildParserInput().bindings,
 * never model/client data or bindings rebuilt after receiving a response. Both original
 * revisions and the complete ordered target mapping are checked against the current draft.
 * Structure/mapping checks do not establish request provenance or prevent same-revision
 * response swaps; trusted request association and response consumption remain caller duties.
 * Pending edits preserve replacement context. Discard removes only the pending request.
 * Internal commands use working revisions only after original association checks; external
 * replies are never rebased. Each effective transition retains its own revision increment.
 * When pending operations are present and the full proposal changes state, pendingInvalidation
 * lists all original pending refs whose source-revision bindings are obsolete, including
 * unchanged siblings. It does not remove siblings or manage clarification sessions.
 * Missing pending bindings block nonempty operations; malformed supplied bindings reject.
 * Accepted-identity edits, provider lookup, persistence and search execution are not added.
 * @param state Current draft.
 * @param input Untrusted parser proposal.
 * @param context Original application bindings, fresh addition refs and optional genre catalogs.
 * @returns Complete next draft, no-op, retained blocked proposal or rejection.
 */
export function applyParserProposal(
  state: SearchState,
  input: unknown,
  context: {
    expectedRevision: number;
    personRefs: readonly string[];
    keywordRefs: readonly string[];
    pendingBindings?: unknown;
    genreCatalogs?: unknown;
  },
): ApplyParserProposalResult {
  const reject = (reason: RejectionReason, detail?: string): ApplyParserProposalResult =>
    detail === undefined
      ? { status: 'rejected', reason, proposal: input }
      : { status: 'rejected', reason, proposal: input, detail };
  const source = SearchStateSchema.safeParse(state);
  if (!source.success) return reject('invalid-state');
  if (!SearchStateSchema.shape.revision.safeParse(context.expectedRevision).success ||
      context.expectedRevision !== source.data.revision) return reject('stale-revision');
  const parsed = ParserProposalSchema.safeParse(input);
  if (!parsed.success) return reject('invalid-proposal');
  const proposal = parsed.data;
  if (proposal.status !== 'ready') {
    return {
      status: 'blocked',
      reason: proposal.status === 'needs_clarification' ? 'clarification' : 'unsupported',
      proposal,
    };
  }

  const operations = proposal.pendingOperations ?? [];
  const commands: PendingQueryCommand[] = [];
  if (operations.length > 0) {
    if (context.pendingBindings === undefined) {
      return { status: 'blocked', reason: 'unsupported-pending-operations', proposal };
    }
    const bound = pendingBindingsSchema.safeParse(context.pendingBindings);
    if (!bound.success) return reject('invalid-bindings');
    if (bound.data.expectedRevision !== context.expectedRevision) return reject('stale-revision');
    const expectedTargets = [
      ...source.data.pendingQueries.personQueries.map((request, index) => ({
        targetKey: `person-${index + 1}`, entity: 'person', ref: request.ref,
      })),
      ...source.data.pendingQueries.keywordQueries.map((request, index) => ({
        targetKey: `keyword-${index + 1}`, entity: 'keyword', ref: request.ref,
      })),
    ];
    if (bound.data.pendingTargets.length !== expectedTargets.length ||
        expectedTargets.some((expected, index) => {
          const actual = bound.data.pendingTargets[index];
          return !actual || actual.targetKey !== expected.targetKey ||
            actual.entity !== expected.entity || actual.ref !== expected.ref;
        })) return reject('invalid-bindings');

    for (const operation of operations) {
      const target = bound.data.pendingTargets.find((entry) => entry.targetKey === operation.targetKey);
      if (!target) return reject('invalid-bindings');
      if (operation.operation === 'discard') {
        commands.push({
          entity: target.entity, operation: 'remove',
          baseRevision: source.data.revision, ref: target.ref,
        });
      } else if (target.entity === 'person') {
        const request = source.data.pendingQueries.personQueries.find((entry) => entry.ref === target.ref);
        if (!request) return reject('invalid-bindings');
        commands.push({
          entity: 'person', operation: 'change', baseRevision: source.data.revision,
          request: { ...request, query: operation.query },
        });
      } else {
        const request = source.data.pendingQueries.keywordQueries.find((entry) => entry.ref === target.ref);
        if (!request) return reject('invalid-bindings');
        commands.push({
          entity: 'keyword', operation: 'change', baseRevision: source.data.revision,
          request: { ...request, query: operation.query },
        });
      }
    }
  }

  const refs = [...context.personRefs, ...context.keywordRefs];
  const existingRefs = new Set([
    ...source.data.pendingQueries.personQueries,
    ...source.data.pendingQueries.keywordQueries,
  ].map((request) => request.ref));
  if (context.personRefs.length !== proposal.people.length ||
      context.keywordRefs.length !== proposal.keywords.length ||
      !PendingKeywordQuerySchema.shape.ref.array().safeParse(refs).success ||
      new Set(refs).size !== refs.length || refs.some((ref) => existingRefs.has(ref))) {
    return reject('invalid-bindings');
  }

  let targetMedia = source.data.filters.mediaType;
  for (const change of proposal.changes) {
    if (change.field === 'mediaType') targetMedia = change.value;
  }
  const genreChanges = proposal.changes.filter((change) => change.field === 'genreIds');
  if (genreChanges.some((change) => change.value.length > 0)) {
    const catalogs = GenreCatalogsSchema.safeParse(context.genreCatalogs);
    if (!catalogs.success) return reject('invalid-genre-catalogs');
    const known = new Set([...catalogs.data.movie, ...catalogs.data.tv].map((genre) => genre.id));
    const allowed = new Set((targetMedia === 'all'
      ? [...catalogs.data.movie, ...catalogs.data.tv]
      : catalogs.data[targetMedia]).map((genre) => genre.id));
    for (const change of genreChanges) {
      if (change.value.some((id) => !known.has(id))) return reject('unknown-genre');
      if (change.operation !== 'remove' && change.value.some((id) => !allowed.has(id))) {
        return { status: 'blocked', reason: 'unsupported-genre-scope', proposal };
      }
    }
  }

  let working = source.data;
  let applied = false;
  let mediaChange: GenreMediaChange | undefined;
  const filters = applyIntent(working, {
    status: 'ready',
    baseRevision: working.revision,
    changes: proposal.changes.map((change) => ({
      ...change,
      value: change.operation === 'remove' && change.field !== 'genreIds'
        ? undefined : change.value,
    })),
  }, context.genreCatalogs);
  if (filters.status === 'rejected') return reject('invalid-change', filters.reason);
  if (filters.status === 'applied') {
    working = filters.state;
    mediaChange = filters.mediaChange;
    applied = true;
  }

  for (const command of commands) {
    const result = applyPendingQueryCommand(working, { ...command, baseRevision: working.revision });
    if (result.status === 'rejected') return reject('invalid-pending-command', result.reason);
    if (result.status === 'applied') {
      working = result.state;
      applied = true;
    }
  }

  const additions = [
    ...proposal.people.map((query, index) => ({
      entity: 'person', ref: context.personRefs[index], query,
    })),
    ...proposal.keywords.map((query, index) => ({
      entity: 'keyword', ref: context.keywordRefs[index], query,
    })),
  ];
  for (const addition of additions) {
    const result = applyPendingQueryCommand(working, {
      entity: addition.entity,
      operation: 'add',
      baseRevision: working.revision,
      request: addition.entity === 'person'
        ? { ref: addition.ref, query: addition.query, operation: 'add' }
        : { ref: addition.ref, query: addition.query },
    });
    if (result.status !== 'applied') {
      return reject('invalid-pending-command', result.reason);
    }
    working = result.state;
    applied = true;
  }
  if (!applied) return { status: 'unchanged', reason: 'no-effective-change' };
  return {
    status: 'applied',
    state: working,
    ...(mediaChange ? { mediaChange } : {}),
    ...(operations.length > 0 ? {
      pendingInvalidation: { sourceRevision: source.data.revision, refs: [...existingRefs] },
    } : {}),
  };
}
