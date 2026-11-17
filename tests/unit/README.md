# Unit tests

Unit tests cover project-specific schemas, pure domain behavior, services, parameters, mappers, direct handlers and utilities.

See [Testing](../../docs/testing.md) for authoritative boundaries, locations, fixtures, coverage-intent comments and validation commands. Shared development rules live in [AGENTS.md](../../AGENTS.md).

Current subdirectories include `domain`, `schemas`, `services`, `utils`, `api` and `handlers`. Direct-handler tests do not start a Nuxt/Nitro server and are not HTTP integration tests.

Use the `.spec.ts` suffix and deterministic fixtures. Test observable behavior, retaining real internal domain transitions where appropriate and mocking external boundaries.
