# TMDb search and provider contracts

## Status

Completed.

## Purpose

This concept documents the established TMDb search, multi-search, person, keyword and provider contracts.

It defines the existing search foundation and the separate title-to-provider lookup flow without introducing a new orchestration architecture.

## Search endpoints

The application exposes the following GET endpoints:

- `GET /api/tmdb/search/movie`
- `GET /api/tmdb/search/tv`
- `GET /api/tmdb/search/multi`
- `GET /api/tmdb/search/person`
- `GET /api/tmdb/search/keyword`

## Search contracts

### Search movie

`GET /api/tmdb/search/movie?query=Inception`

Returns normalized Movie search results.

### Search TV

`GET /api/tmdb/search/tv?query=Breaking%20Bad`

Returns normalized TV search results.

### Search multi

`GET /api/tmdb/search/multi?query=Inception`

Returns normalized Movie and TV search results.

### Search person

`GET /api/tmdb/search/person?query=Brad%20Pitt`

Returns normalized Person search candidates.

### Search keyword

`GET /api/tmdb/search/keyword?query=space`

Returns normalized Keyword search candidates.

## Search service responsibilities

`server/services/tmdb/search.ts` owns search orchestration.

It provides:

- `searchMovies()`
- `searchTv()`
- `searchMulti()`
- `searchPeople()`
- `searchKeywords()`

Each function validates raw responses, maps normalized results and delegates transport concerns to the injected HTTP client.

## Search contracts

`src/lib/schemas/` contains Zod contracts for raw TMDb responses and normalized search results.

The following normalized contracts exist:

- `SearchMovieResultSchema`
- `SearchTvResultSchema`
- `SearchMultiResultSchema`
- `SearchPersonCandidateSchema`
- `SearchKeywordCandidateSchema`

## Person and keyword contracts

### Person candidate

`SearchPersonCandidateSchema` contains:

- `id`
- `name`
- optional `profilePath`
- optional `knownFor`

### Keyword candidate

`SearchKeywordCandidateSchema` contains:

- `id`
- `name`

## Provider lookup

### Title-to-provider flow

The application supports a title-to-provider lookup flow.

The flow is:

1. Search a title using `searchMulti()`.
2. Disambiguate the result if necessary.
3. Convert the selected Movie or TV result into a provider lookup input.
4. Request watch providers for the selected title.

### Provider endpoint

`GET /api/tmdb/title-providers?title=Inception`

Returns watch-provider information for a resolved title.

### Provider service responsibilities

`server/services/tmdb/title-provider-orchestration.ts` owns the title-to-provider flow.

`server/services/tmdb/watch-providers.ts` owns provider lookup.

`server/services/tmdb/search-disambiguation.ts` owns disambiguation.

## Disambiguation

`server/services/tmdb/search-disambiguation.ts` provides `resolve()`.

`resolve()` accepts a `MultiSearchCandidate` with `mediaType` and returns one of the following states:

- `resolved`
- `ambiguous`
- `unresolved`

## Pending filters

`server/services/tmdb/pending-filters.ts` provides `mergePendingFilters()`.

It merges pending filters into an existing filter state.

## Architecture

- `src/lib/schemas/` contains Zod contracts for raw TMDb responses and normalized search results.
- `server/services/tmdb/` contains framework-free search, provider, disambiguation and filter services.
- `server/api/tmdb/` contains thin Nitro route handlers.
- `server/utils/` contains H3-specific helpers.
- External TMDb HTTP transports are injected into services.
- Do not mock the module under test; mock only external boundaries.

## Error behavior

- Invalid query inputs produce defined client errors.
- Transport failures remain distinguishable from validation failures.
- `INVALID_RESPONSE` preserves the original validation or mapping error as its `cause`.

## Out of scope

- Detail page UI.
- Routing or navigation.
- Pinia or URL state.
- `append_to_response`.
- Credits, cast, crew, videos, images, recommendations, similar titles, reviews, keywords, translations, alternative titles, release dates, watch providers, regions or certification.
- LLM or Ollama integration.
- Mixed Movie/TV result lists.
- Infinite scroll.
- Automatic activation of additional TMDb capabilities without separate verification.

## Related documentation

- `docs/concepts/003-service-boundaries.md`
- `docs/concepts/004-tmdb-discover-foundation.md`
- `docs/concepts/005-tmdb-detail-data-contract.md`
- `docs/concepts/006-language-aware-tmdb-transport.md`
- `docs/testing.md`
