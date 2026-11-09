import type { TmdbWatchProvidersRaw } from '@lib/schemas/tmdb-watch-providers';

export const tvWatchProvidersRawFixture = {
  id: 201,
  results: {
    DE: {
      link: 'https://www.themoviedb.org/watch/201',
      flatrate: [
        {
          provider_id: 8,
          provider_name: 'Synthetic Streaming',
          logo_path: '/streaming.jpg',
          display_priority: 1,
        },
      ],
      rent: [],
      buy: [],
    },
  },
} satisfies TmdbWatchProvidersRaw;

export const emptyTvWatchProvidersRawFixture = {
  id: 201,
  results: {},
} satisfies TmdbWatchProvidersRaw;
