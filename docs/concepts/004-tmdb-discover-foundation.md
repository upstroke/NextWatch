# TMDb discover foundation

## Status

Completed.

## Purpose

This concept documents the established Movie and TV Discover foundation.

It verifies that TMDb Discover provides the filters and response data required for controlled movie and TV search.

## Responsibilities

- `server/api/tmdb/discover/movie.get.ts` and `server/api/tmdb/discover/tv.get.ts` are HTTP adapters.
- They validate query input, set `Cache-Control: no-store`, compose dependencies and translate controlled errors to HTTP responses.
- `server/services/tmdb/discover.ts` orchestrates each request: parameter construction, upstream request, raw-response validation and normalization.
- `server/services/tmdb/discover-params.ts` maps validated application filters to TMDb query parameters.
- `server/services/tmdb/discover-mappers.ts` contains pure response mappers and assigns `mediaType`.
- `server/services/tmdb/http.ts` owns transport concerns.
- `src/lib/schemas/discover.ts` defines the application filter contract.
- `src/lib/schemas/tmdb-discover.ts` defines narrow Zod contracts for raw Movie and TV Discover responses.

## Media-specific mapping

| Application filter | Movie Discover | TV Discover |
|---|---|---|
| Genre IDs | `with_genres` | `with_genres` |
| Minimum rating | `vote_average.gte` | `vote_average.gte` |
| Year from | `primary_release_date.gte` | `first_air_date.gte` |
| Year to | `primary_release_date.lte` | `first_air_date.lte` |
| Sorting | `sort_by` | `sort_by` |

Movie and TV use different date parameters. No generic media Discover function forwards all filters blindly to both endpoints.

## Error behavior

- `INVALID_FILTER` maps to HTTP 400 with `Invalid Discover filters`.
- `MISSING_TOKEN` and `INVALID_BASE_URL` map to HTTP 503 with `TMDb configuration unavailable`.
- `UPSTREAM_FAILED` and `INVALID_RESPONSE` map to HTTP 502 with `TMDb request or response invalid`.
- Error responses do not expose stack traces, raw upstream errors, request headers or credentials.
- An empty `results` array is a valid empty result, not a technical failure.

## Testing

- Unit tests cover filter validation, Movie/TV parameter mapping, raw-response validation, normalization, service orchestration and error isolation.
- HTTP contract tests cover invalid Movie rating and reversed TV year-range inputs.
- Successful live Movie and TV Discover calls remain separate manual verification tasks.
- Tests do not claim coverage for successful live upstream responses, redirects, cancellation or pagination behavior.

## Out of scope

- Keyword search and keyword Discover.
- Providers, watch regions, certification, cast, crew and networks.
- Mixed movie/TV result lists and merge ordering.
- Filter pills, Pinia, URL state, infinite scroll, backdrops and detail pages.
- Automatic activation of additional TMDb capabilities without separate verification.

## Related documentation

- `docs/concepts/003-service-boundaries.md`
- `docs/concepts/006-language-aware-tmdb-transport.md`
- `docs/concepts/007-tmdb-search-and-provider-contracts.md`
- `docs/testing.md`
