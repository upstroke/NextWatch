# Service boundaries

## Status

Completed.

## Purpose

This concept documents the established service boundaries for NextWatch.

It separates transport, validation, orchestration, pure mapping and safe error translation. It preserves the public behavior of the TMDb integration.

## Architecture

- `app/` components render UI and handle interaction.
- `app/` composables call the Nitro API and own UI execution state; they do not make direct TMDb requests.
- `server/api/` adapts HTTP input and output, uses explicit return types and maps errors safely.
- `server/services/tmdb/http.ts` owns credential checks, fixed upstream destination, timeout, no retries and redirect rejection.
- `server/services/tmdb/` services request data, validate raw responses and map them to application contracts.
- `server/services/tmdb/mappers.ts` contains pure mapping without network or framework context.
- `server/services/tmdb/errors.ts` provides controlled errors and HTTP error translation.
- `src/lib/schemas/` contains raw and normalized Zod contracts; TypeScript types are derived with `z.infer`.

## Core rules

- Runtime configuration is read only in the server composition root.
- Browser code must not import server modules.
- Services accept explicit dependencies.
- External transports are injected into services.
- TMDb credentials remain server-side.
- HTTP requests reject redirects.
- Error responses do not expose internal details.

## Testing

- Vitest units cover raw contracts, pure mappings and controlled error translation.
- Service tests inject transport and retain real validation and mapping.
- Playwright HTTP integration tests run against a dedicated Nuxt server.
- The missing-credentials contract is covered by an HTTP integration test.
- HTTP 200/502 with controlled upstream responses, redirect behavior and full cancellation integration remain follow-up coverage.

## Out of scope

- UI.
- Discover.
- Caching.
- LLM integration.
- New dependencies or version changes.

## Related documentation

- `docs/concepts/001-project-foundation.md`
- `docs/concepts/002-tmdb-connection-and-trending.md`
- `docs/testing.md`
- `docs/typing.md`
