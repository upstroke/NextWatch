# Integration tests

Integration tests verify the interaction between application boundaries. They are organized by the boundary under test, not primarily by the test runner.

## Structure

```text
integration/
├── http/          # HTTP integration tests using a running Nuxt server
└── tmdb/          # TMDb-backed Nitro route tests with a controlled transport
```

## HTTP integration tests

Tests in `http/` use Playwright and execute real HTTP requests against the running Nuxt server.

They verify the HTTP boundary: routing, request validation, response status, headers, serialization, and error responses.

Use stable `TMDB-INT-…` identifiers in test titles, for example `TMDB-INT-001`. Do not reuse an identifier after removing or replacing the test it identified.

## TMDb route integration tests

Tests in `tmdb/` use Vitest and exercise a Nitro route handler together with its schema, service, mapper, and controlled TMDb transport.

Mock the external TMDb transport, not internal application modules. Use the `.spec.ts` suffix and begin each test with a coverage intent comment:

- `// Statement coverage: ...`
- `// Branch coverage: ...`

## Future end-to-end tests

Browser-based end-to-end tests belong in `tests/e2e`.

They verify user journeys through the application. A user journey receives a stable identifier, for example `SEARCH-001`. Each acceptance criterion receives its own test identifier, for example `SEARCH-001-AC1`.

Do not reuse an identifier after removing or replacing the test it identified.
