# NextWatch Studio

NextWatch is a local reference application for natural-language film and TV discovery.

The LLM acts only as a controlled semantic parser: it proposes validated filter changes. The application owns validation, domain rules, TMDb requests, results, pagination and user feedback.

## Stack

- Nuxt 4, Vue 3 and TypeScript
- Nitro server routes
- Nuxt UI
- Zod-first contracts
- Pinia for domain state where required
- Vitest and Playwright
- ESLint and Prettier
- pnpm

## Getting started

```bash
pnpm install
pnpm dev
```

Copy `.env.example` to `.env` and add your own TMDb credentials. TMDb requests must remain server-side.

Set `NUXT_APP_DEFAULT_LOCALE` to control the default language used for TMDb content requests. Supported values are `en` and `de`; when the variable is absent or invalid, the application falls back to `en`.

## Scripts

```bash
pnpm dev
pnpm build
pnpm test
pnpm test:e2e
pnpm lint
pnpm format
pnpm typecheck
```

## Current scope

The foundation includes project configuration, Zod contracts and server-side TMDb support for Trending, Discover Movie and Discover TV. TMDb transport, response validation, mapping and error handling are separated. Errors are created through `createTmdbError`, with a derived error type and a private WeakSet-based guard.

Unit tests and direct handler tests use shared handler mocks and synthetic raw TMDb fixtures. Direct handler tests do not start a Nuxt/Nitro server and are not HTTP integration tests.

The application UI has not yet been built. UI fallback behavior for missing content is being discussed, not implemented. Further UI, Ollama and HTTP integration-test work require separately agreed tasks.

## Contracts and typing

Zod schemas are the source of truth for validated external data contracts and runtime validation. For all typing conventions, including internal functions, shared type locations and type assertions, see [Typing](docs/typing.md).

## Documentation and collaboration

This README is a concise, evolving entry point, not a complete project specification. Update it when the implemented scope or setup changes.

- [Typing](docs/typing.md): authoritative TypeScript and Zod typing conventions.
- [AI development rules and working agreement](AGENTS.md): shared architecture, contract, testing and approval rules.

Keep shared rules in one place and link to them rather than duplicating them. Decide on additional documentation structure or coding-agent-specific configuration when a concrete need arises.
