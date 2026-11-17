# NextWatch Studio

NextWatch is a local reference application for natural-language film and TV discovery.

The LLM is a controlled semantic parser. It proposes structured changes to one general search draft; the application validates them, resolves identities, asks necessary questions and derives Movie/TV requests only after explicit search confirmation. This describes the target flow, not a completed end-to-end integration. See [Product and search flow](docs/work-packages/000-product-and-search-flow.md).

## Stack

- Nuxt 4, Vue 3 and TypeScript
- Nitro server routes and Nuxt UI
- Zod-first contracts
- Pinia where required; no additional store is implied by the search concept
- Vitest and Playwright
- ESLint, Prettier and pnpm

## Getting started

```bash
pnpm install
pnpm dev
```

Copy `.env.example` to `.env` and add your own TMDb credentials. TMDb requests remain server-side.

`NUXT_APP_DEFAULT_LOCALE` controls the default TMDb content language. Supported values are `en` and `de`; absent or invalid configuration falls back to `en`. Content language and provider region are distinct.

## Scripts

```bash
pnpm dev
pnpm build
pnpm test
pnpm test:coverage
pnpm test:e2e
pnpm lint
pnpm format
pnpm typecheck
```

## Implemented foundation

The foundation includes validated server-side TMDb services for Trending, Movie/TV Discover, search, details and watch providers. Transport, response validation, mapping and controlled error handling are separated.

WP 008–010 provide pure filter/state transitions, accepted people and referenced pending queries, genre compatibility, clarification/selection contracts and semantic guardrails. These are contract/domain capabilities, not a complete interactive search application.

Unit and direct handler tests use synthetic fixtures and injected external boundaries. Direct handler tests do not start a Nuxt/Nitro server and are not HTTP integration tests. See [Testing](docs/testing.md).

On 2026-11-17 the user confirmed that previously outstanding validation checks before WP 011 were successful, including tests, coverage, ESLint and typecheck. This is a user-reported historical result, not an assistant-run check of subsequent documentation changes.

## Next implementation

1. [WP 011](docs/work-packages/011-llm-parser-contract.md): validated parser proposals applied to the existing draft.
2. [WP 014](docs/work-packages/014-entity-resolution.md): server-side person/keyword identity resolution.
3. [WP 012](docs/work-packages/012-search-execution-and-discover.md): confirmed Movie/TV execution, focused TV-person helpers and common results.

The UI, production parser/resolution/execution connection and complete user flow are not implemented. A model connection, including Ollama, requires separately agreed implementation scope. Existing technical Discover support is not verified end-to-end TV-person search.

## Documentation and collaboration

- [Product and search flow](docs/work-packages/000-product-and-search-flow.md): authoritative product direction.
- [AI development rules](AGENTS.md): architecture, workflow and approval rules.
- [Typing](docs/typing.md): TypeScript and Zod conventions.
- [Testing](docs/testing.md): test boundaries, validation and coverage.

Keep this README concise and distinguish implemented behavior from plans. Link to authoritative documents rather than maintaining competing specifications.
