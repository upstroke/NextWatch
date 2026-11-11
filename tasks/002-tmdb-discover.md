# ADR 002 — TMDb Discover spike

Status: implemented; local validation pending.

## Context

NextWatch needs to verify that TMDb Discover provides the filters and response data required for controlled movie and TV search. This spike establishes a narrow, testable foundation without introducing UI, search state, pagination behavior or LLM integration.

## Boundaries

- `../server/api/tmdb/discover/movie.get.ts` and `server/api/tmdb/discover/tv.get.ts` are HTTP adapters. They validate query input, set `Cache-Control: no-store`, compose dependencies and translate controlled errors to HTTP responses.
- `../server/services/tmdb/discover.ts` orchestrates each request: parameter construction, upstream request, raw response validation and normalization.
- `../server/services/tmdb/discover-params.ts` is a pure mapping layer from validated application filters to TMDb query parameters.
- `../server/services/tmdb/discover-mappers.ts` contains pure response mappers and assigns `mediaType` as `movie` or `tv`.
- `../server/services/tmdb/http.ts` owns transport concerns: fixed base URL, Bearer authentication, JSON acceptance, timeout, no retries and path validation.
- `../src/lib/schemas/discover.ts` defines the application filter contract and derives its TypeScript type with `z.infer`.
- `../src/lib/schemas/tmdb-discover.ts` defines narrow Zod contracts for Movie and TV Discover raw responses.

Runtime configuration is read only in the Nitro composition root. Browser code must not import server modules or access TMDb credentials.

## Media-specific mapping

| Application filter | Movie Discover             | TV Discover          |
| ------------------ | -------------------------- | -------------------- |
| Genre IDs          | `with_genres`              | `with_genres`        |
| Minimum rating     | `vote_average.gte`         | `vote_average.gte`   |
| Year from          | `primary_release_date.gte` | `first_air_date.gte` |
| Year to            | `primary_release_date.lte` | `first_air_date.lte` |
| Sorting            | `sort_by`                  | `sort_by`            |

Movie and TV use different date parameters. No generic media Discover function forwards all filters blindly to both endpoints.

## Error behavior

- `INVALID_FILTER` maps to HTTP 400 with the message `Invalid Discover filters`.
- `MISSING_TOKEN` and `INVALID_BASE_URL` map to HTTP 503 with `TMDb configuration unavailable`.
- `UPSTREAM_FAILED` and `INVALID_RESPONSE` map to HTTP 502 with `TMDb request or response invalid`.
- Error responses do not expose stack traces, raw upstream errors, request headers or credentials.
- An empty `results` array is a valid empty result, not a technical failure.

## Testing

- Unit tests cover filter validation, Movie/TV parameter mapping, raw response validation, normalization, service orchestration and error isolation.
- HTTP contract tests cover invalid Movie rating and reversed TV year-range inputs, asserting a sanitized 400 response and `Cache-Control: no-store`.
- Successful live Movie and TV Discover calls remain separate manual verification tasks so automated tests do not depend on TMDb availability or user credentials.
- The tests do not claim coverage for successful live upstream responses, redirects, cancellation or pagination behavior.

## Out of scope

- Keyword search and keyword Discover.
- Providers, watch regions, certification, cast, crew and networks.
- Mixed movie/TV result lists and merge ordering.
- Filter pills, Pinia, URL state, infinite scroll, backdrops and detail pages.
- Automatic activation of additional TMDb capabilities without separate verification.
