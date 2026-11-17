# Service boundaries

## Specification

### Purpose

Document established separation of transport, validation, service orchestration, pure mapping and controlled error translation. Follow [development rules](../../AGENTS.md), [Typing](../typing.md) and [Testing](../testing.md).

### Responsibilities

- Components render interaction; composables call our API and manage UI execution state.
- Nitro routes adapt HTTP input/output, compose dependencies and translate safe errors; no domain/request-mapping rules in routes.
- `server/services/tmdb/http.ts` owns credential checks, allowed destinations, timeout and redirect rejection. The established transport does not automatically retry.
- Services accept explicit dependencies, request data, validate provider responses and map them to application contracts.
- Mappers and search-domain decisions remain framework-independent and pure where possible.
- `server/services/tmdb/errors.ts` provides controlled errors and safe translation.
- Zod contracts live in `src/lib/schemas`; types are derived from their schemas. Runtime configuration is read in the server composition root.
- Browser code never imports server modules or receives TMDb credentials. Errors expose no credentials, headers, raw upstream errors or stack traces.

### Compatibility and historical scope

The original Trending extraction preserved public responses and temporarily used `server/utils/tmdb.ts` as a forwarding facade, with `createTmdbSpikeError` aliasing `createTmdbError`. `TmdbError` is a derived type, not a class. These are historical compatibility decisions, not instructions to recreate obsolete helpers. Recheck callers before changing remaining compatibility code.

The original refactor excluded UI, Discover, caching, LLM integration and dependency/version changes. Those exclusions describe that package, not a permanent ban on separately approved later work.

### Testing

Units verify contracts, mappings and errors; service tests inject transport while retaining real validation/mapping. Playwright HTTP tests use a real dedicated Nuxt server. The original missing-credentials HTTP check does not prove every success, redirect, cancellation or upstream-error path is covered. Successful validation is distinct from exhaustive test coverage.

## Execution status

- Completed. On 2026-11-17 the user confirmed previously outstanding pre-WP-011 checks successful, including tests, coverage, ESLint and typecheck. This is historical user-reported validation, not an assistant-run check.
- Documentation consolidated; obsolete pending-validation wording and empty references removed. No runtime code or tests changed and no validation commands run for this update.

## Related documentation

- [Product and search flow](000-product-and-search-flow.md)
- [Discover foundation](004-tmdb-discover-foundation.md)
- [Testing](../testing.md)
- [Typing](../typing.md)
