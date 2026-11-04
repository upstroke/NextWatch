# NextWatch Studio — AI development rules

## Purpose

NextWatch is a controlled search application. The LLM proposes structured filter changes; the application validates and executes them.

## Non-negotiables

- Do not create autonomous search or recommendation agents.
- Do not expose TMDb credentials to the client.
- Do not call TMDb directly from browser code.
- Do not apply unvalidated LLM output to search state.
- Do not guess TMDb keyword IDs.
- Do not store real user conversations permanently.
- Do not push, merge or deploy without explicit user approval.

## Contract rules

- Zod schemas are the source of truth for runtime validation.
- TypeScript data-contract types are derived with `z.infer`.
- Validate LLM output before changing state.
- Validate TMDb responses at the server boundary.
- Search state changes only through validated, domain-approved changes.

## Architecture and testability

Read specs/architecture/001-service-boundaries.md before changing API or state code.

- Components render UI; composables call our API and manage UI execution state.
- Browser code must never import server modules or know TMDb credentials.
- Nitro routes adapt HTTP input/output; do not add mapping or domain rules there.
- Inject HTTP dependencies into services; no hidden network or runtime-config access in domain code.
- Separate HTTP transport, raw response schemas, pure mappers and use-case orchestration.
- Keep media-domain rules framework-independent and pure where possible.
- Keep language and provider region separate.
- Distinguish valid empty results, missing data and technical failures.
- Reject unexpected credential destinations and redirects in transport adapters.
- Do not log raw error objects, request headers, tokens or user conversations.
- Use synthetic fixtures; mock external boundaries, not every internal collaborator.
- Test schema/mapping/domain behavior in units, orchestration with injected transport, and real HTTP status/response contracts in integration tests.
- A service test is not an HTTP integration test.
- Include unimported application modules in coverage; do not hide files merely to improve percentages.
- No speculative framework layers or unused files.
- Preserve existing callers during refactoring or update every caller and its tests together.

## Workflow

1. Define the task.
2. Read the relevant specification, schemas and tests.
3. Create a plan with affected files.
4. Obtain user approval.
5. Implement only the approved scope, test-first where executable.
6. Run automated validation; report commands not run honestly.
7. Review against specifications and guardrails.
8. Obtain user approval before committing or opening a pull request.
