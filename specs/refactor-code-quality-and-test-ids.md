# Refactor: code quality and test identifiers

## Goal

Apply the agreed code, typing, documentation and testing conventions to the existing implementation without adding features, UI, Ollama integration or new tests.

This specification consolidates the findings from the five-part review of `src/lib/schemas`, `../docs/work/server`, `../docs/work/server`, `../docs/work/server`, `tests` and project configuration.

## Scope

### In scope

- `../docs/work/server`
- `../docs/work/server`
- `../docs/work/server`
- `../docs/work/server`
- `../docs/work/server`
- `../docs/work/server`
- `../docs/work/server`
- `../docs/work/server`
- `../docs/work/server`
- `tests/http/discover.api.ts`
- `tests/http/trending.api.ts`
- `tests/integration/README.md`
- `docs/testing.md`

### Out of scope

- New application features or UI components
- Ollama integration
- New integration tests or preparation for integration tests
- CI pipelines
- Merging or deploying
- Changing unit-test coverage intent comments
- Adding test identifiers to unit tests
- Changing fixtures or mocks unless a concrete change requires it

## Findings

### Typing and architecture

The existing schemas, services, API handlers and utilities follow the agreed architecture and typing rules:

- Zod schemas define external data contracts.
- TypeScript types are derived with `z.infer`.
- HTTP transport, raw schemas, mappers and orchestration are separated.
- HTTP clients and configuration are injected into services.
- TMDb credentials remain server-side.
- HTTP requests reject redirects.
- Error responses do not expose internal details.

No changes are required for these aspects.

### Type assertion in `discover.ts`

`../docs/work/server` contains:

```ts
mapResponse(parseResponse(raw) as never);
```

This type assertion suppresses the type relationship between the parsed raw response and the mapper. It conflicts with the agreed rule that `as` must not be used to suppress type errors or as a substitute for validation.

Replace the generic `discover` helper with two direct, type-safe functions:

- One function for Movie Discover: parse with `TmdbDiscoverMovieResponseSchema`, map with `mapMovieDiscoverResponse`.
- One function for TV Discover: parse with `TmdbDiscoverTvResponseSchema`, map with `mapTvDiscoverResponse`.

The resulting code must preserve the current behavior:

- Valid Movie and TV responses are mapped normally.
- Invalid responses throw `INVALID_RESPONSE`.
- Transport errors are preserved rather than reclassified as response errors.

### Missing TSDoc comments

Add concise TSDoc/JSDoc comments to the following exported functions and public methods:

| File                  | Element                    |
| --------------------- | -------------------------- |
| `../docs/work/server` | `createTmdbError`          |
| `../docs/work/server` | `toTmdbHttpError`          |
| `../docs/work/server` | `mapMovieDiscoverResponse` |
| `../docs/work/server` | `mapTvDiscoverResponse`    |
| `../docs/work/server` | `createDiscoverService`    |
| `../docs/work/server` | `discoverMovies`           |
| `../docs/work/server` | `discoverTv`               |
| `../docs/work/server` | `createTrendingService`    |
| `../docs/work/server` | `getWeeklyTrending`        |
| `../docs/work/server` | Default event handler      |
| `../docs/work/server` | Default event handler      |
| `../docs/work/server` | Default event handler      |
| `../docs/work/server` | `fetchWeeklyTrending`      |

Add concise TSDoc/JSDoc comments to the public methods of the HTTP client returned by `createTmdbHttpClient`:

| File                  | Method              |
| --------------------- | ------------------- |
| `../docs/work/server` | `get`               |
| `../docs/work/server` | `getWeeklyTrending` |

Do not restate obvious implementation details. Describe the contract, parameters and return value only where useful.

### HTTP test identifiers

The existing Playwright HTTP tests are HTTP integration tests because they execute real HTTP requests against a running Nuxt server. They do not receive coverage-intent comments.

Add stable integration identifiers to the existing tests:

| File                         | Test                            | Identifier     |
| ---------------------------- | ------------------------------- | -------------- |
| `tests/http/discover.api.ts` | Movie Discover invalid rating   | `TMDB-INT-001` |
| `tests/http/discover.api.ts` | TV Discover reversed year range | `TMDB-INT-002` |
| `tests/http/trending.api.ts` | Trending missing credentials    | `TMDB-INT-003` |

Use the identifier as a prefix in the test title, for example:

```text
TMDB-INT-001: GET movie discover returns a sanitized 400 for an invalid rating
```

Do not reuse an identifier after removing or replacing a test.

### Documentation updates

Update `docs/testing.md`:

- Classify `tests/http` as HTTP integration tests.
- State that these tests use Playwright and execute real HTTP requests against the running Nuxt server.
- State that they require stable `TMDB-INT-…` identifiers.
- State that coverage-intent comments are required for unit tests, not HTTP integration tests.

Update `tests/integration/README.md`:

- Add the `TMDB-INT-…` identifier convention.
- State that identifiers must not be reused after removal or replacement.

## Accepted deviations

The following findings are intentional or acceptable and must not be changed by this task:

- `as const` in `../docs/work/server`.
- `'movie' as const` and `'tv' as const` in `../docs/work/server`.
- The incomplete `src/lib/schemas/index.ts` export list.
- The different error-response mechanism between Discover routes (`sendTmdbError`) and the Trending route (`createError`).
- The current broad optionality of `TmdbMediaSchema`; future UI fallback behavior will be addressed separately.

## Acceptance criteria

- `as never` is removed from `../docs/work/server`.
- The Discover service preserves valid Movie and TV responses, rejects invalid responses and preserves transport errors.
- All functions and public methods listed above have concise TSDoc/JSDoc comments.
- The three existing HTTP tests use `TMDB-INT-001`, `TMDB-INT-002` and `TMDB-INT-003`.
- `docs/testing.md` classifies `tests/http` as HTTP integration tests and explains their identifier convention.
- `tests/integration/README.md` documents the `TMDB-INT-…` convention.
- Unit tests remain unchanged and do not receive test identifiers.
- No new tests, features, UI, Ollama integration or CI configuration are introduced.

## Validation

Run the following commands before requesting review:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm test:coverage
```

Report which commands were run, their results and any commands that were not run.
