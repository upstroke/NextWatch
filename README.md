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

## Scope

The initial foundation contains project configuration, Zod contracts and tests only. TMDb integration, Ollama integration, filter pills, search results and the detail page are implemented in later, separately reviewed tasks.
