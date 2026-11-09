import type { TmdbSearchKeywordResponse } from '@lib/schemas/tmdb-search';

export const searchKeywordRawFixture = {
  page: 1,
  total_pages: 1,
  total_results: 3,
  results: [
    {
      id: 801,
      name: 'space exploration',
    },
    {
      id: 802,
      name: 'artificial intelligence',
    },
  ],
} satisfies TmdbSearchKeywordResponse;

export const emptySearchKeywordRawFixture = {
  page: 1,
  total_pages: 0,
  total_results: 0,
  results: [],
} satisfies TmdbSearchKeywordResponse;
