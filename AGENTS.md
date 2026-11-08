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

- Zod schemas are the source of truth for validated data contracts and runtime validation.
- TypeScript data-contract types are derived with `z.infer`.
- Derive related field keys and dependent types from existing contracts; do not maintain parallel lists or duplicate data-contract definitions.
- This does not require a Zod schema for every internal function or implementation detail. Derive implementation-specific types from their existing source where appropriate, for example with `ReturnType`.
- For functions without a Zod contract, type only the parameters TypeScript cannot infer from context. Prefer inferred return types; add an explicit return type only for a public contract or when inference is unclear.
- Use a named `type` or `interface` only when a structure is reused, forms a public contract, or needs a distinct name. Do not create Zod schemas, interfaces or type aliases for every internal function.
- Store reusable TypeScript types in a dedicated, topic-based location. Use `src/types/` only for types shared across independent modules; keep feature- or domain-specific types close to their use.
- Do not create a central catch-all `types.ts` or an automatic barrel export for types.
- Do not duplicate a type that can be derived from an existing Zod contract.
- Prefer `type` for reusable TypeScript types. Use `interface` only when declaration merging or interface extension is intentionally required.
- Do not use `as` to suppress type errors or as a substitute for validation. Use Zod for external or untrusted data; use a type predicate only after a real runtime check.
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
- Reuse existing mocks and fixtures before introducing new ones.
- Test schema/mapping/domain behavior in units, orchestration with injected transport, and real HTTP status/response contracts in integration tests.
- A service test is not an HTTP integration test.
- Direct handler tests that do not start a Nuxt/Nitro server are not HTTP integration tests.
- Test-layer guidance does not authorize new work: do not start or prepare integration tests unless the current task explicitly includes them.
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

## Repository evidence and scope

- Establish the target branch and commit before reviewing repository code. Use an explicit ref or commit when reading files; do not silently inspect the default branch instead.
- Read relevant files directly on that target. An incomplete search or an index returning no matches is not proof that references or TODOs are absent.
- Distinguish verified findings from assumptions and unknown local state. Remote repository access does not establish local working-tree cleanliness or whether local commits are unpushed.
- When local validation matters, ask for the user's current results before proposing changes. Do not claim to have run tests based on the user's report.
- Make corrective changes only for a concrete finding within the approved task. Otherwise report the review outcome without speculative cleanup.
- Starting another work package, creating agent configurations or adding framework layers requires separate agreement.

## Communication and documentation

- Keep normal replies concise. Do not show code blocks or full file contents unless requested; required write-approval previews are an exception.
- Report what changed, what was checked, which commands actually ran and what remains unverified. Do not present plans as completed work.
- Keep the README as an evolving entry point with current setup and implemented scope. Keep shared development rules in this file and architecture decisions in the relevant specifications.
- Link to the authoritative documentation rather than duplicating rules. Add specialized coding-agent configuration only for an agreed need, referencing these shared rules.
- Obtain explicit approval for each GitHub write action with its exact target and content. Approval to create a branch is not approval to commit, open a pull request or merge.
