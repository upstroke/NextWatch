# 001d — TMDb Discover spike

## Specification

### Goal

Verify that TMDb Discover provides the data and filters required for NextWatch. Create separate, testable Movie and TV Discover paths with Zod contracts, normalized responses and automated tests.

### Scope

- Movie Discover supports genres, minimum rating, primary release date/year range and sorting.
- TV Discover supports genres, minimum rating, first air date/year range and sorting.
- Movie and TV responses are validated with Zod at the server boundary.
- Both responses map to the existing normalized `TmdbPagedResponse` contract.
- Empty results, invalid input and technical failures remain distinguishable.
- Unit tests cover schemas, parameter mapping, service orchestration and error isolation.
- Real HTTP contract tests cover invalid Discover input for Movie and TV.

### Data contract

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
- No keyword IDs in this work package; keyword IDs require a prior TMDb keyword search and remain a separate capability.

### TMDb parameter mapping

| Application filter | Movie Discover             | TV Discover          |
| ------------------ | -------------------------- | -------------------- |
| Genre IDs          | `with_genres`              | `with_genres`        |
| Minimum rating     | `vote_average.gte`         | `vote_average.gte`   |
| Year from          | `primary_release_date.gte` | `first_air_date.gte` |
| Year to            | `primary_release_date.lte` | `first_air_date.lte` |
| Sorting            | `sort_by`                  | `sort_by`            |

Movie and TV use different date parameters. Do not create one generic media Discover function that forwards all filters blindly to both endpoints.

### Out of scope

- Keyword search and keyword Discover
- Providers, watch regions, certification, cast, crew and networks
- Mixed movie/TV result lists and merge ordering
- Filter pills, Pinia, URL state, infinite scroll, backdrops and detail pages
- Automatic activation of additional TMDb capabilities without separate verification

## Execution status

### Status

Completed.

### Implemented

1. Discover filter and raw response Zod contracts.
2. Pure Movie/TV parameter mapping.
3. Generic TMDb GET transport.
4. Discover service, response mappers and Nitro routes.
5. Unit tests for schemas, mapping, orchestration and error isolation.
6. HTTP contract tests for invalid Movie and TV Discover input.
7. Architecture decision record and task status.

### Files created or changed

- `src/lib/schemas/discover.ts`
- `src/lib/schemas/tmdb-discover.ts`
- `server/services/tmdb/discover-params.ts`
- `server/services/tmdb/http.ts`
- `server/services/tmdb/errors.ts`
- `server/services/tmdb/discover-mappers.ts`
- `server/services/tmdb/discover.ts`
- `server/api/tmdb/discover/movie.get.ts`
- `server/api/tmdb/discover/tv.get.ts`
- `tests/unit/services/discover.spec.ts`
- `tests/http/discover.api.ts`
- `../../tasks/002-tmdb-discover.md`

### Validation

Local automated validation and manual TMDb verification completed successfully.

Run:

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
