import { describe, expect, it } from 'vitest';
import {
  TmdbWatchProvidersRawSchema,
  WatchProviderAvailabilitySchema,
} from '@lib/schemas/tmdb-watch-providers';
import {
  emptyMovieWatchProvidersRawFixture,
  movieWatchProvidersRawFixture,
} from '@tests/fixtures/tmdb/movie-watch-providers.raw';
import {
  emptyTvWatchProvidersRawFixture,
  tvWatchProvidersRawFixture,
} from '@tests/fixtures/tmdb/tv-watch-providers.raw';

describe('TmdbWatchProvidersRawSchema', () => {
  // Statement coverage: accepts a movie watch provider response
  it('accepts a movie watch provider response', () => {
    expect(
      TmdbWatchProvidersRawSchema.parse(movieWatchProvidersRawFixture),
    ).toEqual(movieWatchProvidersRawFixture);
  });

  // Statement coverage: accepts a tv watch provider response
  it('accepts a tv watch provider response', () => {
    expect(
      TmdbWatchProvidersRawSchema.parse(tvWatchProvidersRawFixture),
    ).toEqual(tvWatchProvidersRawFixture);
  });

  // Statement coverage: accepts an empty provider response
  it('accepts an empty provider response', () => {
    expect(
      TmdbWatchProvidersRawSchema.parse(emptyMovieWatchProvidersRawFixture),
    ).toEqual(emptyMovieWatchProvidersRawFixture);

    expect(
      TmdbWatchProvidersRawSchema.parse(emptyTvWatchProvidersRawFixture),
    ).toEqual(emptyTvWatchProvidersRawFixture);
  });

  // Branch coverage: rejects an invalid media id
  it('rejects an invalid media id', () => {
    expect(() =>
      TmdbWatchProvidersRawSchema.parse({
        id: 0,
        results: {},
      }),
    ).toThrow();
  });

  // Branch coverage: rejects an invalid provider id
  it('rejects an invalid provider id', () => {
    const response = {
      ...movieWatchProvidersRawFixture,
      results: {
        DE: {
          flatrate: [
            {
              provider_id: 0,
              provider_name: 'Synthetic Streaming',
            },
          ],
        },
      },
    };

    expect(() => TmdbWatchProvidersRawSchema.parse(response)).toThrow();
  });
});

describe('WatchProviderAvailabilitySchema', () => {
  // Statement coverage: accepts complete availability data
  it('accepts complete availability data', () => {
    const availability = {
      mediaId: 101,
      region: 'DE',
      stream: [
        {
          id: 8,
          name: 'Synthetic Streaming',
          logoPath: '/streaming.jpg',
          displayPriority: 1,
        },
      ],
      rent: [
        {
          id: 2,
          name: 'Synthetic Rental',
          logoPath: '/rental.jpg',
          displayPriority: 2,
        },
      ],
      buy: [
        {
          id: 3,
          name: 'Synthetic Purchase',
          logoPath: '/purchase.jpg',
          displayPriority: 3,
        },
      ],
    };

    expect(WatchProviderAvailabilitySchema.parse(availability)).toEqual(
      availability,
    );
  });

  // Statement coverage: accepts empty availability categories
  it('accepts empty availability categories', () => {
    const availability = {
      mediaId: 201,
      region: 'DE',
      stream: [],
      rent: [],
      buy: [],
    };

    expect(WatchProviderAvailabilitySchema.parse(availability)).toEqual(
      availability,
    );
  });

  // Branch coverage: rejects an invalid region
  it('rejects an invalid region', () => {
    expect(() =>
      WatchProviderAvailabilitySchema.parse({
        mediaId: 101,
        region: 'de',
        stream: [],
        rent: [],
        buy: [],
      }),
    ).toThrow();
  });

  // Branch coverage: rejects unknown properties
  it('rejects unknown properties', () => {
    expect(() =>
      WatchProviderAvailabilitySchema.parse({
        mediaId: 101,
        region: 'DE',
        stream: [],
        rent: [],
        buy: [],
        unsupported: true,
      }),
    ).toThrow();
  });
});
