# TMDb connection and trending

## Status

Completed.

## Purpose

This concept documents the established TMDb connection and weekly trending behavior.

It verifies application-level authentication, weekly mixed trends, raw-response validation and normalization.

## TMDb connection

TMDb credentials and the API base URL are configured through private Nuxt runtime configuration:

- `NUXT_TMDB_API_READ_ACCESS_TOKEN`
- `NUXT_TMDB_BASE_URL`

The server adds the Bearer authorization header. No credential is returned to the client.

## Transport rules

- Requests use a 10-second timeout.
- Requests do not retry automatically.
- Requests reject redirects.
- Only the canonical TMDb API base URL is accepted.
- Transport failures are sanitized before reaching the client.

## Trending behavior

`GET /api/tmdb/trending` requests TMDb’s weekly mixed trending endpoint:

```text
/3/trending/all/week
```

The request uses the resolved TMDb content language.

The response is validated with Zod and mapped to the normalized application contract.

## Error behavior

- Missing or invalid configuration returns HTTP 503.
- Upstream or response-validation failures return HTTP 502.
- Error responses do not expose credentials, raw upstream errors, request headers or stack traces.

## Testing

- Raw-response contracts are validated with Zod.
- Trending mapping and service orchestration are covered by unit tests.
- The missing-credentials HTTP contract is covered by an integration test.
- Live TMDb verification is performed manually with valid credentials.

## Out of scope

- Search UI.
- LLM integration.
- Pagination.
- Production retry policy.
- Discover, genre and keyword catalogs.
- Images and locale behavior.

## Related documentation

- `docs/concepts/001-project-foundation.md`
- `docs/concepts/003-service-boundaries.md`
- `docs/concepts/006-language-aware-tmdb-transport.md`
- `docs/testing.md`
