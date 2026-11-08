# 001f — TMDb detail data contract

## Specification

### Goal

Verify that TMDb provides the minimal detail data required for Movie and TV entries. Define stable Zod contracts for raw TMDb responses, normalize Movie and TV details into distinct but related server contracts, and expose them through Nitro routes.

This is a data-contract spike. It does not implement a detail page, routing, state management or LLM integration.

### Scope

- TMDb Movie detail endpoint: `GET /movie/{movie_id}`
- TMDb TV detail endpoint: `GET /tv/{series_id}`
- Zod contracts for raw TMDb Movie and TV detail responses
- A shared normalized `TmdbDetailBase` contract
- Movie-specific and TV-specific detail extensions
- A detail service with an injected TMDb HTTP transport
- Nitro routes:
  - `GET /api/tmdb/movie/[id]`
  - `GET /api/tmdb/tv/[id]`
- Unit tests for schemas, mapping, service orchestration and error isolation
- HTTP contract tests for invalid IDs and sanitized error responses
- Manual live verification for one Movie and one TV detail request

### Contract decision

Start with a minimal shared base contract. Movie and TV retain their distinct concepts instead of forcing every field into one generic shape.

`mediaType` is not part of the shared base contract. It is set as a literal value by the Movie and TV mappers.

### Shared base contract

```ts
export const TmdbDetailBaseSchema = z.object({
  id: z.number(),
  title: z.string(),
  originalTitle: z.string(),
  overview: z.string().nullable(),
  tagline: z.string().nullable(),
  posterPath: z.string().nullable(),
  backdropPath: z.string().nullable(),
  voteAverage: z.number(),
  voteCount: z.number(),
  genres: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
    }),
  ),
  originalLanguage: z.string(),
  status: z.string().nullable(),
  homepage: z.string().nullable(),
  popularity: z.number(),
});

export type TmdbDetailBase = z.infer<typeof TmdbDetailBaseSchema>;
```

### Field mapping

| Normalized field   | Movie source        | TV source           | Notes                        |
| ------------------ | ------------------- | ------------------- | ---------------------------- |
| `id`               | `id`                | `id`                | Stable TMDb identifier       |
| `title`            | `title`             | `name`              | Display title                |
| `originalTitle`    | `original_title`    | `original_name`     | Original-language title      |
| `overview`         | `overview`          | `overview`          | Optional description         |
| `tagline`          | `tagline`           | `tagline`           | Optional marketing tagline   |
| `posterPath`       | `poster_path`       | `poster_path`       | Optional image path          |
| `backdropPath`     | `backdrop_path`     | `backdrop_path`     | Optional image path          |
| `voteAverage`      | `vote_average`      | `vote_average`      | TMDb rating                  |
| `voteCount`        | `vote_count`        | `vote_count`        | Number of votes              |
| `genres`           | `genres`            | `genres`            | Genre ID and name            |
| `originalLanguage` | `original_language` | `original_language` | ISO 639-1 language code      |
| `status`           | `status`            | `status`            | Production or release status |
| `homepage`         | `homepage`          | `homepage`          | Optional official website    |
| `popularity`       | `popularity`        | `popularity`        | TMDb popularity metric       |

`spokenLanguages` is intentionally excluded from the first contract. `originalLanguage` provides the essential language information without introducing redundant metadata.

### Movie extension

```ts
export const TmdbMovieDetailSchema = TmdbDetailBaseSchema.extend({
  mediaType: z.literal('movie'),
  releaseDate: z.string().nullable(),
  runtime: z.number().nullable(),
});

export type TmdbMovieDetail = z.infer<typeof TmdbMovieDetailSchema>;
```

| Normalized field | Movie source   | Notes                            |
| ---------------- | -------------- | -------------------------------- |
| `mediaType`      | Fixed value    | Set by the mapper                |
| `releaseDate`    | `release_date` | Optional theatrical release date |
| `runtime`        | `runtime`      | Optional runtime in minutes      |

The following Movie fields are intentionally excluded:

- `budget`
- `revenue`
- `imdb_id`
- `belongs_to_collection`
- `production_countries`
- `video`
- `adult`

### TV extension

```ts
export const TmdbTvDetailSchema = TmdbDetailBaseSchema.extend({
  mediaType: z.literal('tv'),
  firstAirDate: z.string().nullable(),
  lastAirDate: z.string().nullable(),
  numberOfSeasons: z.number().nullable(),
  numberOfEpisodes: z.number().nullable(),
  networks: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
    }),
  ),
  createdBy: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
    }),
  ),
  originCountries: z.array(z.string()),
});

export type TmdbTvDetail = z.infer<typeof TmdbTvDetailSchema>;
```

| Normalized field   | TV source            | Notes                              |
| ------------------ | -------------------- | ---------------------------------- |
| `mediaType`        | Fixed value          | Set by the mapper                  |
| `firstAirDate`     | `first_air_date`     | Optional first air date            |
| `lastAirDate`      | `last_air_date`      | Optional most recent air date      |
| `numberOfSeasons`  | `number_of_seasons`  | Optional season count              |
| `numberOfEpisodes` | `number_of_episodes` | Optional episode count             |
| `networks`         | `networks`           | Broadcasting networks or platforms |
| `createdBy`        | `created_by`         | Series creators                    |
| `originCountries`  | `origin_country`     | Countries of origin                |

The following TV fields are intentionally excluded:

- `episode_run_time`
- `seasons`
- `last_episode_to_air`
- `next_episode_to_air`
- `type`
- `in_production`
- `languages`

`episode_run_time` is excluded because it is an array of generic episode durations without a reliable association to a specific season or episode. Season and episode details require a separate later spike.

### Raw TMDb contracts

Define one Zod schema per TMDb detail response. These schemas preserve the original TMDb field names and validate the external boundary.

Raw Movie and TV contracts validate the TMDb field names, including nullable `status`, nonnegative nullable Movie `runtime`, and optional detail metadata where appropriate.

### Architecture

- `src/lib/schemas` contains the Zod contracts for raw TMDb responses and normalized detail data.
- `server/services/tmdb` contains framework-free detail services, mappers and errors.
- `server/api/tmdb` contains thin Nitro route handlers.
- `server/utils` contains H3-specific helpers.
- External TMDb HTTP transports are injected into services.
- Do not mock the module under test; mock only external boundaries.

### Tests

Add unit tests for:

- Valid Movie raw responses.
- Valid TV raw responses.
- Movie-to-normalized mapping.
- TV-to-normalized mapping.
- Missing optional fields.
- Invalid required fields.
- Invalid response structures.
- Transport-error isolation.
- Invalid Movie and TV route IDs.

Use the established coverage-intent comments:

- `// Statement coverage: ...`
- `// Branch coverage: ...`

Add HTTP contract tests for:

- Invalid Movie IDs.
- Invalid TV IDs.
- Sanitized error responses.
- `Cache-Control: no-store`.
- No exposure of credentials or internal error details.

Use stable `TMDB-INT-…` identifiers in HTTP integration test titles.

### Acceptance criteria

- Movie details are retrieved through `GET /api/tmdb/movie/[id]`.
- TV details are retrieved through `GET /api/tmdb/tv/[id]`.
- Movie and TV raw responses are validated with Zod at the server boundary.
- Movie and TV responses map to the defined normalized contracts.
- Movie-specific fields remain distinct from TV-specific fields.
- TV seasons are represented through season and episode counts, without loading season or episode details.
- Invalid IDs, technical failures and missing optional fields remain distinguishable.
- Unit tests cover schemas, mapping, service orchestration and error isolation.
- HTTP contract tests cover invalid IDs and sanitized error responses.
- `pnpm test`, `pnpm test:coverage`, `pnpm lint`, `pnpm typecheck`, `pnpm build` and `pnpm test:e2e` pass locally.
- Manual live verification confirms successful Movie and TV detail requests.

### Out of scope

- Detail page UI
- Routing or navigation
- Pinia or URL state
- `append_to_response`
- Credits, cast, crew, videos, images, recommendations, similar titles, reviews, keywords, translations, alternative titles, release dates, watch providers, regions or certification
- LLM or Ollama integration
- Mixed Movie/TV result lists
- Infinite scroll
- Automatic activation of additional TMDb capabilities without separate verification

## Execution status

### Status

Completed. Manual TMDb verification remains outstanding.

### Implemented

1. Raw Movie and TV detail Zod contracts.
2. Normalized `TmdbDetailBase`, `TmdbMovieDetail` and `TmdbTvDetail` contracts.
3. Movie and TV detail mappers.
4. Detail service with injected HTTP transport.
5. Nitro routes for Movie and TV details.
6. Unit tests for schemas, mapping, orchestration and error isolation.
7. HTTP contract tests for invalid Movie and TV IDs.
8. Optional TMDb metadata is tolerated by the raw detail contracts.
9. `INVALID_RESPONSE` errors preserve the original validation or mapping error as their `cause`.

### Files created or changed

- `src/lib/schemas/tmdb-detail.ts`
- `server/services/tmdb/detail-mappers.ts`
- `server/services/tmdb/detail.ts`
- `server/services/tmdb/errors.ts`
- `server/api/tmdb/movie/[id].get.ts`
- `server/api/tmdb/tv/[id].get.ts`
- `tests/fixtures/tmdb/detail-movie.raw.ts`
- `tests/fixtures/tmdb/detail-tv.raw.ts`
- `tests/unit/services/detail.spec.ts`
- `tests/unit/api/tmdb/detail-handlers.spec.ts`
- `tests/integration/http/detail.api.ts`

### Validation

Local automated test and coverage validation completed successfully. Manual TMDb verification remains outstanding.

After pulling the latest branch, run:

- `pnpm test`
- `pnpm test:coverage`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
- `pnpm test:e2e`

Then use the local dev server to check:

- One valid Movie detail request.
- One valid TV detail request.
- One invalid Movie ID.
- One invalid TV ID.

Record only a summary: status code, presence of title, overview, poster/backdrop, genres and TV season/episode counts. Do not paste complete API responses or credentials.
