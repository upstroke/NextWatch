# 001c — Service boundaries

## Specification

### Goal

Extract transport, validation/orchestration, pure mapping and safe error translation from the trending spike while preserving public behavior.

### Scope

- Keep URL, language, timeout, no-retry policy and public response unchanged.
- Remove temporary route logging.
- Document architecture and add isolated layer tests.
- Add a real HTTP 503 contract test.

### Architecture

- `app` components render UI and handle interaction.
- `app` composables call the Nitro API and own UI execution state; they do not make direct TMDb requests.
- `server/api` adapts HTTP input/output, uses explicit return types and maps errors safely.
- `server/services/tmdb/http.ts` handles credential checks, fixed upstream destination, timeout and no retries; the supplied fetch adapter rejects redirects.
- `server/services/tmdb/trending.ts` requests data, validates the raw response and maps it to the application contract.
- `server/services/tmdb/mappers.ts` contains pure mapping without network or framework context.
- `server/services/tmdb/errors.ts` provides controlled errors and HTTP error translation.
- `src/lib/schemas` contains raw and normalized Zod contracts; types are derived from schemas.
- Runtime configuration is read only in the server composition root.
- Services accept explicit dependencies; no browser import may cross into `server/`.

### Testing

- Vitest units cover raw contracts, pure mappings and controlled error translation.
- Service tests inject transport and retain real validation and mapping.
- Playwright API integration starts a dedicated real Nuxt server on port 3101, checks the missing-token 503 contract and cache header, and does not require live TMDb calls or browser installation.
- HTTP 200/502 with controlled upstream responses, redirect behavior and full cancellation integration remain follow-up coverage.

### Out of scope

- UI
- Discover
- Caching
- LLM integration
- New dependencies or version changes

## Execution status

### Status

Completed.

### Changed areas

- `server/services/tmdb/`
- `server/utils/tmdb.ts` as a compatibility facade
- `server/api/tmdb/trending.get.ts`
- `src/lib/schemas/tmdb-trending.ts`
- `tests/server/tmdb-layers.spec.ts`
- `tests/http/trending.api.ts`
- `playwright.config.ts`
- `vitest.config.ts`
- `AGENTS.md`
- ADR 001

### Evidence

The user confirmed a successful build and authenticated trending JSON before this refactor. Updated package versions and the coverage script were read from GitHub before implementation. No credentials were accessed or committed.

### Validation

Automated tests, coverage, lint, typecheck, build, Playwright and the authenticated local smoke test completed successfully.

### Limits

The real HTTP integration test covers missing credentials only. Success and error mapping also have fixture/unit coverage, not full HTTP coverage.
