# Project foundation

## Status

Completed.

## Purpose

This concept documents the established foundation for NextWatch Studio.

NextWatch is a Nuxt 4 application built with Vue 3, TypeScript, Nitro, Nuxt UI, Vitest, Playwright, ESLint, Prettier and pnpm.

## Architecture

- `app/` contains the Vue application and UI.
- `server/` contains Nitro server routes, TMDb services and server-side helpers.
- `src/lib/` contains framework-free schemas, types and shared domain logic.
- `tests/` contains unit, integration, HTTP and end-to-end tests.
- `docs/` contains project documentation.
- `tasks/` contains active implementation tasks.

## Core rules

- Use pnpm.
- Use strict TypeScript.
- Use Zod as the single source of truth for runtime contracts.
- Derive TypeScript types from Zod schemas with `z.infer`.
- Keep TMDb credentials server-side only.
- Keep browser code independent from server code.
- Keep Nitro route handlers thin.
- Inject external transports into services.

## Scope of the foundation

The foundation establishes:

- The Nuxt application shell.
- Project configuration and scripts.
- Zod-first contracts.
- Initial schema tests.
- Linting, formatting and type checking.
- Documentation and task structure.

## Out of scope

The foundation does not implement:

- TMDb service behavior.
- Ollama or Qwen integration.
- Natural-language parsing.
- Filter pills.
- Result grid.
- Detail pages.
- Review summarization.
- Similar titles.

## Related documentation

- `docs/testing.md`
- `docs/typing.md`
- `docs/concepts/000-product-and-search-flow.md`
