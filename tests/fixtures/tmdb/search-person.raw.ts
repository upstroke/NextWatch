import type { TmdbSearchPersonResponse } from '@lib/schemas/tmdb-search';

export const searchPersonRawFixture = {
  page: 1,
  total_pages: 1,
  total_results: 5,
  results: [
    {
      id: 301,
      name: 'Synthetic Person',
      profile_path: '/person.jpg',
      known_for: [
        {
          id: 101,
          media_type: 'movie',
          title: 'Synthetic Movie',
        },
        {
          id: 201,
          media_type: 'tv',
          name: 'Synthetic Series',
        },
      ],
    },
    {
      id: 302,
      name: 'Synthetic Person Without Metadata',
    },
  ],
} satisfies TmdbSearchPersonResponse;

export const emptySearchPersonRawFixture = {
  page: 1,
  total_pages: 0,
  total_results: 0,
  results: [],
} satisfies TmdbSearchPersonResponse;
