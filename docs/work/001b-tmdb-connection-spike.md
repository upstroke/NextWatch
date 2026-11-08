# 001b — TMDb connection spike

## Specification

### Goal

Verify application-level authentication, weekly mixed trends, raw-response validation and normalization.

### Scope

- Private Nuxt runtime configuration for `tmdb.apiReadAccessToken` and `tmdb.baseUrl`.
- `GET /api/tmdb/trending` requests `/3/trending/all/week` with `language=de-DE`.
- The server adds the Bearer header; no credential is returned to clients.
- Requests use a 10-second timeout, no retries and no redirects.
- Only the canonical TMDb API base URL is accepted to protect credentials.
- A separate `tmdb-trending.ts` schema validates raw snake_case fields and maps to existing normalized contracts.
- Existing `tmdb.ts` exports are preserved.
- Configuration failures return 503; upstream and schema failures return 502 with generic messages.
- Fixtures contain synthetic data only.

### Assumption spikes

Before implementing product features, verify the following assumptions with small, self-contained spikes:

1. Local model: Verify that the selected Qwen model runs reliably through Ollama.
2. Streaming and cancellation: Verify streaming and cancellation in the Nuxt UI chat flow.
3. Structured output: Verify that the model can produce JSON that is reliably validated with Zod.
4. TMDb data: Verify Discover, trending, genres, keywords, images and locale-related fields.
5. Zod contracts: Verify that intent, filter and TMDb schemas integrate cleanly with TypeScript.
6. Nuxt UI chat: Verify that the chat shell supports messages, loading and cancellation.

A spike is successful only when its acceptance criterion has been demonstrated. Do not begin feature implementation until the required spikes have passed.

### Out of scope

- Search UI
- LLM integration
- Pagination
- Production retry policy
- Discover, genre and keyword catalogs
- Images and locale behavior

## Execution status

### Status

Implementation prepared remotely. Automated validation and authenticated smoke test not run.

### Local setup

Rename `TMDB_API_READ_ACCESS_TOKEN` to `NUXT_TMDB_API_READ_ACCESS_TOKEN` in the ignored local `.env`. Keep the existing token value, without the Bearer prefix. Remove `TMDB_API_KEY` if still present. Rename `TMDB_BASE_URL` to `NUXT_TMDB_BASE_URL` or omit it to use the default.

### Validation

Run `pnpm test`, `pnpm lint`, `pnpm typecheck` and `pnpm build`. Start `pnpm dev` and request `http://localhost:3000/api/tmdb/trending`. Expect a normalized page with movie and TV results. Test missing credentials with a restarted dev server and expect a sanitized 503 response.

Do not include tokens, authorization headers or raw error objects in reports.

### Remaining work

This verifies only trending/authentication. Discover, genre and keyword catalogs, images, locale behavior and Ollama remain separate verification work.
