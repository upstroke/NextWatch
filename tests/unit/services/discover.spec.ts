import { describe, expect, it, vi } from 'vitest';
import { DiscoverFiltersSchema } from '@lib/schemas/discover';
import {
  TmdbDiscoverMovieResponseSchema,
  TmdbDiscoverTvResponseSchema,
} from '@lib/schemas/tmdb-discover';
import { buildDiscoverParams } from '@server/services/tmdb/discover-params';
import { createDiscoverService } from '@server/services/tmdb/discover';
import {
  mapMovieDiscoverResponse,
  mapTvDiscoverResponse,
} from '@server/services/tmdb/discover-mappers';
import { createTmdbError } from '@server/services/tmdb/errors';
import {
  discoverMovieRawFixture as movieRaw,
  emptyDiscoverMovieRawFixture,
} from '@tests/fixtures/tmdb/discover-movie.raw';
import {
  discoverTvRawFixture as tvRaw,
  emptyDiscoverTvRawFixture,
} from '@tests/fixtures/tmdb/discover-tv.raw';

const baseFilters = DiscoverFiltersSchema.parse({
  genreIds: [28, 878],
  minRating: 7,
  yearFrom: 2020,
  yearTo: 2024,
  sortBy: 'vote_average.desc',
});

describe('Discover parameter mapping', () => {
  // Statement coverage: maps Movie filters to primary release date parameters
  it('maps Movie filters to primary release date parameters', () => {
    expect(buildDiscoverParams('movie', baseFilters)).toEqual({
      with_genres: '28,878',
      'vote_average.gte': '7',
      'primary_release_date.gte': '2020-01-01',
      'primary_release_date.lte': '2024-12-31',
      sort_by: 'vote_average.desc',
    });
  });

  // Statement coverage: maps TV filters to first air date parameters
  it('maps TV filters to first air date parameters', () => {
    expect(buildDiscoverParams('tv', baseFilters)).toEqual({
      with_genres: '28,878',
      'vote_average.gte': '7',
      'first_air_date.gte': '2020-01-01',
      'first_air_date.lte': '2024-12-31',
      sort_by: 'vote_average.desc',
    });
  });

  // Branch coverage: omits absent optional filters
  it('omits absent optional filters', () => {
    const filters = DiscoverFiltersSchema.parse({ genreIds: [] });
    expect(buildDiscoverParams('movie', filters)).toEqual({ sort_by: 'popularity.desc' });
  });
});

describe('Discover response mappers', () => {
  // Statement coverage: maps Movie fields including missing optional data without mutating fixtures
  it('maps a Movie response', () => {
    const before = structuredClone(movieRaw);
    const mapped = mapMovieDiscoverResponse(TmdbDiscoverMovieResponseSchema.parse(movieRaw));

    expect(movieRaw).toEqual(before);
    expect(mapped).toEqual({
      page: 1,
      totalPages: 2,
      totalResults: 25,
      results: [
        {
          id: 101,
          mediaType: 'movie',
          overview: 'Synthetic movie overview',
          posterPath: '/movie.jpg',
          backdropPath: '/movie-backdrop.jpg',
          voteAverage: 7.5,
          title: 'Synthetic Movie',
          releaseDate: '2024-05-01',
        },
        {
          id: 102,
          mediaType: 'movie',
          overview: 'Synthetic movie without optional data',
          posterPath: null,
          backdropPath: null,
          voteAverage: 7,
          title: 'Synthetic Undated Movie',
          releaseDate: undefined,
        },
      ],
    });
  });

  // Statement coverage: maps TV fields including missing optional data without mutating fixtures
  it('maps a TV response', () => {
    const before = structuredClone(tvRaw);
    const mapped = mapTvDiscoverResponse(TmdbDiscoverTvResponseSchema.parse(tvRaw));

    expect(tvRaw).toEqual(before);
    expect(mapped).toEqual({
      page: 1,
      totalPages: 3,
      totalResults: 30,
      results: [
        {
          id: 201,
          mediaType: 'tv',
          overview: 'Synthetic series overview',
          posterPath: '/series.jpg',
          backdropPath: '/series-backdrop.jpg',
          voteAverage: 8.1,
          name: 'Synthetic Series',
          firstAirDate: '2024-06-01',
        },
        {
          id: 202,
          mediaType: 'tv',
          overview: 'Synthetic series without optional data',
          posterPath: null,
          backdropPath: null,
          voteAverage: 7,
          name: 'Synthetic Undated Series',
          firstAirDate: undefined,
        },
      ],
    });
  });

  // Branch coverage: treats an empty Movie result page as valid
  it('treats an empty Movie result page as valid', () => {
    const raw = TmdbDiscoverMovieResponseSchema.parse(emptyDiscoverMovieRawFixture);
    expect(mapMovieDiscoverResponse(raw).results).toEqual([]);
  });

  // Branch coverage: treats an empty TV result page as valid
  it('treats an empty TV result page as valid', () => {
    const raw = TmdbDiscoverTvResponseSchema.parse(emptyDiscoverTvRawFixture);
    expect(mapTvDiscoverResponse(raw).results).toEqual([]);
  });
});

describe('Discover service', () => {
  // Statement coverage: requests Movie Discover and returns normalized data
  it('requests Movie Discover and returns normalized data', async () => {
    const http = { get: vi.fn().mockResolvedValue(movieRaw) };
    const result = await createDiscoverService(http).discoverMovies(baseFilters);

    expect(http.get).toHaveBeenCalledWith('/discover/movie', expect.any(Object));
    expect(result.results[0]).toMatchObject({ id: 101, mediaType: 'movie' });
    expect(result.results).toHaveLength(2);
  });

  // Statement coverage: requests TV Discover and returns normalized data
  it('requests TV Discover and returns normalized data', async () => {
    const http = { get: vi.fn().mockResolvedValue(tvRaw) };
    const result = await createDiscoverService(http).discoverTv(baseFilters);

    expect(http.get).toHaveBeenCalledWith('/discover/tv', expect.any(Object));
    expect(result.results[0]).toMatchObject({ id: 201, mediaType: 'tv' });
    expect(result.results).toHaveLength(2);
  });

  // Statement coverage: forwards the supplied content language to TMDb
  it('forwards the supplied content language to TMDb', async () => {
    const http = {
      get: vi.fn().mockResolvedValueOnce(movieRaw).mockResolvedValueOnce(tvRaw),
    };

    await createDiscoverService(http).discoverMovies(baseFilters, 'de-DE');
    await createDiscoverService(http).discoverTv(baseFilters, 'de-DE');

    expect(http.get).toHaveBeenCalledWith(
      '/discover/movie',
      expect.objectContaining({ language: 'de-DE' }),
    );
    expect(http.get).toHaveBeenCalledWith(
      '/discover/tv',
      expect.objectContaining({ language: 'de-DE' }),
    );
  });

  // Branch coverage: rejects malformed Movie data as INVALID_RESPONSE
  it('rejects malformed Movie data as INVALID_RESPONSE', async () => {
    const http = { get: vi.fn().mockResolvedValue({ results: [] }) };
    await expect(createDiscoverService(http).discoverMovies(baseFilters)).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
    });
  });

  // Branch coverage: rejects malformed TV data as INVALID_RESPONSE
  it('rejects malformed TV data as INVALID_RESPONSE', async () => {
    const http = { get: vi.fn().mockResolvedValue({ results: [] }) };
    await expect(createDiscoverService(http).discoverTv(baseFilters)).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
    });
  });

  // Branch coverage: preserves transport errors instead of reclassifying them
  it('preserves transport errors instead of reclassifying them', async () => {
    const failure = createTmdbError('UPSTREAM_FAILED');
    const http = { get: vi.fn().mockRejectedValue(failure) };

    await expect(createDiscoverService(http).discoverMovies(baseFilters)).rejects.toBe(failure);
    await expect(createDiscoverService(http).discoverTv(baseFilters)).rejects.toBe(failure);
  });
});
