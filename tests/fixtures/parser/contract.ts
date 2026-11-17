import { PARSER_CONTRACT_VERSION } from '@lib/schemas/parser';
import type { ParserInvocation } from '@lib/schemas/parser';

/** Creates isolated synthetic context; no real user data or provider provenance. */
export function parserInvocationFixture(): ParserInvocation {
  return {
    requestRef: 'parser-call-1', baseRevision: 4, sessionSequence: 2,
    userInput: 'Nur Serien und mit Chris',
    context: {
      criteria: {
        mediaType: 'movie', sortBy: 'popularity.desc', minRating: null, minYear: null, maxYear: null,
        people: [{ ref: 'accepted-tom', label: 'Tom Hanks' }], keywords: [], genres: [],
      },
      pending: [], activeClarification: null,
      genreCatalogs: {
        movie: [{ id: 35, name: 'Comedy' }],
        tv: [{ id: 35, name: 'Comedy' }],
      },
    },
  };
}

/** Mixed independent proposals retain Chris as unresolved wording, not a provider ID. */
export function mixedParserProposalFixture() {
  return {
    contractVersion: PARSER_CONTRACT_VERSION,
    groups: [
      { items: [{ kind: 'filter', inputExcerpt: 'Nur Serien', operation: 'set', field: 'mediaType', value: 'tv' }] },
      { items: [{ kind: 'entity', inputExcerpt: 'mit Chris', entityType: 'person', operation: 'add', queries: [{ text: 'Chris', correction: null }] }] },
    ],
  };
}
