import type { TmdbDiscoverMovieResponse } from '@lib/schemas/tmdb-discover';

export const discoverMovieRawFixture = {
  page: 1,
  total_pages: 2,
  total_results: 25,
  results: [
    {
      id: 101,
      overview: 'Synthetic movie overview',
      poster_path: '/movie.jpg',
      backdrop_path: '/movie-backdrop.jpg',
      vote_average: 7.5,
      title: 'Synthetic Movie',
      release_date: '2024-05-01',
    },
    {
      id: 102,
      overview: 'Synthetic movie without optional data',
      poster_path: null,
      backdrop_path: null,
      vote_average: 7,
      title: 'Synthetic Undated Movie',
    },
  ],
} satisfies TmdbDiscoverMovieResponse;

export const emptyDiscoverMovieRawFixture = {
  page: 1,
  total_pages: 0,
  total_results: 0,
  results: [],
} satisfies TmdbDiscoverMovieResponse;
