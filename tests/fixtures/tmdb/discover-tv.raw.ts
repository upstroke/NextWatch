import type { TmdbDiscoverTvResponse } from '@lib/schemas/tmdb-discover';

export const discoverTvRawFixture = {
  page: 1,
  total_pages: 3,
  total_results: 30,
  results: [
    {
      id: 201,
      overview: 'Synthetic series overview',
      poster_path: '/series.jpg',
      backdrop_path: '/series-backdrop.jpg',
      vote_average: 8.1,
      name: 'Synthetic Series',
      first_air_date: '2024-06-01',
    },
    {
      id: 202,
      overview: 'Synthetic series without optional data',
      poster_path: null,
      backdrop_path: null,
      vote_average: 7,
      name: 'Synthetic Undated Series',
    },
  ],
} satisfies TmdbDiscoverTvResponse;

export const emptyDiscoverTvRawFixture = {
  page: 1,
  total_pages: 0,
  total_results: 0,
  results: [],
} satisfies TmdbDiscoverTvResponse;
