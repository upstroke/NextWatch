import type { TmdbWatchProvidersMovieResponse } from '@lib/schemas/tmdb-search';

export const watchProvidersMovieRawFixture: TmdbWatchProvidersMovieResponse = {
  id: 101,
  results: {
    DE: {
      link: 'https://www.themoviedb.org/watch/101',
      flatrate: [
        {
          provider_id: 8,
          provider_name: 'Netflix',
          logo_path: '/netflix.jpg',
          display_priority: 1,
        },
      ],
      rent: [
        {
          provider_id: 2,
          provider_name: 'Apple TV',
          logo_path: '/apple-tv.jpg',
          display_priority: 2,
        },
      ],
      buy: [
        {
          provider_id: 2,
          provider_name: 'Apple TV',
          logo_path: '/apple-tv.jpg',
          display_priority: 3,
        },
      ],
    },
  },
};

export const emptyWatchProvidersMovieRawFixture: TmdbWatchProvidersMovieResponse = {
  id: 101,
  results: {},
};
