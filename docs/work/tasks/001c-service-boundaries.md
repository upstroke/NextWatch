# 001c — Extract testable TMDb layers

## Scope

Extract transport, validation/orchestration, pure mapping and safe error translation from the trending spike. Keep URL, language, timeout, no-retry policy and public response unchanged. Remove temporary route logging. Document architecture and add isolated layer tests plus a real HTTP 503 contract test.

## Changed areas

server/services/tmdb/, server/utils/tmdb.ts (compatibility facade), server/api/tmdb/trending.get.ts, src/lib/schemas/tmdb-trending.ts, tests/server/tmdb-layers.spec.ts, tests/http/trending.api.ts, playwright.config.ts, vitest.config.ts, AGENTS.md and ADR 001.

## Evidence

User confirmed successful build and authenticated trending JSON before this refactor. Updated package versions and coverage script were read from GitHub before implementation. No credentials accessed or committed.

## Validation status

Remote implementation only: automated tests, coverage, lint, typecheck, build and Playwright NOT RUN. Prior successful results do not validate this refactor. Run ADR validation commands and repeat the authenticated local smoke test before acceptance.

## Limits

The real HTTP integration test covers missing credentials only. Success and error mapping also have fixture/unit coverage, not full HTTP coverage. No UI, Discover, caching or LLM work is included.
