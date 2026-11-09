# 002 — TMDb search, keyword, person and provider contracts

## Specification

### Goal

Extend the server-side TMDb integration with the search, entity-resolution and provider capabilities required by NextWatch. Establish stable Zod contracts, normalized application candidates, Nitro routes and a Discover extension for validated person and keyword IDs.

This is a foundation work package. It does not implement a user interface, search state, reducer, URL state, LLM integration or automatic multi-step search flows.

### Background

TMDb separates text-based search from criteria-based discovery:

- `/search/*` finds concrete movies, TV shows and people from a text query.
- `/discover/*` filters the catalog using structured criteria and IDs.
- `/search/keyword` resolves a thematic term into a keyword ID.
- `/search/person` resolves a person into a person ID.
- Watch-provider endpoints expose regional streaming, rental and purchase availability for a selected movie or TV show.

NextWatch must not silently turn a title query into a Discover filter. A person or keyword must be resolved and selected before its ID may be used in a Discover request.

### Scope

#### TMDb Search endpoints

Add server-side support for:

- `GET /search/movie`
- `GET /search/tv`
- `GET /search/multi`
- `GET /search/person`
- `GET /search/keyword`

Expose them through the following NextWatch routes:

- `GET /api/tmdb/search/movie`
- `GET /api/tmdb/search/tv`
- `GET /api/tmdb/search/multi`
- `GET /api/tmdb/search/person`
- `GET /api/tmdb/search/keyword`

#### Watch providers

Add server-side support for regional availability:

- `GET /api/tmdb/movie/[id]/watch-providers`
- `GET /api/tmdb/tv/[id]/watch-providers`

The region is an explicit query parameter, for example `region=DE`. The response must distinguish streaming, rental and purchase availability where TMDb provides it.

#### Language-aware existing endpoints

Update the existing endpoints to accept the resolved TMDb content language:

- `GET /api/tmdb/discover/movie`
- `GET /api/tmdb/discover/tv`
- `GET /api/tmdb/movie/[id]`
- `GET /api/tmdb/tv/[id]`

The application locale resolves to the TMDb content language:

- `en` resolves to `en-US`.
- `de` resolves to `de-DE`.

Watch-provider requests use an explicit `region` parameter instead of deriving it from the application locale.

#### Discover extension

Extend the existing Discover capability with validated IDs:

- `personIds`
- `keywordIds`

The server maps these application-level fields to the appropriate TMDb Discover parameters:

| Application field     | TMDb parameter                                      |
| --------------------- | --------------------------------------------------- |
| `personIds`           | `with_cast`                                         |
| `keywordIds`          | `with_keywords`                                     |
| `genreIds`            | `with_genres`                                       |
| `yearFrom` / `yearTo` | Media-specific release or first-air-date parameters |
| `minRating`           | `vote_average.gte`                                  |
| `sortBy`              | `sort_by`                                           |

### Zod contracts

Create `src/lib/schemas/tmdb-search.ts` with minimal raw response contracts for:

- TMDb Movie Search
- TMDb TV Search
- TMDb Multi Search
- TMDb Person Search
- TMDb Keyword Search
- Movie and TV Watch Providers

Define normalized application candidates in the same or an adjacent contract file:

- `SearchMovieCandidate`
- `SearchTvCandidate`
- `SearchPersonCandidate`
- `SearchKeywordCandidate`
- `MultiSearchCandidate`
- `WatchProviderAvailability`

Keep the contracts intentionally small. Include only fields required by NextWatch, such as ID, display name, media type, overview, poster/backdrop path, profile path and known-for metadata where useful.

### Query validation

Each Search route validates its query at the HTTP boundary:

- `query`: required, trimmed, non-empty, maximum 200 characters
- `page`: optional positive integer with an upper bound
- `region`: required for Watch Providers, ISO 3166-1 alpha-2 format

Invalid or missing input returns a defined client error. Technical failures must remain distinguishable from empty results.

### Architecture

- `src/lib/schemas/tmdb-search.ts` contains raw TMDb and normalized application contracts.
- `src/lib/schemas/discover-query.ts` is extended with person and keyword IDs.
- `server/services/tmdb/search.ts` contains the Search service.
- `server/services/tmdb/search-mappers.ts` maps raw responses to stable application candidates.
- `server/services/tmdb/discover.ts` is extended to map person and keyword IDs.
- `server/services/tmdb/detail.ts` accepts the resolved TMDb content language.
- `server/api/tmdb/search` contains thin Nitro route handlers and query validation.
- `server/utils/tmdb.ts` remains the injected HTTP transport boundary.
- `server/utils/tmdb-errors.ts` maps transport and validation failures to safe HTTP responses.

### Tests

Add unit tests for:

- Valid and invalid raw Search responses.
- Movie, TV, Multi, Person and Keyword mapping.
- Missing optional fields.
- Invalid required fields.
- Transport-error isolation.
- Discover parameter mapping for person and keyword IDs.
- Watch-provider mapping and region handling.
- Language forwarding for Discover and Detail services.

Add HTTP contract tests for:

- Valid Search queries.
- Missing or empty queries.
- Invalid pages.
- Invalid Watch Provider regions.
- Invalid Movie and TV IDs.
- Sanitized error responses.
- `Cache-Control: no-store`.
- No exposure of credentials or internal error details.

Use stable `TMDB-INT-…` identifiers in HTTP integration test titles.

### Acceptance criteria

- Movie, TV, Multi, Person and Keyword searches are available through Nitro routes.
- Raw TMDb Search responses are validated with Zod at the server boundary.
- Search responses are mapped to stable application candidates.
- Discover supports validated person and keyword IDs.
- Discover and Detail requests use the TMDb content language resolved from the application locale.
- Watch-provider availability is available for a selected Movie or TV ID and an explicit region.
- Streaming, rental and purchase availability remain distinguishable.
- Invalid queries, pages, regions and IDs produce defined client errors.
- Transport failures remain distinguishable from empty results.
- `pnpm test`, `pnpm test:coverage`, `pnpm lint`, `pnpm typecheck` and `pnpm build` pass locally.
- Manual live verification covers at least one Movie Search, one TV Search, one Multi Search, one Person Search, one Keyword Search and one regional Watch Provider request.

### Out of scope

- Search state, reducer, revision or URL state
- Filter pills, result grid, detail page or provider UI
- LLM, Ollama or parser integration
- Automatic multi-step search orchestration
- Automatic similar-title search
- Client-side filtering of unloaded Search result pages
- Provider filtering in Discover
- Watchlist, accounts, community features or persistent user data
- Public deployment, monitoring or telemetry

## Execution status

### Status

Planned.

### Next steps

1. Add raw and normalized TMDb Search contracts.
2. Add Watch Provider contracts.
3. Extend the Discover query contract with person and keyword IDs.
4. Implement the Search service and Search mappers.
5. Implement the Search Nitro routes and query validation.
6. Extend the Discover service and routes with person, keyword and language support.
7. Extend the Detail service and routes with language support.
8. Add unit, HTTP contract and manual live verification.
9. Run local validation and record the results.
