import { z } from 'zod';
import { TmdbMediaTypeSchema } from '@lib/schemas/tmdb';

const rawMovieResultSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1),
  overview: z.string().optional(),
  poster_path: z.string().nullable().optional(),
  backdrop_path: z.string().nullable().optional(),
  release_date: z.string().optional(),
  vote_average: z.number().optional(),
});

const rawTvResultSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  overview: z.string().optional(),
  poster_path: z.string().nullable().optional(),
  backdrop_path: z.string().nullable().optional(),
  first_air_date: z.string().optional(),
  vote_average: z.number().optional(),
});

const rawPersonResultSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  profile_path: z.string().nullable().optional(),
  known_for: z
    .array(
      z.object({
        id: z.number().int().positive(),
        media_type: TmdbMediaTypeSchema,
        title: z.string().optional(),
        name: z.string().optional(),
      }),
    )
    .optional(),
});

const rawKeywordResultSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
});

const rawSearchPageFields = {
  page: z.number().int().positive(),
  total_pages: z.number().int().nonnegative(),
  total_results: z.number().int().nonnegative(),
};

export const TmdbSearchMovieResponseSchema = z.object({
  ...rawSearchPageFields,
  results: z.array(rawMovieResultSchema),
});

export const TmdbSearchTvResponseSchema = z.object({
  ...rawSearchPageFields,
  results: z.array(rawTvResultSchema),
});

export const TmdbSearchMultiResponseSchema = z.object({
  ...rawSearchPageFields,
  results: z.array(
    z.discriminatedUnion('media_type', [
      rawMovieResultSchema.extend({
        media_type: z.literal('movie'),
      }),
      rawTvResultSchema.extend({
        media_type: z.literal('tv'),
      }),
      rawPersonResultSchema.extend({
        media_type: z.literal('person'),
      }),
    ]),
  ),
});

export const TmdbSearchPersonResponseSchema = z.object({
  ...rawSearchPageFields,
  results: z.array(rawPersonResultSchema),
});

export const TmdbSearchKeywordResponseSchema = z.object({
  ...rawSearchPageFields,
  results: z.array(rawKeywordResultSchema),
});

export type TmdbSearchMovieResponse = z.infer<typeof TmdbSearchMovieResponseSchema>;
export type TmdbSearchTvResponse = z.infer<typeof TmdbSearchTvResponseSchema>;
export type TmdbSearchMultiResponse = z.infer<typeof TmdbSearchMultiResponseSchema>;
export type TmdbSearchPersonResponse = z.infer<typeof TmdbSearchPersonResponseSchema>;
export type TmdbSearchKeywordResponse = z.infer<typeof TmdbSearchKeywordResponseSchema>;

const rawWatchProviderSchema = z.object({
  provider_id: z.number().int().positive(),
  provider_name: z.string().min(1),
  logo_path: z.string().nullable().optional(),
  display_priority: z.number().optional(),
});

const rawWatchProviderRegionSchema = z.object({
  link: z.string().optional(),
  flatrate: z.array(rawWatchProviderSchema).optional(),
  rent: z.array(rawWatchProviderSchema).optional(),
  buy: z.array(rawWatchProviderSchema).optional(),
});

export const TmdbWatchProvidersMovieResponseSchema = z.object({
  id: z.number().int().positive(),
  results: z.record(z.string(), rawWatchProviderRegionSchema),
});

export const TmdbWatchProvidersTvResponseSchema = z.object({
  id: z.number().int().positive(),
  results: z.record(z.string(), rawWatchProviderRegionSchema),
});

export type TmdbWatchProvidersMovieResponse = z.infer<typeof TmdbWatchProvidersMovieResponseSchema>;
export type TmdbWatchProvidersTvResponse = z.infer<typeof TmdbWatchProvidersTvResponseSchema>;

export const SearchMovieCandidateSchema = z
  .object({
    id: z.number().int().positive(),
    title: z.string().min(1),
    overview: z.string().optional(),
    posterPath: z.string().nullable().optional(),
    backdropPath: z.string().nullable().optional(),
    releaseDate: z.string().optional(),
    voteAverage: z.number().optional(),
  })
  .strict();

export const SearchTvCandidateSchema = z
  .object({
    id: z.number().int().positive(),
    name: z.string().min(1),
    overview: z.string().optional(),
    posterPath: z.string().nullable().optional(),
    backdropPath: z.string().nullable().optional(),
    firstAirDate: z.string().optional(),
    voteAverage: z.number().optional(),
  })
  .strict();

export const SearchPersonCandidateSchema = z
  .object({
    id: z.number().int().positive(),
    name: z.string().min(1),
    profilePath: z.string().nullable().optional(),
    knownFor: z
      .array(
        z
          .object({
            id: z.number().int().positive(),
            mediaType: TmdbMediaTypeSchema,
            title: z.string().optional(),
            name: z.string().optional(),
          })
          .strict(),
      )
      .optional(),
  })
  .strict();

export const SearchKeywordCandidateSchema = z
  .object({
    id: z.number().int().positive(),
    name: z.string().min(1),
  })
  .strict();

export const MultiSearchCandidateSchema = z.discriminatedUnion('mediaType', [
  SearchMovieCandidateSchema.extend({
    mediaType: z.literal('movie'),
  }),
  SearchTvCandidateSchema.extend({
    mediaType: z.literal('tv'),
  }),
  SearchPersonCandidateSchema.extend({
    mediaType: z.literal('person'),
  }),
]);

export type SearchMovieCandidate = z.infer<typeof SearchMovieCandidateSchema>;
export type SearchTvCandidate = z.infer<typeof SearchTvCandidateSchema>;
export type SearchPersonCandidate = z.infer<typeof SearchPersonCandidateSchema>;
export type SearchKeywordCandidate = z.infer<typeof SearchKeywordCandidateSchema>;
export type MultiSearchCandidate = z.infer<typeof MultiSearchCandidateSchema>;

export const WatchProviderSchema = z
  .object({
    id: z.number().int().positive(),
    name: z.string().min(1),
    logoPath: z.string().nullable().optional(),
    displayPriority: z.number().optional(),
  })
  .strict();

export const WatchProviderAvailabilitySchema = z
  .object({
    region: z.string().min(1),
    link: z.string().optional(),
    streaming: z.array(WatchProviderSchema),
    rental: z.array(WatchProviderSchema),
    purchase: z.array(WatchProviderSchema),
  })
  .strict();

export const TmdbWatchProvidersMovieSchema = z
  .object({
    id: z.number().int().positive(),
    results: z.record(z.string(), WatchProviderAvailabilitySchema),
  })
  .strict();

export const TmdbWatchProvidersTvSchema = z
  .object({
    id: z.number().int().positive(),
    results: z.record(z.string(), WatchProviderAvailabilitySchema),
  })
  .strict();

export type WatchProvider = z.infer<typeof WatchProviderSchema>;
export type WatchProviderAvailability = z.infer<typeof WatchProviderAvailabilitySchema>;
export type TmdbWatchProvidersMovie = z.infer<typeof TmdbWatchProvidersMovieSchema>;
export type TmdbWatchProvidersTv = z.infer<typeof TmdbWatchProvidersTvSchema>;
