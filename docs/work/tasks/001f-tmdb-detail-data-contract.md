# 001f — TMDb detail data-contract spike

## Goal

Verify that TMDb provides the minimal detail data required for Movie and TV entries. Define and validate stable server-side detail contracts without implementing a detail page, routing, state management or LLM integration.

This spike focuses on the data basis and contracts. It verifies that Movie and TV details can be retrieved, validated, normalized and exposed through Nitro routes.

## Implementation status

Completed.

1. Raw Movie and TV detail Zod contracts.
2. Normalized `TmdbDetailBase`, `TmdbMovieDetail` and `TmdbTvDetail` contracts.
3. Movie and TV detail mappers.
4. Detail service with injected HTTP transport.
5. Nitro routes for Movie and TV details.
6. Unit tests for schemas, mapping, orchestration and error isolation.
7. HTTP contract tests for invalid Movie and TV IDs.
8. Spec and task documentation.
9. Optional TMDb metadata is tolerated by the raw detail contracts.
10. `INVALID_RESPONSE` errors preserve the original validation or mapping error as their `cause`.

Local automated test and coverage validation completed successfully. Manual TMDb verification remains outstanding.

## Data contracts

The shared base contract contains:

- `id`
- `mediaType`
- `title`
- `originalTitle`
- `overview`
- `tagline`
- `posterPath`
- `backdropPath`
- `voteAverage`
- `voteCount`
- `genres`
- `originalLanguage`
- `status`
- `homepage`
- `popularity`

Movie adds:

- `releaseDate`
- `runtime`

TV adds:

- `firstAirDate`
- `lastAirDate`
- `numberOfSeasons`
- `numberOfEpisodes`
- `networks`
- `createdBy`
- `originCountries`

## Intentional exclusions

The following fields are intentionally excluded from the first contract:

- `spokenLanguages`
- `budget`
- `revenue`
- `imdbId`
- `belongsToCollection`
- `productionCountries`
- `video`
- `adult`
- `episodeRunTime`
- `seasons`
- `lastEpisodeToAir`
- `nextEpisodeToAir`
- `type`
- `inProduction`
- `languages`

`episodeRunTime` is excluded because it is an array of generic episode durations without a reliable association to a specific season or episode. Season and episode details require a separate later spike.

## Files created or changed

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
- `docs/work/specs/001f-tmdb-detail-data-contract.md`
- `docs/work/tasks/001f-tmdb-detail-data-contract.md`

## Manual verification

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

## Status

Completed. Manual TMDb verification remains outstanding.
