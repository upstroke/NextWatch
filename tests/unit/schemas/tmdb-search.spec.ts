import { describe, expect, it } from 'vitest';
import {
  MultiSearchCandidateSchema,
  SearchKeywordCandidateSchema,
  SearchMovieCandidateSchema,
  SearchPersonCandidateSchema,
  SearchTvCandidateSchema,
  TmdbSearchKeywordResponseSchema,
  TmdbSearchMovieResponseSchema,
  TmdbSearchMultiResponseSchema,
  TmdbSearchPersonResponseSchema,
  TmdbSearchTvResponseSchema,
} from '@lib/schemas/tmdb-search';
import {
  emptySearchKeywordRawFixture,
  searchKeywordRawFixture,
} from '@tests/fixtures/tmdb/search-keyword.raw';
import {
  emptySearchMovieRawFixture,
  searchMovieRawFixture,
} from '@tests/fixtures/tmdb/search-movie.raw';
import {
  emptySearchMultiRawFixture,
  searchMultiRawFixture,
} from '@tests/fixtures/tmdb/search-multi.raw';
import {
  emptySearchPersonRawFixture,
  searchPersonRawFixture,
} from '@tests/fixtures/tmdb/search-person.raw';
import {
  emptySearchTvRawFixture,
  searchTvRawFixture,
} from '@tests/fixtures/tmdb/search-tv.raw';

describe('TmdbSearchMovieResponseSchema', () => {
  // Statement coverage: accepts a valid movie search response
  it('accepts a valid movie search response', () => {
    expect(
      TmdbSearchMovieResponseSchema.parse(searchMovieRawFixture),
    ).toEqual(searchMovieRawFixture);
  });

  // Statement coverage: accepts an empty movie search response
  it('accepts an empty movie search response', () => {
    expect(
      TmdbSearchMovieResponseSchema.parse(emptySearchMovieRawFixture),
    ).toEqual(emptySearchMovieRawFixture);
  });

  // Branch coverage: rejects a movie result without a title
  it('rejects a movie result without a title', () => {
    const response = {
      ...searchMovieRawFixture,
      results: [{ id: 101 }],
    };

    expect(() => TmdbSearchMovieResponseSchema.parse(response)).toThrow();
  });
});

describe('TmdbSearchTvResponseSchema', () => {
  // Statement coverage: accepts a valid tv search response
  it('accepts a valid tv search response', () => {
    expect(TmdbSearchTvResponseSchema.parse(searchTvRawFixture)).toEqual(
      searchTvRawFixture,
    );
  });

  // Statement coverage: accepts an empty tv search response
  it('accepts an empty tv search response', () => {
    expect(
      TmdbSearchTvResponseSchema.parse(emptySearchTvRawFixture),
    ).toEqual(emptySearchTvRawFixture);
  });

  // Branch coverage: rejects a tv result without a name
  it('rejects a tv result without a name', () => {
    const response = {
      ...searchTvRawFixture,
      results: [{ id: 201 }],
    };

    expect(() => TmdbSearchTvResponseSchema.parse(response)).toThrow();
  });
});

describe('TmdbSearchMultiResponseSchema', () => {
  // Statement coverage: accepts movie, tv and person results
  it('accepts movie, tv and person results', () => {
    expect(
      TmdbSearchMultiResponseSchema.parse(searchMultiRawFixture),
    ).toEqual(searchMultiRawFixture);
  });

  // Statement coverage: accepts an empty multi search response
  it('accepts an empty multi search response', () => {
    expect(
      TmdbSearchMultiResponseSchema.parse(emptySearchMultiRawFixture),
    ).toEqual(emptySearchMultiRawFixture);
  });

  // Branch coverage: rejects an unsupported multi search media type
  it('rejects an unsupported multi search media type', () => {
    const response = {
      ...searchMultiRawFixture,
      results: [
        {
          media_type: 'person',
          id: 301,
          name: 'Synthetic Person',
        },
      ],
    };

    expect(() => TmdbSearchMultiResponseSchema.parse(response)).toThrow();
  });
});

describe('TmdbSearchPersonResponseSchema', () => {
  // Statement coverage: accepts a valid person search response
  it('accepts a valid person search response', () => {
    expect(
      TmdbSearchPersonResponseSchema.parse(searchPersonRawFixture),
    ).toEqual(searchPersonRawFixture);
  });

  // Statement coverage: accepts an empty person search response
  it('accepts an empty person search response', () => {
    expect(
      TmdbSearchPersonResponseSchema.parse(emptySearchPersonRawFixture),
    ).toEqual(emptySearchPersonRawFixture);
  });

  // Branch coverage: rejects a person result without a name
  it('rejects a person result without a name', () => {
    const response = {
      ...searchPersonRawFixture,
      results: [{ id: 301 }],
    };

    expect(() => TmdbSearchPersonResponseSchema.parse(response)).toThrow();
  });
});

describe('TmdbSearchKeywordResponseSchema', () => {
  // Statement coverage: accepts a valid keyword search response
  it('accepts a valid keyword search response', () => {
    expect(
      TmdbSearchKeywordResponseSchema.parse(searchKeywordRawFixture),
    ).toEqual(searchKeywordRawFixture);
  });

  // Statement coverage: accepts an empty keyword search response
  it('accepts an empty keyword search response', () => {
    expect(
      TmdbSearchKeywordResponseSchema.parse(emptySearchKeywordRawFixture),
    ).toEqual(emptySearchKeywordRawFixture);
  });

  // Branch coverage: rejects a keyword result without a name
  it('rejects a keyword result without a name', () => {
    const response = {
      ...searchKeywordRawFixture,
      results: [{ id: 801 }],
    };

    expect(() => TmdbSearchKeywordResponseSchema.parse(response)).toThrow();
  });
});

describe('normalized search candidates', () => {
  // Statement coverage: accepts a normalized movie candidate
  it('accepts a normalized movie candidate', () => {
    const candidate = {
      id: 101,
      title: 'Synthetic Movie',
      overview: 'Synthetic movie overview',
      posterPath: '/movie.jpg',
      backdropPath: '/movie-backdrop.jpg',
      releaseDate: '2024-05-01',
      voteAverage: 7.5,
    };

    expect(SearchMovieCandidateSchema.parse(candidate)).toEqual(candidate);
  });

  // Statement coverage: accepts a normalized tv candidate
  it('accepts a normalized tv candidate', () => {
    const candidate = {
      id: 201,
      name: 'Synthetic Series',
      overview: 'Synthetic series overview',
      posterPath: '/series.jpg',
      backdropPath: '/series-backdrop.jpg',
      firstAirDate: '2024-06-01',
      voteAverage: 8,
    };

    expect(SearchTvCandidateSchema.parse(candidate)).toEqual(candidate);
  });

  // Statement coverage: accepts a normalized person candidate
  it('accepts a normalized person candidate', () => {
    const candidate = {
      id: 301,
      name: 'Synthetic Person',
      profilePath: '/person.jpg',
      knownFor: [
        {
          id: 101,
          mediaType: 'movie',
          title: 'Synthetic Movie',
        },
      ],
    };

    expect(SearchPersonCandidateSchema.parse(candidate)).toEqual(candidate);
  });

  // Statement coverage: accepts a normalized keyword candidate
  it('accepts a normalized keyword candidate', () => {
    const candidate = {
      id: 801,
      name: 'space exploration',
    };

    expect(SearchKeywordCandidateSchema.parse(candidate)).toEqual(candidate);
  });

  // Statement coverage: accepts normalized multi search candidates
  it('accepts normalized multi search candidates', () => {
    const candidates = [
      {
        mediaType: 'movie',
        id: 101,
        title: 'Synthetic Movie',
      },
      {
        mediaType: 'tv',
        id: 201,
        name: 'Synthetic Series',
      },
      {
        mediaType: 'person',
        id: 301,
        name: 'Synthetic Person',
      },
    ];

    for (const candidate of candidates) {
      expect(MultiSearchCandidateSchema.parse(candidate)).toEqual(candidate);
    }
  });

  // Branch coverage: rejects an unsupported normalized multi search media type
  it('rejects an unsupported normalized multi search media type', () => {
    expect(() =>
      MultiSearchCandidateSchema.parse({
        mediaType: 'person',
        id: 301,
        name: 'Synthetic Person',
      }),
    ).toThrow();
  });

  // Branch coverage: rejects unknown normalized candidate properties
  it('rejects unknown normalized candidate properties', () => {
    expect(() =>
      SearchMovieCandidateSchema.parse({
        id: 101,
        title: 'Synthetic Movie',
        unsupported: true,
      }),
    ).toThrow();
  });
});
