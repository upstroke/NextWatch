import { describe, expect, it } from 'vitest';
import { buildDiscoverParams } from '@server/services/tmdb/discover-params';

describe('buildDiscoverParams', () => {
  // Statement coverage: maps person and keyword ids to TMDb parameters
  it('maps person and keyword ids to TMDb parameters', () => {
    const params = buildDiscoverParams('movie', {
      genreIds: [28],
      personIds: [1, 2],
      keywordIds: [10, 20],
      minRating: 7,
      yearFrom: 2020,
      yearTo: 2024,
      sortBy: 'vote_average.desc',
    });

    expect(params).toEqual({
      with_genres: '28',
      with_cast: '1,2',
      with_keywords: '10,20',
      'vote_average.gte': '7',
      'primary_release_date.gte': '2020-01-01',
      'primary_release_date.lte': '2024-12-31',
      sort_by: 'vote_average.desc',
    });
  });

  // Statement coverage: omits empty person and keyword filters
  it('omits empty person and keyword filters', () => {
    const params = buildDiscoverParams('tv', {
      genreIds: [],
      personIds: [],
      keywordIds: [],
      sortBy: 'popularity.desc',
    });

    expect(params).toEqual({ sort_by: 'popularity.desc' });
  });

  // Branch coverage: maps tv year filters to first air date parameters
  it('maps tv year filters to first air date parameters', () => {
    const params = buildDiscoverParams('tv', {
      genreIds: [],
      personIds: [],
      keywordIds: [],
      yearFrom: 2020,
      yearTo: 2024,
      sortBy: 'popularity.desc',
    });

    expect(params).toEqual({
      'first_air_date.gte': '2020-01-01',
      'first_air_date.lte': '2024-12-31',
      sort_by: 'popularity.desc',
    });
  });
});
