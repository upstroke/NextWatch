# ADR 001 — Testable service boundaries

Status: accepted design; implementation validation pending.

## Context

The trending spike works locally. Its HTTP, validation and mapping responsibilities must not grow into one monolithic service. Preserve the public response and security policy during extraction.

## Boundaries

- app components: rendering and interaction.
- app composables: call our Nitro API, own UI execution state; no direct TMDb requests.
- server/api: HTTP adapter and composition root, explicit return types, safe status mapping.
- server/services/tmdb/http.ts: credential checks, fixed upstream destination, timeout and no retries. The supplied fetch adapter must reject redirects.
- server/services/tmdb/trending.ts: request, validate raw response, map to our contract.
- server/services/tmdb/mappers.ts: pure mapping without network or framework context.
- server/services/tmdb/errors.ts: controlled errors and HTTP error translation.
- src/lib/schemas: raw and normalized Zod contracts, types derived from schemas.
- Future src/lib/domain/search: pure reducers and compatibility rules, created only when needed.

Runtime configuration is read only in the server composition root. No browser import may cross into server/. Services accept explicit dependencies. Language remains de-DE for this behavior-preserving refactor; future locale and region inputs must be separate.

## Compatibility

server/utils/tmdb.ts remains a temporary forwarding facade for the existing seven regression tests. createTmdbSpikeError aliases the createTmdbError factory; TmdbError is a type derived from the factory return value, not a class. No duplicate transport implementation. normalizeTrendingResponse is replaced by the server mapper; its only repository caller was the former utility. No new UI or Discover implementation.

## Testing

- Vitest units: raw contracts, pure mappings, controlled error translation.
- Service tests: inject transport, retain real validation and mapping. Existing regression suite stays intact.
- Playwright API integration: starts a dedicated real Nuxt server on port 3101 with a whitespace token (overrides local .env), checks the missing-token 503 contract and cache header. No live TMDb calls or browser installation needed for this request-only test.
- HTTP 200/502 with controlled upstream responses, redirect behavior and full cancellation integration remain follow-up coverage; do not claim the single 503 test covers them.
- E2E user flows follow when UI exists.

Coverage covers all src/lib, server/services and the compatibility facade, not just imported files. Nitro routes are exercised by Playwright separately and are not included in this Vitest coverage report. No arbitrary coverage threshold is introduced.

## Validation commands

- pnpm test
- pnpm test:coverage
- pnpm lint
- pnpm typecheck
- pnpm build
- pnpm test:e2e (currently HTTP contract tests only)

No new dependencies or version changes are required. Tests and build must be run locally before accepting this implementation.
