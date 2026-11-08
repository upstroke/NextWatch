# 001d — TMDb Discover spike

## Goal

Verify that TMDb Discover provides the data and filters required for NextWatch. Create separate, testable Movie and TV Discover paths with Zod contracts, normalized responses and automated tests.

This is a spike. It does not implement filter pills, search state, URL state, Pinia, infinite scroll, mixed media lists, backdrops, detail pages or LLM integration.

## Acceptance criteria

- Movie Discover supports genres, minimum rating, primary release date/year range and sorting.
- TV Discover supports genres, minimum rating, first air date/year range and sorting.
- Movie and TV responses are validated with Zod at the server boundary.
- Both responses map to the existing normalized `TmdbPagedResponse` contract.
- Empty results, invalid input and technical failures remain distinguishable.
- Unit tests cover schemas, parameter mapping, service orchestration and error isolation.
- Real HTTP contract tests cover invalid Discover input for Movie and TV.
- `pnpm test`, `pnpm test:coverage`, `pnpm lint`, `pnpm typecheck`, `pnpm build` and `pnpm test:e2e` pass locally.

## Implementation status

Implemented through the architecture documentation step:

1. Discover filter and raw response Zod contracts.
2. Pure Movie/TV parameter mapping.
3. Generic TMDb GET transport.
4. Discover service, response mappers and Nitro routes.
5. Unit tests for schemas, mapping, orchestration and error isolation.
6. HTTP contract tests for invalid Movie and TV Discover input.
7. Architecture decision record and task status.

Local automated validation and manual TMDb verification remain outstanding. No test, coverage, lint, typecheck, build or live Discover result is claimed as successful.

## Data contracts

Introduce a narrow Discover filter contract:

```ts
type DiscoverFilters = {
  genreIds: number[];
  minRating?: number;
  yearFrom?: number;
  yearTo?: number;
  sortBy: 'popularity.desc' | 'vote_average.desc';
};
```

Rules:

- Maximum three genre IDs.
- `minRating` is between 0 and 10.
- Years are between 1900 and 2100.
- `yearFrom` must not be greater than `yearTo`.
- No keyword IDs in this task; keyword IDs require a prior TMDb keyword search and remain a separate capability.

## TMDb parameter mapping

| Application filter | Movie Discover             | TV Discover          |
| ------------------ | -------------------------- | -------------------- |
| Genre IDs          | `with_genres`              | `with_genres`        |
| Minimum rating     | `vote_average.gte`         | `vote_average.gte`   |
| Year from          | `primary_release_date.gte` | `first_air_date.gte` |
| Year to            | `primary_release_date.lte` | `first_air_date.lte` |
| Sorting            | `sort_by`                  | `sort_by`            |

Movie and TV use different date parameters. Do not create one generic media Discover function that forwards all filters blindly to both endpoints.

## Files created or changed

- `../../../src/lib/schemas/discover.ts`
- `../../../src/lib/schemas/tmdb-discover.ts`
- `../server/services/tmdb/discover-params.ts`
- `../server/services/tmdb/http.ts`
- `../server/services/tmdb/errors.ts`
- `../server/services/tmdb/discover-mappers.ts`
- `../server/services/tmdb/discover.ts`
- `../server/api/tmdb/discover/movie.get.ts`
- `../server/api/tmdb/discover/tv.get.ts`
- `../../../tests/unit/services/discover.spec.ts`
- `tests/http/discover.api.ts`
- `../../../specs/architecture/002-tmdb-discover.md`
- `001d-tmdb-discover-spike.md`

## Test cases

### Unit tests

1. Valid Movie filters map to Movie query parameters.
2. Valid TV filters map to TV query parameters, including `first_air_date.gte/lte`.
3. More than three genres, rating above 10, reversed year range and unknown sorting are rejected.
4. Movie raw responses validate and map `title` and `release_date` correctly.
5. TV raw responses validate and map `name` and `first_air_date` correctly.
6. Missing poster, backdrop, overview or date fields do not fail the response.
7. An empty `results` array remains a valid empty result, not a technical error.
8. Invalid raw responses, including missing IDs or pagination fields, produce `INVALID_RESPONSE`.
9. Transport errors are not reclassified as schema errors or empty results.

### HTTP contract tests

- Invalid Movie rating returns a sanitized 400 response.
- Reversed TV year range returns a sanitized 400 response.
- Both responses use `Cache-Control: no-store` and do not expose credentials or internal error details.

Successful live Discover calls remain a separate manual local verification task so automated tests do not depend on TMDb availability or user credentials.

## Manual verification

After pulling the latest `main`, run:

- `pnpm test`
- `pnpm test:coverage`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
- `pnpm test:e2e`

Then use the local dev server to check:

- Movie Discover with one genre, minimum rating 7 and year 2024.
- TV Discover with one genre, minimum rating 7 and year 2024.
- Movie Discover with an invalid genre value.
- TV Discover with an invalid genre value.

Record only a summary: status code, result count, presence of poster/backdrop and whether filters appeared effective. Do not paste complete API responses or credentials.

## Out of scope

- Keyword search and keyword Discover.
- Providers, watch regions, certification, cast, crew and networks.
- Mixed movie/TV result lists and merge ordering.
- Filter pills, Pinia, URL state, infinite scroll, backdrops and detail pages.
- Automatic activation of additional TMDb capabilities without separate verification.
