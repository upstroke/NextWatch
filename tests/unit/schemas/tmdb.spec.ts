import { describe, expect, it } from 'vitest';
import { TmdbMediaTypeSchema, TmdbMediaSchema, TmdbPagedResponseSchema } from '@lib/schemas/tmdb';

const movie = {
  id: 1,
  mediaType: 'movie',
  title: 'Synthetic Film',
  overview: 'A synthetic overview.',
  posterPath: '/poster.jpg',
  backdropPath: '/backdrop.jpg',
  releaseDate: '2026-01-01',
  voteAverage: 7.5,
};

const tvShow = {
  id: 2,
  mediaType: 'tv',
  name: 'Synthetic Series',
  overview: 'A synthetic overview.',
  posterPath: '/poster.jpg',
  backdropPath: '/backdrop.jpg',
  firstAirDate: '2026-02-01',
  voteAverage: 8,
};

describe('TmdbMediaTypeSchema', () => {
  // Statement coverage: accepts documented TMDb media types
  it('accepts documented TMDb media types', () => {
    expect(TmdbMediaTypeSchema.parse('movie')).toBe('movie');
    expect(TmdbMediaTypeSchema.parse('tv')).toBe('tv');
    expect(TmdbMediaTypeSchema.parse('person')).toBe('person');
  });

  // Branch coverage: rejects unsupported TMDb media types
  it('rejects unsupported TMDb media types', () => {
    expect(() => TmdbMediaTypeSchema.parse('unknown')).toThrow();
    expect(() => TmdbMediaTypeSchema.parse('')).toThrow();
  });
});

describe('TmdbMediaSchema', () => {
  // Statement coverage: accepts a complete movie
  it('accepts a complete movie', () => {
    expect(TmdbMediaSchema.parse(movie)).toEqual(movie);
  });

  // Statement coverage: accepts a complete tv show
  it('accepts a complete tv show', () => {
    expect(TmdbMediaSchema.parse(tvShow)).toEqual(tvShow);
  });

  // Statement coverage: accepts optional fields being absent
  it('accepts optional fields being absent', () => {
    expect(
      TmdbMediaSchema.parse({
        id: 3,
        mediaType: 'movie',
      }),
    ).toEqual({
      id: 3,
      mediaType: 'movie',
    });
  });

  // Statement coverage: accepts nullable image paths
  it('accepts nullable image paths', () => {
    expect(
      TmdbMediaSchema.parse({
        id: 4,
        mediaType: 'movie',
        posterPath: null,
        backdropPath: null,
      }),
    ).toEqual({
      id: 4,
      mediaType: 'movie',
      posterPath: null,
      backdropPath: null,
    });
  });

  // Branch coverage: rejects invalid ids
  it('rejects invalid ids', () => {
    expect(() => TmdbMediaSchema.parse({ id: 0, mediaType: 'movie' })).toThrow();

    expect(() => TmdbMediaSchema.parse({ id: 1.5, mediaType: 'movie' })).toThrow();
  });

  // Branch coverage: rejects invalid media types
  it('rejects invalid media types', () => {
    expect(() => TmdbMediaSchema.parse({ id: 1, mediaType: 'person' })).toThrow();
  });
});

describe('TmdbPagedResponseSchema', () => {
  // Statement coverage: accepts a valid page with results
  it('accepts a valid page with results', () => {
    const page = {
      page: 1,
      totalPages: 2,
      totalResults: 2,
      results: [movie, tvShow],
    };

    expect(TmdbPagedResponseSchema.parse(page)).toEqual(page);
  });

  // Statement coverage: accepts a valid empty page
  it('accepts a valid empty page', () => {
    const page = {
      page: 1,
      totalPages: 0,
      totalResults: 0,
      results: [],
    };

    expect(TmdbPagedResponseSchema.parse(page)).toEqual(page);
  });

  // Branch coverage: rejects invalid pagination values
  it('rejects invalid pagination values', () => {
    expect(() =>
      TmdbPagedResponseSchema.parse({
        page: 0,
        totalPages: 0,
        totalResults: 0,
        results: [],
      }),
    ).toThrow();

    expect(() =>
      TmdbPagedResponseSchema.parse({
        page: 1,
        totalPages: -1,
        totalResults: 0,
        results: [],
      }),
    ).toThrow();
  });

  // Branch coverage: rejects invalid result items
  it('rejects invalid result items', () => {
    expect(() =>
      TmdbPagedResponseSchema.parse({
        page: 1,
        totalPages: 1,
        totalResults: 1,
        results: [{ id: 'invalid' }],
      }),
    ).toThrow();
  });
});
