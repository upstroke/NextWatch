# Testing

This project uses [Vitest](https://vitest.dev/) for unit and integration tests. It uses [Playwright](https://playwright.dev/) for HTTP integration tests and future browser-based end-to-end tests.

The test suite currently focuses on the TMDb integration: request validation, service orchestration, error handling, response mapping, and Nitro route behavior.

## Commands

```bash
npm run test            # Run all tests once
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Run tests with V8 coverage
npm run test:e2e        # Run Playwright tests
```

## Architecture and testing boundaries

The server code is layered so that business logic remains independent from HTTP and framework details.

```text
src/lib/                 Framework-free schemas, types, and shared domain logic
server/services/         Framework-free TMDb services, mappers, parameters, and errors
server/utils/            Framework-specific server helpers, such as H3 response handling
server/api/              Nitro route handlers and HTTP boundary
```

Follow these boundaries when adding code:

- Keep `src/lib` and `../server` free from H3, Nitro, and HTTP-framework imports.
- Put H3-specific helpers, such as functions that receive an `H3Event`, in `../server`.
- Keep Nitro route handlers thin: validate input, call a service, map errors, and return a response.
- Inject external transports into services. This makes services testable without real network access.
- Do not mock the module under test. Mock only external boundaries, especially the TMDb HTTP transport.

## Single source of truth for types

Follow [Typing](typing.md) for all TypeScript and Zod typing conventions.

## Folder structure

Tests are organized by the boundary they verify, not primarily by the test runner.

```text
tests/
├── unit/
│   ├── schemas/       # Zod and domain schema tests
│   ├── services/      # Service, mapper, parameter, and error tests
│   └── utils/         # Framework-specific utility tests
├── integration/
│   ├── http/          # HTTP integration tests using a running Nuxt server
│   └── tmdb/          # TMDb-backed Nitro route tests with a controlled transport
├── e2e/               # Browser-based user journeys
├── fixtures/          # Shared deterministic test data
└── mocks/             # Shared test doubles and helpers
```

## Test boundaries

| Boundary                          | Location                 | Runner     | Typical test focus                                                                     |
| --------------------------------- | ------------------------ | ---------- | -------------------------------------------------------------------------------------- |
| Unit                              | `tests/unit`             | Vitest     | One cohesive unit in isolation: schema, service, mapper, parameter, error, or utility. |
| Integration: controlled transport | `tests/integration/tmdb` | Vitest     | Route-to-response flow with a mocked TMDb transport.                                   |
| Integration: HTTP boundary        | `tests/integration/http` | Playwright | Real HTTP requests against the running Nuxt server.                                    |
| End-to-end                        | `tests/e2e`              | Playwright | Browser-based user journeys and acceptance criteria.                                   |

## Unit tests

Unit tests exercise one cohesive unit in isolation: schemas, services, mappers, parameters, errors, and utilities.

They must not perform real network requests. External boundaries, especially TMDb HTTP calls, are mocked.

Begin every `it` block with an explicit coverage-intent comment: `// Statement coverage:` or `// Branch coverage:`. Use `// Statement coverage:` for a verified execution path and `// Branch coverage:` for a conditional path, error branch, fallback, or boundary.

## Integration tests

Integration tests exercise a Nitro route handler together with its schema, service, mapper, and controlled external boundary.

For TMDb routes, mock the outbound TMDb transport rather than internal application modules. This validates the route-to-response flow while keeping tests deterministic.

### HTTP integration tests

`tests/integration/http` contains HTTP integration tests. These tests use Playwright and execute real HTTP requests against the running Nuxt server.

HTTP integration tests require a stable `TMDB-INT-…` identifier in the test title. They do not use coverage-intent comments; those comments are required for unit tests only.

## End-to-end tests

End-to-end tests verify user journeys through the browser-based application.

A user journey describes a recognizable product goal, such as “A visitor searches for a movie”. Each journey receives a stable identifier, for example `SEARCH-001`. Each acceptance criterion receives its own test identifier, for example `SEARCH-001-AC1`.

Multiple tests may verify different aspects of the same acceptance criterion, but each test receives a unique identifier. Do not reuse an identifier after removing or replacing a test.

## Fixtures and mocks

Use `tests/fixtures` for representative, reusable API payloads and domain data.

Use `tests/mocks` for shared HTTP-client, TMDb-transport, and Nitro-event doubles. Prefer a small explicit mock over mocking the module under test.

## Test identifiers

Give integration and E2E tests stable identifiers that support traceability.

| Test type        | Identifier                            | Purpose                                                  |
| ---------------- | ------------------------------------- | -------------------------------------------------------- |
| Unit test        | None                                  | The coverage-intent comment documents the test's purpose |
| Integration test | `TMDB-INT-001`, `TMDB-INT-002`, …     | Stable technical traceability and selective execution    |
| E2E test         | `SEARCH-001-AC1`, `SEARCH-001-AC2`, … | Traceability to a user journey and acceptance criterion  |

Do not reuse an identifier after removing or replacing a test. Maintain the link between the user journey, acceptance criterion and E2E test.

## Coverage

Coverage is collected with V8 and limited to application code:

```text
src/lib/**
server/**
```

The global thresholds are:

- Statements: 80%
- Branches: 80%
- Functions: 80%
- Lines: 80%

## Coverage comments

Each `it` block begins with an explicit coverage intent:

```ts
// Statement coverage: validates a valid discover query.

// Branch coverage: rejects an invalid genre filter.
```

Use:

- `// Statement coverage:` when the test verifies that a code path executes.
- `// Branch coverage:` when the test verifies a specific conditional path, error branch, fallback, or boundary.

## Import aliases

Application and test imports use these project aliases:

```ts
import { DiscoverQuerySchema } from '@lib/schemas/discover-query';
import { TmdbError } from '@server/services/tmdb/errors';
import { sendTmdbError } from '@server/utils/tmdb-errors';
import { weeklyTrendingFixture } from '@tests/fixtures/tmdb/trending';
import { tmdbTransportMock } from '@test-mocks/tmdb';
```

- `@lib` resolves to `src/lib`.
- `@server` resolves to `server`.
- `@tests` resolves to `tests`.
- `@test-mocks` resolves to `tests/mocks`.

Do not use Nuxt’s default `@` or `~` aliases for shared application code; they resolve to Nuxt’s application source directory rather than `src/lib` or `server`.

## Testing principles

- Test observable behavior, not implementation details.
- Mock external network boundaries; do not mock the module under test.
- Keep framework-specific code out of services and shared domain logic.
- Keep fixtures deterministic and reusable.
- Prefer focused tests over broad end-to-end assertions.
- Give integration and E2E tests stable identifiers that support traceability. Do not reuse an identifier after removing or replacing a test.
- Do not expand Playwright E2E coverage for now; Vitest unit and integration tests are the active testing focus.
