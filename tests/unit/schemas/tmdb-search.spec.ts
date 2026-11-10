import { describe, expect, it } from 'vitest';
import {
  TmdbSearchKeywordResponseSchema,
  TmdbSearchMovieResponseSchema,
  TmdbSearchMultiResponseSchema,
  TmdbSearchPersonResponseSchema,
  TmdbSearchTvResponseSchema,
  TmdbWatchProvidersMovieSchema,
  TmdbWatchProvidersMovieResponseSchema,
  TmdbWatchProvidersTvSchema,
  TmdbWatchProvidersTvResponseSchema,
  WatchProviderAvailabilitySchema,
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
import { emptySearchTvRawFixture, searchTvRawFixture } from '@tests/fixtures/tmdb/search-tv.raw';
import {
  emptyWatchProvidersMovieRawFixture,
  watchProvidersMovieRawFixture,
} from '@tests/fixtures/tmdb/watch-providers-movie.raw';
import {
  emptyWatchProvidersTvRawFixture,
  watchProvidersTvRawFixture,
} from '@tests/fixtures/tmdb/watch-providers-tv.raw';

describe('TmdbSearchMovieResponseSchema', () => {
  // Statement coverage: accepts a valid movie search response
  it('accepts a valid movie search response', () => {
    expect(TmdbSearchMovieResponseSchema.parse(searchMovieRawFixture)).toEqual(
      searchMovieRawFixture,
    );
  });

  // Statement coverage: accepts an empty movie search response
  it('accepts an empty movie search response', () => {
    expect(TmdbSearchMovieResponseSchema.parse(emptySearchMovieRawFixture)).toEqual(
      emptySearchMovieRawFixture,
    );
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
    expect(TmdbSearchTvResponseSchema.parse(searchTvRawFixture)).toEqual(searchTvRawFixture);
  });

  // Statement coverage: accepts an empty tv search response
  it('accepts an empty tv search response', () => {
    expect(TmdbSearchTvResponseSchema.parse(emptySearchTvRawFixture)).toEqual(
      emptySearchTvRawFixture,
    );
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
    expect(TmdbSearchMultiResponseSchema.parse(searchMultiRawFixture)).toEqual(
      searchMultiRawFixture,
    );
  });

  // Statement coverage: accepts an empty multi search response
  it('accepts an empty multi search response', () => {
    expect(TmdbSearchMultiResponseSchema.parse(emptySearchMultiRawFixture)).toEqual(
      emptySearchMultiRawFixture,
    );
  });

  // Branch coverage: rejects an unsupported multi search media type
  it('rejects an unsupported multi search media type', () => {
    const response = {
      ...searchMultiRawFixture,
      results: [
        {
          media_type: 'unknown',
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
    expect(TmdbSearchPersonResponseSchema.parse(searchPersonRawFixture)).toEqual(
      searchPersonRawFixture,
    );
  });

  // Statement coverage: accepts an empty person search response
  it('accepts an empty person search response', () => {
    expect(TmdbSearchPersonResponseSchema.parse(emptySearchPersonRawFixture)).toEqual(
      emptySearchPersonRawFixture,
    );
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
    expect(TmdbSearchKeywordResponseSchema.parse(searchKeywordRawFixture)).toEqual(
      searchKeywordRawFixture,
    );
  });

  // Statement coverage: accepts an empty keyword search response
  it('accepts an empty keyword search response', () => {
    expect(TmdbSearchKeywordResponseSchema.parse(emptySearchKeywordRawFixture)).toEqual(
      emptySearchKeywordRawFixture,
    );
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

describe('TmdbWatchProvidersMovieResponseSchema', () => {
  // Statement coverage: accepts a valid movie watch provider response
  it('accepts a valid movie watch provider response', () => {
    expect(TmdbWatchProvidersMovieResponseSchema.parse(watchProvidersMovieRawFixture)).toEqual(
      watchProvidersMovieRawFixture,
    );
  });

  // Statement coverage: accepts an empty movie watch provider response
  it('accepts an empty movie watch provider response', () => {
    expect(TmdbWatchProvidersMovieResponseSchema.parse(emptyWatchProvidersMovieRawFixture)).toEqual(
      emptyWatchProvidersMovieRawFixture,
    );
  });

  // Branch coverage: rejects a movie watch provider response without a provider name
  it('rejects a movie watch provider response without a provider name', () => {
    const response = {
      ...watchProvidersMovieRawFixture,
      results: {
        DE: {
          flatrate: [{ provider_id: 8 }],
        },
      },
    };

    expect(() => TmdbWatchProvidersMovieResponseSchema.parse(response)).toThrow();
  });
});

describe('TmdbWatchProvidersTvResponseSchema', () => {
  // Statement coverage: accepts a valid tv watch provider response
  it('accepts a valid tv watch provider response', () => {
    expect(TmdbWatchProvidersTvResponseSchema.parse(watchProvidersTvRawFixture)).toEqual(
      watchProvidersTvRawFixture,
    );
  });

  // Statement coverage: accepts an empty tv watch provider response
  it('accepts an empty tv watch provider response', () => {
    expect(TmdbWatchProvidersTvResponseSchema.parse(emptyWatchProvidersTvRawFixture)).toEqual(
      emptyWatchProvidersTvRawFixture,
    );
  });

  // Branch coverage: rejects a tv watch provider response without a provider id
  it('rejects a tv watch provider response without a provider id', () => {
    const response = {
      ...watchProvidersTvRawFixture,
      results: {
        DE: {
          flatrate: [{ provider_name: 'Netflix' }],
        },
      },
    };

    expect(() => TmdbWatchProvidersTvResponseSchema.parse(response)).toThrow();
  });
});

describe('normalized watch provider contracts', () => {
  // Statement coverage: accepts a normalized movie watch provider response
  it('accepts a normalized movie watch provider response', () => {
    const response = {
      id: 101,
      results: {
        DE: {
          region: 'DE',
          link: 'https://www.themoviedb.org/watch/101',
          streaming: [
            {
              id: 8,
              name: 'Netflix',
              logoPath: '/netflix.jpg',
              displayPriority: 1,
            },
          ],
          rental: [],
          purchase: [],
        },
      },
    };

    expect(TmdbWatchProvidersMovieSchema.parse(response)).toEqual(response);
  });

  // Statement coverage: accepts a normalized tv watch provider response
  it('accepts a normalized tv watch provider response', () => {
    const response = {
      id: 201,
      results: {
        DE: {
          region: 'DE',
          streaming: [],
          rental: [],
          purchase: [],
        },
      },
    };

    expect(TmdbWatchProvidersTvSchema.parse(response)).toEqual(response);
  });

  // Statement coverage: accepts a normalized watch provider availability
  it('accepts a normalized watch provider availability', () => {
    const availability = {
      region: 'DE',
      link: 'https://www.themoviedb.org/watch/101',
      streaming: [],
      rental: [],
      purchase: [],
    };

    expect(WatchProviderAvailabilitySchema.parse(availability)).toEqual(availability);
  });

  // Branch coverage: rejects unknown normalized watch provider properties
  it('rejects unknown normalized watch provider properties', () => {
    expect(() =>
      WatchProviderAvailabilitySchema.parse({
        region: 'DE',
        streaming: [],
        rental: [],
        purchase: [],
        unsupported: true,
      }),
    ).toThrow();
  });

  // Branch coverage: rejects an invalid normalized watch provider id
  it('rejects an invalid normalized watch provider id', () => {
    expect(() =>
      TmdbWatchProvidersMovieSchema.parse({
        id: 0,
        results: {},
      }),
    ).toThrow();
  });
});
