# 001a — Project foundation

## Specification

### Goal

Establish the controlled project foundation for NextWatch Studio.

### Scope

- Nuxt 4, Vue 3, TypeScript and Nitro
- Nuxt UI application shell
- pnpm scripts for development, build, test, lint, format and type checking
- Zod-first contracts for search filters, TMDb responses and chat intents
- Initial Vitest coverage for the search-filter contract
- Studio documentation and task structure

### Out of scope

- TMDb service implementation
- Ollama or Qwen integration
- Natural-language parsing
- Filter pills and result grid
- Detail pages
- Review summarization and similar titles

### Acceptance criteria

- `pnpm install` succeeds.
- `pnpm dev` starts the Nuxt application.
- `pnpm test` runs the initial schema tests.
- `pnpm lint` and `pnpm typecheck` are configured.
- TypeScript types are derived from Zod schemas with `z.infer`.
- No TMDb credentials are committed.

## Execution status

### Status

Completed.

### Implemented

- Initial NextWatch Studio repository foundation.
- Project configuration and Nuxt application shell.
- Zod contract layer with TypeScript types derived through `z.infer`.
- Initial schema tests.
- Linting, formatting and type checking configuration.
- Studio documentation and task structure.

### Constraints

- Use pnpm.
- Use strict TypeScript.
- Use Zod as the single source of truth for runtime contracts.
- Keep TMDb credentials server-side only.
- Do not implement TMDb or LLM behavior in this work package.
