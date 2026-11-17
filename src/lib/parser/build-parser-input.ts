import { z } from 'zod';
import { MAX_GENRE_IDS, MAX_KEYWORD_IDS, MAX_PERSON_IDS } from '@lib/config/domain';
import { SEARCH_FILTER_CATALOG } from '@lib/domain/search/filter-catalog';
import { ChatStatusSchema, FilterOperationSchema } from '@lib/schemas/chat';
import { GenreCatalogsSchema } from '@lib/schemas/genre-catalogs';
import type { GenreCatalogs } from '@lib/schemas/genre-catalogs';
import {
  ParserFilterChangeSchema, ParserPendingOperationSchema, ParserProposalSchema,
} from '@lib/schemas/parser-proposal';
import { MediaTypeSchema, SearchFiltersSchema, SearchSortSchema } from '@lib/schemas/search';
import { SearchStateSchema } from '@lib/schemas/search-state';
import type { SearchState } from '@lib/schemas/search-state';
import { PARSER_INSTRUCTIONS, PARSER_INSTRUCTIONS_VERSION } from './instructions';

const parserInputSchema = z.object({
  userText: z.string().refine((text) => text.trim().length > 0),
  state: SearchStateSchema,
  genreCatalogs: GenreCatalogsSchema.optional(),
});

/** Application-only association; never include this object in the model request. */
export type ParserInputBindings = {
  expectedRevision: number;
  pendingTargets: { targetKey: string; entity: 'person' | 'keyword'; ref: string }[];
};

function createPendingTargets(state: SearchState) {
  return [
    ...state.pendingQueries.personQueries.map((request, index) => ({
      targetKey: `person-${index + 1}`,
      entity: 'person' as const,
      query: request.query,
      ref: request.ref,
    })),
    ...state.pendingQueries.keywordQueries.map((request, index) => ({
      targetKey: `keyword-${index + 1}`,
      entity: 'keyword' as const,
      query: request.query,
      ref: request.ref,
    })),
  ];
}

function composeInput(
  userText: string,
  state: SearchState,
  pendingTargets: ReturnType<typeof createPendingTargets>,
  genreCatalogs?: GenreCatalogs,
) {
  const fields = Object.keys(SEARCH_FILTER_CATALOG);
  return {
    instructionVersion: PARSER_INSTRUCTIONS_VERSION,
    instructions: PARSER_INSTRUCTIONS,
    context: {
      filters: state.filters,
      acceptedPeople: state.people.map((person) => person.name),
      pendingPeople: state.pendingQueries.personQueries.map((request) => ({
        query: request.query,
        operation: request.operation,
        replaces: request.operation === 'replace'
          ? state.people.filter((person) => person.id === request.targetPersonId)
            .map((person) => person.name)
          : [],
      })),
      pendingKeywords: state.pendingQueries.keywordQueries.map((request) => request.query),
      pendingTargets: pendingTargets.map(({ targetKey, entity, query }) => ({
        targetKey, entity, query,
      })),
      inactiveGenreIds: (state.inactiveGenres ?? []).map((genre) => genre.id),
      genreCatalogs: genreCatalogs ?? null,
      capabilities: {
        statuses: ChatStatusSchema.options.filter((status) =>
          ParserProposalSchema.options.some((option) => option.shape.status.safeParse(status).success)),
        changes: ParserFilterChangeSchema.options.map((option) => ({
          fields: fields.filter((field) => option.shape.field.safeParse(field).success),
          operations: FilterOperationSchema.options.filter((operation) =>
            option.shape.operation.safeParse(operation).success),
        })),
        pendingOperations: ParserPendingOperationSchema.options.map((option) => ({
          operation: option.shape.operation.value,
          fields: Object.keys(option.shape).filter((field) => field !== 'operation'),
        })),
        pendingOperationLimit: MAX_PERSON_IDS + MAX_KEYWORD_IDS,
        mediaTypes: [...MediaTypeSchema.options],
        sortValues: [...SearchSortSchema.options],
        ranges: {
          minRating: {
            min: SearchFiltersSchema.shape.minRating.unwrap().minValue,
            max: SearchFiltersSchema.shape.minRating.unwrap().maxValue,
          },
          minYear: {
            min: SearchFiltersSchema.shape.minYear.unwrap().minValue,
            max: SearchFiltersSchema.shape.minYear.unwrap().maxValue,
          },
          maxYear: {
            min: SearchFiltersSchema.shape.maxYear.unwrap().minValue,
            max: SearchFiltersSchema.shape.maxYear.unwrap().maxValue,
          },
        },
        limits: { people: MAX_PERSON_IDS, keywords: MAX_KEYWORD_IDS, genres: MAX_GENRE_IDS },
      },
    },
    userText,
  };
}

/**
 * Validates and prepares provider-neutral parser input without network or mutation.
 * Send only result.input to the model; retain result.bindings with the original
 * application-owned request. Local target keys may repeat in later preparations
 * and are neither stable references nor authorization tokens. The caller must
 * establish request association and check the original revision before applying
 * a response; this helper does not enforce expiry, replay protection or selection.
 * Fixed instructions, projected context and original user text remain separate.
 * Unknown outer properties are not forwarded. State/catalog structures reuse
 * existing contracts; their caller must establish provenance and completeness.
 * Pending capabilities project the proposal schema; actual target membership,
 * revision and atomic application remain domain checks using original bindings.
 * No output schema, model invocation or response processing occurs.
 * @param input User text, current state and optional trusted genre catalogs.
 * @returns Independent model input and application bindings, or a sanitized rejection.
 */
export function buildParserInput(input: unknown):
  | { status: 'prepared'; input: ReturnType<typeof composeInput>; bindings: ParserInputBindings }
  | { status: 'rejected'; reason: 'invalid-input' } {
  const parsed = parserInputSchema.safeParse(input);
  if (!parsed.success) return { status: 'rejected', reason: 'invalid-input' };
  const { userText, state, genreCatalogs } = parsed.data;
  const pendingTargets = createPendingTargets(state);
  return {
    status: 'prepared',
    input: composeInput(userText, state, pendingTargets, genreCatalogs),
    bindings: {
      expectedRevision: state.revision,
      pendingTargets: pendingTargets.map(({ targetKey, entity, ref }) => ({
        targetKey, entity, ref,
      })),
    },
  };
}
