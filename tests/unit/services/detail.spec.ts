import { describe, expect, it, vi } from 'vitest';
import { TmdbMovieDetailRawSchema, TmdbTvDetailRawSchema } from '@lib/schemas/tmdb-detail';
import { mapMovieDetailResponse, mapTvDetailResponse } from '@server/services/tmdb/detail-mappers';
import { createTmdbDetailService } from '@server/services/tmdb/detail';
import { createTmdbError } from '@server/services/tmdb/errors';
import {
  movieDetailRawFixture as movieRaw,
  minimalMovieDetailRawFixture as minimalMovieRaw,
} from '@tests/fixtures/tmdb/detail-movie.raw';
import {
  tvDetailRawFixture as tvRaw,
  minimalTvDetailRawFixture as minimalTvRaw,
} from '@tests/fixtures/tmdb/detail-tv.raw';

describe('Movie detail raw schema', () => {
  // Statement coverage: accepts a complete Movie detail response
  it('accepts a complete Movie detail response', () => {
    expect(TmdbMovieDetailRawSchema.parse(movieRaw)).toEqual(movieRaw);
  });

  // Branch coverage: accepts a Movie response with missing optional data
  it('accepts a Movie response with missing optional data', () => {
    expect(TmdbMovieDetailRawSchema.parse(minimalMovieRaw)).toEqual(minimalMovieRaw);
  });

  // Branch coverage: rejects a Movie response without an ID
  it('rejects a Movie response without an ID', () => {
    const { id: _id, ...invalid } = movieRaw;
    expect(() => TmdbMovieDetailRawSchema.parse(invalid)).toThrow();
  });
});

describe('TV detail raw schema', () => {
  // Statement coverage: accepts a complete TV detail response
  it('accepts a complete TV detail response', () => {
    expect(TmdbTvDetailRawSchema.parse(tvRaw)).toEqual(tvRaw);
  });

  // Branch coverage: accepts a TV response with missing optional data
  it('accepts a TV response with missing optional data', () => {
    expect(TmdbTvDetailRawSchema.parse(minimalTvRaw)).toEqual(minimalTvRaw);
  });

  // Branch coverage: rejects a TV response without a name
  it('rejects a TV response without a name', () => {
    const { name: _name, ...invalid } = tvRaw;
    expect(() => TmdbTvDetailRawSchema.parse(invalid)).toThrow();
  });
});

describe('Detail response mappers', () => {
  // Statement coverage: maps Movie fields without mutating the fixture
  it('maps a Movie response', () => {
    const before = structuredClone(movieRaw);
    const mapped = mapMovieDetailResponse(TmdbMovieDetailRawSchema.parse(movieRaw));

    expect(movieRaw).toEqual(before);
    expect(mapped).toEqual({
      id: 101,
      mediaType: 'movie',
      title: 'Synthetic Movie',
      originalTitle: 'Synthetic Original Movie',
      overview: 'Synthetic movie overview',
      tagline: 'Synthetic movie tagline',
      posterPath: '/movie.jpg',
      backdropPath: '/movie-backdrop.jpg',
      voteAverage: 7.5,
      voteCount: 120,
      genres: [
        { id: 28, name: 'Action' },
        { id: 878, name: 'Science Fiction' },
      ],
      originalLanguage: 'en',
      status: 'Released',
      homepage: 'https://example.com/movie',
      popularity: 42.5,
      releaseDate: '2024-05-01',
      runtime: 118,
    });
  });

  // Statement coverage: maps TV fields without mutating the fixture
  it('maps a TV response', () => {
    const before = structuredClone(tvRaw);
    const mapped = mapTvDetailResponse(TmdbTvDetailRawSchema.parse(tvRaw));

    expect(tvRaw).toEqual(before);
    expect(mapped).toEqual({
      id: 201,
      mediaType: 'tv',
      title: 'Synthetic Series',
      originalTitle: 'Synthetic Original Series',
      overview: 'Synthetic series overview',
      tagline: 'Synthetic series tagline',
      posterPath: '/series.jpg',
      backdropPath: '/series-backdrop.jpg',
      voteAverage: 8.1,
      voteCount: 240,
      genres: [
        { id: 18, name: 'Drama' },
        { id: 10765, name: 'Sci-Fi & Fantasy' },
      ],
      originalLanguage: 'en',
      status: 'Returning Series',
      homepage: 'https://example.com/series',
      popularity: 58.2,
      firstAirDate: '2024-06-01',
      lastAirDate: '2024-08-01',
      numberOfSeasons: 2,
      numberOfEpisodes: 16,
      networks: [{ id: 1, name: 'Synthetic Network' }],
      createdBy: [{ id: 11, name: 'Synthetic Creator' }],
      originCountries: ['US'],
    });
  });

  // Branch coverage: maps Movie fields with missing optional data
  it('maps Movie fields with missing optional data', () => {
    const mapped = mapMovieDetailResponse(TmdbMovieDetailRawSchema.parse(minimalMovieRaw));

    expect(mapped.overview).toBeNull();
    expect(mapped.posterPath).toBeNull();
    expect(mapped.releaseDate).toBeNull();
    expect(mapped.runtime).toBeNull();
  });

  // Branch coverage: maps TV fields with missing optional data
  it('maps TV fields with missing optional data', () => {
    const mapped = mapTvDetailResponse(TmdbTvDetailRawSchema.parse(minimalTvRaw));

    expect(mapped.overview).toBeNull();
    expect(mapped.posterPath).toBeNull();
    expect(mapped.firstAirDate).toBeNull();
    expect(mapped.numberOfSeasons).toBeNull();
    expect(mapped.numberOfEpisodes).toBeNull();
  });
});

describe('Detail service', () => {
  // Statement coverage: requests Movie details and returns normalized data
  it('requests Movie details and returns normalized data', async () => {
    const http = {
      get: vi.fn().mockResolvedValue(movieRaw),
      getWeeklyTrending: vi.fn(),
    };
    const result = await createTmdbDetailService(http).getMovieDetail(101);

    expect(http.get).toHaveBeenCalledWith('/movie/101');
    expect(result).toMatchObject({ id: 101, mediaType: 'movie' });
  });

  // Statement coverage: requests TV details and returns normalized data
  it('requests TV details and returns normalized data', async () => {
    const http = {
      get: vi.fn().mockResolvedValue(tvRaw),
      getWeeklyTrending: vi.fn(),
    };
    const result = await createTmdbDetailService(http).getTvDetail(201);

    expect(http.get).toHaveBeenCalledWith('/tv/201');
    expect(result).toMatchObject({ id: 201, mediaType: 'tv' });
  });

  // Branch coverage: rejects malformed Movie data as INVALID_RESPONSE
  it('rejects malformed Movie data as INVALID_RESPONSE', async () => {
    const http = {
      get: vi.fn().mockResolvedValue({}),
      getWeeklyTrending: vi.fn(),
    };
    await expect(createTmdbDetailService(http).getMovieDetail(101)).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
    });
  });

  // Branch coverage: rejects malformed TV data as INVALID_RESPONSE
  it('rejects malformed TV data as INVALID_RESPONSE', async () => {
    const http = {
      get: vi.fn().mockResolvedValue({}),
      getWeeklyTrending: vi.fn(),
    };
    await expect(createTmdbDetailService(http).getTvDetail(201)).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
    });
  });

  // Branch coverage: preserves transport errors instead of reclassifying them
  it('preserves transport errors instead of reclassifying them', async () => {
    const failure = createTmdbError('UPSTREAM_FAILED');
    const http = {
      get: vi.fn().mockRejectedValue(failure),
      getWeeklyTrending: vi.fn(),
    };

    await expect(createTmdbDetailService(http).getMovieDetail(101)).rejects.toBe(failure);
    await expect(createTmdbDetailService(http).getTvDetail(201)).rejects.toBe(failure);
  });
});
