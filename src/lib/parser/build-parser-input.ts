import { z } from 'zod';
import { MAX_GENRE_IDS, MAX_KEYWORD_IDS, MAX_PERSON_IDS } from '@lib/config/domain';
import { SEARCH_FILTER_CATALOG } from '@lib/domain/search/filter-catalog';
import { ChatStatusSchema, FilterOperationSchema } from '@lib/schemas/chat';
import { GenreCatalogsSchema } from '@lib/schemas/genre-catalogs';
import type { GenreCatalogs } from '@lib/schemas/genre-catalogs';
import { ParserFilterChangeSchema, ParserProposalSchema } from '@lib/schemas/parser-proposal';
import { MediaTypeSchema, SearchFiltersSchema, SearchSortSchema } from '@lib/schemas/search';
import { SearchStateSchema } from '@lib/schemas/search-state';
import type { SearchState } from '@lib/schemas/search-state';
import { PARSER_INSTRUCTIONS, PARSER_INSTRUCTIONS_VERSION } from './instructions';

const parserInputSchema = z.object({
  userText: z.string().refine((text) => text.trim().length > 0),
  state: SearchStateSchema,
  genreCatalogs: GenreCatalogsSchema.optional(),
});

function composeInput(userText: string, state: SearchState, genreCatalogs?: GenreCatalogs) {
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
 * Fixed instructions, projected context and original user text remain separate.
 * Unknown outer properties are not forwarded. State/catalog structures reuse
 * existing contracts; their caller must establish provenance and completeness.
 * Revision, request references and response authorization remain with that caller.
 * No output JSON Schema, model invocation or response processing is performed.
 * @param input User text, current state and optional trusted genre catalogs.
 * @returns An independent prepared input or a sanitized validation rejection.
 */
export function buildParserInput(input: unknown):
  | { status: 'prepared'; input: ReturnType<typeof composeInput> }
  | { status: 'rejected'; reason: 'invalid-input' } {
  const parsed = parserInputSchema.safeParse(input);
  if (!parsed.success) return { status: 'rejected', reason: 'invalid-input' };
  return {
    status: 'prepared',
    input: composeInput(parsed.data.userText, parsed.data.state, parsed.data.genreCatalogs),
  };
}
