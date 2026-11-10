import type { TmdbWatchProvidersRaw } from '@lib/schemas/tmdb-watch-providers';

export const movieWatchProvidersRawFixture = {
  id: 101,
  results: {
    DE: {
      link: 'https://www.themoviedb.org/watch/101',
      flatrate: [
        {
          provider_id: 8,
          provider_name: 'Synthetic Streaming',
          logo_path: '/streaming.jpg',
          display_priority: 1,
        },
      ],
      rent: [
        {
          provider_id: 2,
          provider_name: 'Synthetic Rental',
          logo_path: '/rental.jpg',
          display_priority: 2,
        },
      ],
      buy: [
        {
          provider_id: 3,
          provider_name: 'Synthetic Purchase',
          logo_path: '/purchase.jpg',
          display_priority: 3,
        },
      ],
    },
  },
} satisfies TmdbWatchProvidersRaw;

export const emptyMovieWatchProvidersRawFixture = {
  id: 101,
  results: {},
} satisfies TmdbWatchProvidersRaw;
