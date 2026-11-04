# 001b — TMDb connection spike

## Scope

Verify application-level authentication, weekly mixed trends, raw-response validation and normalization. No search UI, LLM integration, pagination or production retry policy.

## Implementation

- Private Nuxt runtimeConfig: tmdb.apiReadAccessToken and tmdb.baseUrl.
- GET /api/tmdb/trending requests /3/trending/all/week with language=de-DE.
- The server adds the Bearer header; no credential is returned to clients.
- Requests have a 10-second timeout, no retries and no redirects.
- Only the canonical TMDb API base URL is accepted to protect credentials.
- A separate tmdb-trending.ts schema validates raw snake_case fields and maps to existing normalized contracts. Existing tmdb.ts exports are preserved.
- Configuration failures return 503; upstream and schema failures return 502 with generic messages.
- Fixtures contain synthetic data only.

## Local setup

Rename TMDB_API_READ_ACCESS_TOKEN to NUXT_TMDB_API_READ_ACCESS_TOKEN in your ignored local .env. Keep the existing token value, without the Bearer prefix. Remove TMDB_API_KEY if still present. Rename TMDB_BASE_URL to NUXT_TMDB_BASE_URL or omit it to use the default.

## Validation

Run pnpm test, pnpm lint, pnpm typecheck and pnpm build. Start pnpm dev and request http://localhost:3000/api/tmdb/trending. Expect a normalized page with movie and TV results. Test missing credentials with a restarted dev server and expect a sanitized 503 response.

## Status

Implementation prepared remotely. Automated validation and authenticated smoke test NOT RUN. Record local command outcomes and smoke-test result before accepting this spike. Do not include tokens, authorization headers or raw error objects in reports.

## Remaining spikes

This verifies only trending/authentication. Discover, genre and keyword catalogs, images, locale behavior and Ollama remain separate verification work.
