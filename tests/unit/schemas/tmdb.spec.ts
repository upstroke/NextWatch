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
});
