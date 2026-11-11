# Testing standards

## Status

Completed.

## Purpose

This concept documents the established testing standards for NextWatch.

It defines the test structure, coverage rule, mock discipline and H3 handler test conventions.

## Test structure

Tests are organized as follows:

- `tests/unit/`
- `tests/integration/`
- `tests/mocks/`

Unit tests cover schemas, services, utils and handlers.

Integration tests cover cross-layer behavior.

## Unit test conventions

Every `it` block starts with one of the following comments:

- `// Statement coverage:`
- `// Branch coverage:`

This convention makes the intent of each test explicit.

## Integration test conventions

Integration tests use stable IDs with the prefix `TMDB-INT-`.

Unit tests do not use IDs.

## Coverage rule

The project does not target 100% coverage.

A minimum of 80% statement coverage is sufficient.

Tests should verify behavior, not artificially cover branches.

## Mock discipline

Do not mock the module under test.

Mock only external boundaries.

External boundaries include:

- TMDb HTTP transport.
- File system access.
- Time.
- Randomness.

## H3 handler tests

H3 handler tests require real events.

They must provide:

- `context.params`
- `node.req.url`
- `node.res.setHeader`
- `path`

Without `path`, `getQuery()` does not read query parameters.

## Error handling

Error handling is not uniform across handlers.

- Person handlers throw `createError(toTmdbHttpError(error))`.
- Discover handlers return `sendTmdbError()`.

Do not claim uniform error handling without verifying the actual implementation.

## Out of scope

- UI testing.
- End-to-end testing.
- Visual regression testing.
- Performance testing.
- Load testing.
- Automatic activation of additional testing capabilities without separate verification.

## Related documentation

- `docs/concepts/003-service-boundaries.md`
- `docs/concepts/004-tmdb-discover-foundation.md`
- `docs/concepts/005-tmdb-detail-data-contract.md`
- `docs/concepts/006-language-aware-tmdb-transport.md`
- `docs/concepts/007-tmdb-search-and-provider-contracts.md`
