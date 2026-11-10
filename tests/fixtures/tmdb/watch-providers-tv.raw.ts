import type { TmdbWatchProvidersTvResponse } from '@lib/schemas/tmdb-search';

export const watchProvidersTvRawFixture: TmdbWatchProvidersTvResponse = {
  id: 201,
  results: {
    DE: {
      link: 'https://www.themoviedb.org/watch/201',
      flatrate: [
        {
          provider_id: 8,
          provider_name: 'Netflix',
          logo_path: '/netflix.jpg',
          display_priority: 1,
        },
      ],
      rent: [],
      buy: [],
    },
  },
};

export const emptyWatchProvidersTvRawFixture: TmdbWatchProvidersTvResponse = {
  id: 201,
  results: {},
};
