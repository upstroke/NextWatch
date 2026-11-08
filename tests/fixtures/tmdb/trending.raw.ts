import type { TmdbTrendingResponse } from '@lib/schemas/tmdb-trending';

export const weeklyTrendingFixture = {
  page: 1,
  total_pages: 1,
  total_results: 2,
  results: [
    {
      id: 101,
      media_type: 'movie',
      title: 'Synthetic Film',
      overview: 'A fictional fixture for tests.',
      poster_path: null,
      backdrop_path: '/synthetic-film.jpg',
      vote_average: 7.5,
      release_date: '2026-01-01',
    },
    {
      id: 202,
      media_type: 'tv',
      name: 'Synthetic Series',
      overview: 'A fictional series fixture.',
      poster_path: null,
      backdrop_path: null,
      vote_average: 8,
      first_air_date: '2026-02-01',
    },
  ],
} satisfies TmdbTrendingResponse;
