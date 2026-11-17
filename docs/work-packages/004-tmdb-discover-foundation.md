# TMDb discover foundation

## Specification

### Purpose

Describe the established Movie/TV Discover service foundation, not a complete confirmed search flow. [WP 012](012-search-execution-and-discover.md) owns adaptation from the general search draft, readiness, person routing, combined results and pagination.

### Responsibilities

- `server/api/tmdb/discover/movie.get.ts` and `tv.get.ts` are HTTP adapters: validate input, set `Cache-Control: no-store`, compose dependencies and translate safe errors.
- `server/services/tmdb/discover.ts` builds and performs a provider request, validates its raw response and maps it.
- `server/services/tmdb/discover-params.ts` is the pure parameter builder; `discover-mappers.ts` normalizes results and assigns media type.
- `server/services/tmdb/http.ts` owns secure transport.
- `src/lib/schemas/discover.ts` defines service filters; `tmdb-discover.ts` defines raw response contracts. These are not the editable domain `SearchState`.

### Media-specific date mapping

| Service filter | Movie parameter | TV parameter |
| --- | --- | --- |
| Genre IDs | `with_genres` | `with_genres` |
| Minimum rating | `vote_average.gte` | `vote_average.gte` |
| Year from | `primary_release_date.gte` | `first_air_date.gte` |
| Year to | `primary_release_date.lte` | `first_air_date.lte` |
| Sorting | `sort_by` | `sort_by` |

### Current limitations and handoff

The original spike excluded keywords, people, providers, networks, mixed results, pagination, UI and parser integration. These are historical scope exclusions. The current parameter builder also handles keywords and person IDs; this does not establish equal Movie/TV capabilities.

The read-only review at `bc03168` confirmed that nonempty person IDs currently emit `with_cast` without checking media type. Different date mapping therefore does not mean all filters are safely media-specific. This documentation does not fix that implementation. WP 012 must guard/specialize person routing and implement its separate TV-credit path before claiming TV-person support.

### Errors and testing

- `INVALID_FILTER`: HTTP 400, `Invalid Discover filters`.
- `MISSING_TOKEN` / `INVALID_BASE_URL`: HTTP 503, `TMDb configuration unavailable`.
- `UPSTREAM_FAILED` / `INVALID_RESPONSE`: HTTP 502, `TMDb request or response invalid`.
- Empty results are valid emptiness, not a technical failure. Errors expose no internal or credential data.
- Units cover project-specific filter validation, date mapping, raw validation, normalization, orchestration and error isolation. The original HTTP checks cover invalid Movie rating and reversed TV years.
- Automated validation success does not establish live upstream verification or exhaustive redirect, cancellation and pagination coverage. Verify provider assumptions during the relevant implementation.

## Execution status

- Foundation completed. On 2026-11-17 the user confirmed previously outstanding validation before WP 011 successful, including tests, coverage, ESLint and typecheck. No new numeric coverage or independent execution is claimed.
- Documentation corrected for current keyword/person mapping and the outstanding TV-person boundary. No runtime code, schemas or tests changed; no validation commands run for this update.

## Related documentation

- [Product and search flow](000-product-and-search-flow.md)
- [Service boundaries](003-service-boundaries.md)
- [Search execution](012-search-execution-and-discover.md)
- [Testing](../testing.md)
