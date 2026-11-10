import type { TmdbSearchTvResponse } from '@lib/schemas/tmdb-search';

export const searchTvRawFixture = {
  page: 1,
  total_pages: 1,
  total_results: 12,
  results: [
    {
      id: 201,
      name: 'Synthetic Series',
      overview: 'Synthetic series overview',
      poster_path: '/series.jpg',
      backdrop_path: '/series-backdrop.jpg',
      first_air_date: '2024-06-01',
      vote_average: 8,
    },
    {
      id: 202,
      name: 'Synthetic Undated Series',
    },
  ],
} satisfies TmdbSearchTvResponse;

export const emptySearchTvRawFixture = {
  page: 1,
  total_pages: 0,
  total_results: 0,
  results: [],
} satisfies TmdbSearchTvResponse;
