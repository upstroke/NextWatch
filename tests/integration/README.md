# Integration tests

Tests that exercise route handlers together with schemas, services, mappers, and controlled external boundaries.

## Structure

```text
integration/
└── tmdb/          # TMDb-backed Nitro route tests
```

## Conventions

- Use the `.spec.ts` suffix.
- Mock the external TMDb transport, not internal application modules.
- Verify the HTTP boundary, validation, service orchestration, mapping, and response behavior.
- Start each test with a coverage intent comment:
  - `// Statement coverage: ...`
  - `// Branch coverage: ...`

## HTTP integration test identifiers

HTTP integration tests in `tests/http` use stable `TMDB-INT-…` identifiers, for example `TMDB-INT-001`.

These identifiers support technical traceability and selective execution. Do not reuse an identifier after removing or replacing the test it identified.
