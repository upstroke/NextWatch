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
import { TmdbError } from '@server/services/tmdb/errors';

const baseFilters = DiscoverFiltersSchema.parse({
  genreIds: [28, 878],
  minRating: 7,
  yearFrom: 2020,
  yearTo: 2024,
  sortBy: 'vote_average.desc',
});

const movieRaw = {
  page: 1,
  total_pages: 2,
  total_results: 25,
  results: [
    {
      id: 101,
      overview: 'Synthetic movie overview',
      poster_path: '/movie.jpg',
      backdrop_path: '/movie-backdrop.jpg',
      vote_average: 7.5,
      title: 'Synthetic Movie',
      release_date: '2024-05-01',
    },
  ],
};

const tvRaw = {
  page: 1,
  total_pages: 3,
  total_results: 30,
  results: [
    {
      id: 201,
      overview: 'Synthetic series overview',
      poster_path: null,
      backdrop_path: null,
      vote_average: 8.1,
      name: 'Synthetic Series',
      first_air_date: '2024-06-01',
    },
  ],
};

describe('Discover filter schema', () => {
  // Branch coverage: accepts a valid filter set and applies defaults
  it('accepts a valid filter set and applies defaults', () => {
    const filters = DiscoverFiltersSchema.parse({ genreIds: [28] });
    expect(filters).toEqual({ genreIds: [28], sortBy: 'popularity.desc' });
  });

  // Branch coverage: rejects more than three genres
  it('rejects more than three genres', () => {
    expect(() => DiscoverFiltersSchema.parse({ genreIds: [1, 2, 3, 4] })).toThrow();
  });

  // Branch coverage: rejects ratings outside the supported range
  it('rejects ratings outside the supported range', () => {
    expect(() => DiscoverFiltersSchema.parse({ minRating: 10.1 })).toThrow();
    expect(() => DiscoverFiltersSchema.parse({ minRating: -0.1 })).toThrow();
  });

  // Branch coverage: rejects a reversed year range
  it('rejects a reversed year range', () => {
    expect(() => DiscoverFiltersSchema.parse({ yearFrom: 2024, yearTo: 2020 })).toThrow();
  });

  // Branch coverage: rejects years outside the supported range
  it('rejects years outside the supported range', () => {
    expect(() => DiscoverFiltersSchema.parse({ yearFrom: 1899 })).toThrow();
    expect(() => DiscoverFiltersSchema.parse({ yearTo: 2101 })).toThrow();
  });

  // Branch coverage: rejects unknown sort options
  it('rejects unknown sort options', () => {
    expect(() => DiscoverFiltersSchema.parse({ sortBy: 'unknown' })).toThrow();
  });
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
  // Statement coverage: maps a Movie response
  it('maps a Movie response', () => {
    const mapped = mapMovieDiscoverResponse(TmdbDiscoverMovieResponseSchema.parse(movieRaw));

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
      ],
    });
  });

  // Statement coverage: maps a TV response
  it('maps a TV response', () => {
    const mapped = mapTvDiscoverResponse(TmdbDiscoverTvResponseSchema.parse(tvRaw));

    expect(mapped.results[0]).toEqual({
      id: 201,
      mediaType: 'tv',
      overview: 'Synthetic series overview',
      posterPath: null,
      backdropPath: null,
      voteAverage: 8.1,
      name: 'Synthetic Series',
      firstAirDate: '2024-06-01',
    });
  });

  // Branch coverage: treats an empty result page as valid
  it('treats an empty result page as valid', () => {
    const raw = TmdbDiscoverMovieResponseSchema.parse({ ...movieRaw, results: [] });
    expect(mapMovieDiscoverResponse(raw).results).toEqual([]);
  });
});

describe('Discover service', () => {
  // Statement coverage: requests Movie Discover and returns normalized data
  it('requests Movie Discover and returns normalized data', async () => {
    const http = { get: vi.fn().mockResolvedValue(movieRaw) };
    const result = await createDiscoverService(http).discoverMovies(baseFilters);

    expect(http.get).toHaveBeenCalledWith('/discover/movie', expect.any(Object));
    expect(result.results[0]).toMatchObject({ id: 101, mediaType: 'movie' });
  });

  // Statement coverage: requests TV Discover and returns normalized data
  it('requests TV Discover and returns normalized data', async () => {
    const http = { get: vi.fn().mockResolvedValue(tvRaw) };
    const result = await createDiscoverService(http).discoverTv(baseFilters);

    expect(http.get).toHaveBeenCalledWith('/discover/tv', expect.any(Object));
    expect(result.results[0]).toMatchObject({ id: 201, mediaType: 'tv' });
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
    const failure = new TmdbError('UPSTREAM_FAILED');
    const http = { get: vi.fn().mockRejectedValue(failure) };

    await expect(createDiscoverService(http).discoverMovies(baseFilters)).rejects.toBe(failure);
    await expect(createDiscoverService(http).discoverTv(baseFilters)).rejects.toBe(failure);
  });
});
