import type { TmdbMovieDetailRaw } from '@lib/schemas/tmdb-detail';

export const movieDetailRawFixture: TmdbMovieDetailRaw = {
  id: 101,
  title: 'Synthetic Movie',
  original_title: 'Synthetic Original Movie',
  overview: 'Synthetic movie overview',
  tagline: 'Synthetic movie tagline',
  poster_path: '/movie.jpg',
  backdrop_path: '/movie-backdrop.jpg',
  vote_average: 7.5,
  vote_count: 120,
  genres: [
    { id: 28, name: 'Action' },
    { id: 878, name: 'Science Fiction' },
  ],
  original_language: 'en',
  status: 'Released',
  homepage: 'https://example.com/movie',
  popularity: 42.5,
  release_date: '2024-05-01',
  runtime: 118,
};

export const minimalMovieDetailRawFixture: TmdbMovieDetailRaw = {
  id: 102,
  title: 'Synthetic Minimal Movie',
  original_title: 'Synthetic Minimal Original Movie',
  overview: null,
  tagline: null,
  poster_path: null,
  backdrop_path: null,
  vote_average: 0,
  vote_count: 0,
  genres: [],
  original_language: 'en',
  status: 'Released',
  homepage: null,
  popularity: 0,
  release_date: null,
  runtime: null,
};
