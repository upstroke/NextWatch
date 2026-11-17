import { GenreCatalogsSchema } from '@lib/schemas/genre-catalogs';
import { ParserProposalSchema } from '@lib/schemas/parser-proposal';
import type { ParserProposal } from '@lib/schemas/parser-proposal';
import { PendingKeywordQuerySchema, SearchStateSchema } from '@lib/schemas/search-state';
import type { SearchState } from '@lib/schemas/search-state';
import { applyIntent } from './apply-intent';
import type { GenreMediaChange } from './genre-compatibility';
import { applyPendingQueryCommand } from './pending-operations';

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
  | { status: 'applied'; state: SearchState; mediaChange?: GenreMediaChange }
  | { status: 'unchanged'; reason: 'no-effective-change' }
  | {
      status: 'blocked';
      reason: 'clarification' | 'unsupported' | 'unsupported-genre-scope' | 'unsupported-pending-operations';
      proposal: ParserProposal;
    }
  | { status: 'rejected'; reason: RejectionReason; proposal: unknown; detail?: string };

/**
 * Applies a supported parser proposal through existing pure domain transitions.
 * The caller supplies trusted original-request association, expected revision,
 * fresh references and complete provider-fetched catalogs; none come from the model.
 * Work is private until success. Rejections expose no intermediate state. Each
 * effective internal transition retains its own revision increment. This function
 * does not rebase provider replies, resolve identities, authorize or run searches.
 * Entity replacement/refinement and incompatible new genre wishes remain blocked
 * or rejected with the proposal retained, never silently converted to additions.
 * Nonempty pendingOperations are blocked in full until target-bound application
 * is implemented; accompanying filters/additions must not be applied on their own.
 * @param state Current draft.
 * @param input Untrusted parser proposal.
 * @param context Application-owned bindings and optional complete genre catalogs.
 * @returns A complete next draft, no-op, retained blocked proposal or rejection.
 */
export function applyParserProposal(
  state: SearchState,
  input: unknown,
  context: {
    expectedRevision: number;
    personRefs: readonly string[];
    keywordRefs: readonly string[];
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
  if (proposal.pendingOperations?.length) {
    return { status: 'blocked', reason: 'unsupported-pending-operations', proposal };
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
  return mediaChange
    ? { status: 'applied', state: working, mediaChange }
    : { status: 'applied', state: working };
}
