# Testing

Vitest covers framework-free domain behavior, schemas, services and direct route-handler compositions. Playwright covers real HTTP integration against a running Nuxt server and future browser journeys. A direct handler test is not an HTTP integration test.

The implemented scope includes search-state transitions, pending operations, genre compatibility, clarification/guardrails and TMDb validation, mapping and error handling. Production parser/resolution/search integration remains planned.

## Commands

```bash
pnpm test
pnpm test:watch
pnpm test:coverage
pnpm test:e2e
pnpm lint
pnpm typecheck
```

For implementation changes, green means tests, coverage, ESLint and typecheck. On 2026-11-17 the user confirmed that previously outstanding checks before WP 011 were successful. This supersedes older pending-validation descriptions for that historical scope. It is not a new assistant-run test or CI result, and no fresh numeric coverage percentage was supplied.

## Architecture and test boundaries

Follow [AI development rules](../AGENTS.md) for shared architecture and testability rules and [Typing](typing.md) for contracts.

- `src/lib` contains framework-free schemas and domain logic.
- `server/services` contains framework-free services, transport contracts and pure mappings.
- `server/utils` contains framework-specific helpers.
- `server/api` adapts the HTTP boundary and composes dependencies.
- Use synthetic fixtures and mock external boundaries, not the module under test or every internal collaborator.
- Verify application behavior, transforms, cross-field rules and error mapping rather than Zod/framework standard behavior.

## Locations

| Location | Boundary and focus |
| --- | --- |
| `tests/unit/domain` | Pure state, compatibility, clarification and guardrail behavior |
| `tests/unit/schemas` | Project-specific contract behavior |
| `tests/unit/services` | Services, mapping, parameters and controlled errors |
| `tests/unit/utils` | Framework-specific helpers |
| `tests/unit/api`, `tests/unit/handlers` | Existing direct-handler tests; not real HTTP integration |
| `tests/integration/tmdb` | Controlled route/service composition using Vitest; real HTTP is not implied |
| `tests/integration/http` | Playwright HTTP requests against a running Nuxt server |
| `tests/e2e` | Browser journeys when separately authorized |
| `tests/fixtures`, `tests/mocks` | Shared deterministic data and external doubles |

A service test is not an HTTP integration test. Test location alone does not prove a running HTTP server. Do not duplicate the same HTTP validation rule in handler and real HTTP suites without distinct behavior to verify. Keep tests at the layer that owns the decision.

## Test identifiers

- Unit tests need no stable ID; use coverage-intent comments.
- Integration tests use stable technical IDs such as `TMDB-INT-001`. HTTP integration tests require these IDs in their titles.
- Browser journeys use stable journey IDs such as `SEARCH-001`; each acceptance-criterion test has a unique ID such as `SEARCH-001-AC1`.
- Never reuse removed or replaced integration/E2E identifiers. Preserve the link to the behavior or acceptance criterion.

## Coverage

V8 coverage includes application code under `src/lib/**` and `server/**`, including unimported modules. The global hard threshold is 80% statements. Branch coverage is reported as an additional signal, not a separate hard threshold.

Place a coverage-intent comment immediately above every unit-test declaration, outside its callback. Use `// Statement coverage:` for an execution path and `// Branch coverage:` for a conditional path, error branch, fallback or boundary. A parameterized declaration needs one shared comment above it. HTTP integration tests do not require these unit-test comments.

## Imports

Use `@lib` for `src/lib`, `@server` for `server`, `@tests` for `tests`, `@test-mocks` for `tests/mocks` and `@test-fixtures` for `tests/fixtures`. Do not use Nuxt's `@` or `~` for shared/server code; they refer to the application source directory.

## Refactoring and scope

Tests protect required behavior, not retired implementation structure. Adapt/remove tests with their interfaces only after preserving needed coverage; do not remove failures or hide files to improve percentages. Update callers, fixtures and documentation with code.

No new HTTP/browser suite, live TMDb test or provider/model integration is authorized by this documentation. Keep automated tests deterministic; report actual commands separately from user-reported historical validation.
