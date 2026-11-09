import type { TmdbSearchMovieResponse } from '@lib/schemas/tmdb-search';

export const searchMovieRawFixture = {
  page: 1,
  total_pages: 2,
  total_results: 25,
  results: [
    {
      id: 101,
      title: 'Synthetic Movie',
      overview: 'Synthetic movie overview',
      poster_path: '/movie.jpg',
      backdrop_path: '/movie-backdrop.jpg',
      release_date: '2024-05-01',
      vote_average: 7.5,
    },
    {
      id: 102,
      title: 'Synthetic Undated Movie',
    },
  ],
} satisfies TmdbSearchMovieResponse;

export const emptySearchMovieRawFixture = {
  page: 1,
  total_pages: 0,
  total_results: 0,
  results: [],
} satisfies TmdbSearchMovieResponse;
