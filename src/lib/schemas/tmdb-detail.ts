import { z } from 'zod';

const detailGenreSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
});

const detailNetworkSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
});

const detailCreatorSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
});

export const TmdbDetailBaseSchema = z.object({
  id: z.number().int().positive(),
  mediaType: z.enum(['movie', 'tv']),
  title: z.string(),
  originalTitle: z.string(),
  overview: z.string().nullable(),
  tagline: z.string().nullable(),
  posterPath: z.string().nullable(),
  backdropPath: z.string().nullable(),
  voteAverage: z.number().min(0).max(10),
  voteCount: z.number().int().nonnegative(),
  genres: z.array(detailGenreSchema),
  originalLanguage: z.string(),
  status: z.string().nullable(),
  homepage: z.string().nullable(),
  popularity: z.number().nonnegative(),
});

export type TmdbDetailBase = z.infer<typeof TmdbDetailBaseSchema>;

export const TmdbMovieDetailSchema = TmdbDetailBaseSchema.extend({
  mediaType: z.literal('movie'),
  releaseDate: z.string().nullable(),
  runtime: z.number().int().positive().nullable(),
});

export type TmdbMovieDetail = z.infer<typeof TmdbMovieDetailSchema>;

export const TmdbTvDetailSchema = TmdbDetailBaseSchema.extend({
  mediaType: z.literal('tv'),
  firstAirDate: z.string().nullable(),
  lastAirDate: z.string().nullable(),
  numberOfSeasons: z.number().int().nonnegative().nullable(),
  numberOfEpisodes: z.number().int().nonnegative().nullable(),
  networks: z.array(detailNetworkSchema),
  createdBy: z.array(detailCreatorSchema),
  originCountries: z.array(z.string()),
});

export type TmdbTvDetail = z.infer<typeof TmdbTvDetailSchema>;

export const TmdbMovieDetailRawSchema = z.object({
  id: z.number().int().positive(),
  title: z.string(),
  original_title: z.string(),
  overview: z.string().nullable(),
  tagline: z.string().nullable(),
  poster_path: z.string().nullable(),
  backdrop_path: z.string().nullable(),
  vote_average: z.number().min(0).max(10),
  vote_count: z.number().int().nonnegative(),
  genres: z.array(detailGenreSchema),
  original_language: z.string(),
  status: z.string(),
  homepage: z.string().nullable(),
  popularity: z.number().nonnegative(),
  release_date: z.string().nullable(),
  runtime: z.number().int().positive().nullable(),
});

export type TmdbMovieDetailRaw = z.infer<typeof TmdbMovieDetailRawSchema>;

export const TmdbTvDetailRawSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  original_name: z.string(),
  overview: z.string().nullable(),
  tagline: z.string().nullable(),
  poster_path: z.string().nullable(),
  backdrop_path: z.string().nullable(),
  vote_average: z.number().min(0).max(10),
  vote_count: z.number().int().nonnegative(),
  genres: z.array(detailGenreSchema),
  original_language: z.string(),
  status: z.string(),
  homepage: z.string().nullable(),
  popularity: z.number().nonnegative(),
  first_air_date: z.string().nullable(),
  last_air_date: z.string().nullable(),
  number_of_seasons: z.number().int().nonnegative().nullable(),
  number_of_episodes: z.number().int().nonnegative().nullable(),
  networks: z.array(detailNetworkSchema),
  created_by: z.array(detailCreatorSchema),
  origin_country: z.array(z.string()),
});

export type TmdbTvDetailRaw = z.infer<typeof TmdbTvDetailRawSchema>;
