import { z } from 'zod';
import { MAX_PARSER_CONTEXT_LENGTH } from '@lib/config/domain';
import {
  SEARCH_FILTER_CATALOG,
  SEARCH_FILTER_CATALOG_VERSION,
} from '@lib/domain/search/filter-catalog';
import { PARSER_CONTRACT_VERSION, ParserInvocationSchema } from '@lib/schemas/parser';
import type { ParserInvocation } from '@lib/schemas/parser';
import { PARSER_INSTRUCTIONS, PARSER_INSTRUCTION_VERSION } from './instructions';

export type ParserCompositionResult =
  | {
      status: 'composed';
      request: {
        instructionVersion: string;
        instructions: string;
        contextJson: string;
        userInput: string;
      };
      association: ParserInvocation;
    }
  | { status: 'rejected'; reason: 'invalid-input' | 'context-too-large' };

/**
 * Validates prepared application input and separates instructions, context and user data.
 * The association is application-only: retain it locally, never accept it from a client
 * as authoritative or send it as part of the model context. No lookup or mutation occurs.
 */
export function composeParserRequest(input: unknown): ParserCompositionResult {
  const parsed = ParserInvocationSchema.safeParse(input);
  if (!parsed.success) return { status: 'rejected', reason: 'invalid-input' };
  const invocation = parsed.data;
  const { criteria, pending, activeClarification, genreCatalogs } = invocation.context;
  const scalars = Object.entries(SEARCH_FILTER_CATALOG).flatMap(([field, definition]) => {
    if (definition.kind !== 'scalar') return [];
    return [
      {
        field,
        operations: definition.operations.includes('remove') ? ['set', 'remove'] : ['set'],
        valueSchema: z.toJSONSchema(definition.valueSchema.unwrap()),
      },
    ];
  });
  const contextJson = JSON.stringify({
    contractVersion: PARSER_CONTRACT_VERSION,
    catalogVersion: SEARCH_FILTER_CATALOG_VERSION,
    capabilities: {
      scalars,
      person: ['add', 'refine', 'replace', 'remove', 'discard'],
      keyword: ['add', 'refine', 'replace', 'replace_all', 'remove', 'discard'],
      genre: ['add', 'refine', 'replace', 'replace_all', 'remove', 'discard'],
      clarificationAnswers:
        activeClarification?.kind === 'replacement_source'
          ? ['select_source']
          : activeClarification?.kind === 'keyword_meaning'
            ? ['select_meaning']
            : [],
      interpretations: ['clarification', 'unsupported'],
    },
    criteria,
    pending,
    activeClarification,
    genreCatalogs: {
      movie: genreCatalogs.movie.map((genre) => ({ label: genre.name })),
      tv: genreCatalogs.tv.map((genre) => ({ label: genre.name })),
    },
  });
  if (contextJson.length > MAX_PARSER_CONTEXT_LENGTH)
    return { status: 'rejected', reason: 'context-too-large' };
  return {
    status: 'composed',
    request: {
      instructionVersion: PARSER_INSTRUCTION_VERSION,
      instructions: PARSER_INSTRUCTIONS,
      contextJson,
      userInput: invocation.userInput,
    },
    association: invocation,
  };
}
