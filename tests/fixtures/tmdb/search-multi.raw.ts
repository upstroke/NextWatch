import type { TmdbSearchMultiResponse } from '@lib/schemas/tmdb-search';

export const searchMultiRawFixture = {
  page: 1,
  total_pages: 3,
  total_results: 30,
  results: [
    {
      media_type: 'movie',
      id: 101,
      title: 'Synthetic Movie',
      overview: 'Synthetic movie overview',
      poster_path: '/movie.jpg',
      backdrop_path: '/movie-backdrop.jpg',
      release_date: '2024-05-01',
      vote_average: 7.5,
    },
    {
      media_type: 'tv',
      id: 201,
      name: 'Synthetic Series',
      overview: 'Synthetic series overview',
      poster_path: '/series.jpg',
      backdrop_path: '/series-backdrop.jpg',
      first_air_date: '2024-06-01',
      vote_average: 8,
    },
    {
      media_type: 'person',
      id: 301,
      name: 'Synthetic Person',
      profile_path: '/person.jpg',
      known_for: [
        {
          id: 101,
          media_type: 'movie',
          title: 'Synthetic Movie',
        },
      ],
    },
  ],
} satisfies TmdbSearchMultiResponse;

export const emptySearchMultiRawFixture = {
  page: 1,
  total_pages: 0,
  total_results: 0,
  results: [],
} satisfies TmdbSearchMultiResponse;
