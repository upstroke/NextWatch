# Testing

This project uses [Vitest](https://vitest.dev/) for unit and integration tests.

The test suite currently focuses on the TMDb integration: request validation, service orchestration, error handling, response mapping, and Nitro route behavior.

## Commands

```bash
npm run test            # Run all tests once
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Run tests with V8 coverage
```

## Folder structure

```text
tests/
├── unit/
│   ├── schemas/       # Zod and domain schema tests
│   ├── services/      # Service, mapper, parameter, and error tests
│   └── utils/         # Utility tests
├── integration/
│   └── tmdb/          # TMDb-backed Nitro route tests
├── fixtures/          # Shared deterministic test data
├── mocks/             # Shared test doubles and helpers
└── http/              # Existing HTTP-level tests
```

### Unit tests

Unit tests exercise one cohesive unit in isolation: schemas, services, mappers, parameters, errors, and utilities.

They must not perform real network requests. External boundaries, especially TMDb HTTP calls, are mocked.

### Integration tests

Integration tests exercise a Nitro route handler together with its schema, service, mapper, and controlled external boundary.

For TMDb routes, mock the outbound TMDb transport rather than internal application modules. This validates the route-to-response flow while keeping tests deterministic.

### Fixtures and mocks

Use `tests/fixtures` for representative, reusable API payloads and domain data.

Use `tests/mocks` for shared HTTP-client, TMDb-transport, and Nitro-event doubles. Prefer a small explicit mock over mocking the module under test.

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

Each test begins with an explicit coverage intent:

```ts
// Statement coverage: validates a valid discover query.

// Branch coverage: rejects an invalid genre filter.
```

Use:

- `// Statement coverage:` when the test verifies that a code path executes.
- `// Branch coverage:` when the test verifies a specific conditional path, error branch, fallback, or boundary.

## Import aliases

Application imports use two project aliases:

```ts
import { DiscoverQuerySchema } from '@lib/schemas/discover-query';
import { TmdbError } from '@server/services/tmdb/errors';
```

- `@lib` resolves to `src/lib`.
- `@server` resolves to `server`.

Do not use Nuxt’s default `@` or `~` aliases for shared application code; they resolve to Nuxt’s application source directory rather than `src/lib` or `server`.

## Testing principles

- Test observable behavior, not implementation details.
- Mock external network boundaries; do not mock the module under test.
- Keep fixtures deterministic and reusable.
- Prefer focused tests over broad end-to-end assertions.
- Do not expand Playwright E2E coverage for now; Vitest unit and integration tests are the active testing focus.
