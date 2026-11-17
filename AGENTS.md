# NextWatch Studio — AI development rules

## Purpose

NextWatch is a controlled search application. The LLM proposes structured changes to one general search draft; the application validates, resolves and executes them.

The authoritative product direction is [Product and search flow](docs/work-packages/000-product-and-search-flow.md). Reuse the existing `SearchState`; derive Movie/TV requests instead of maintaining separate editable search objects. Keep provider-specific work in focused server-side helpers.

## Current project status

- WP 009 and WP 010 are completed and merged. Their existing state, transitions, clarification and guardrail contracts are the implementation foundation, not a requirement to retain every abstraction unchanged.
- WP 009 was accepted with a complete repository-wide reference inventory still outstanding as a documented, non-blocking follow-up. Do not claim that inventory was completed or that all possible references were ruled out.
- WP 008 is completed and merged.
- The current task is documentation alignment with the unified search-draft direction. This does not authorize runtime changes, file deletions, provider calls, UI work or an implementation plan by itself.
- The next implementation package is [WP 011](docs/work-packages/011-llm-parser-contract.md), followed by [WP 014](docs/work-packages/014-entity-resolution.md), then [WP 012](docs/work-packages/012-search-execution-and-discover.md). Keep existing package numbers.
- WP 011 owns validated parser extraction and application to the existing draft. WP 014 owns live person/keyword identity resolution. WP 012 owns execution readiness, explicit search confirmation, technical Movie/TV mapping, TV-person execution helpers and result handling. WP 010 supplies existing clarification and guardrails.
- Person identity resolution is not TV-credit retrieval. Accepted identity belongs in the draft; credits are execution data, not a second persisted criteria collection.
- Movie, TV and both use the same draft. Apply existing media/genre transitions and derive the relevant request shapes; do not introduce a general matcher that synchronizes two mutable search objects.
- Before implementation, inspect affected code, callers, schemas, tests and documents. Classify concrete items as keep, adapt, merge or remove. Preserve required behavior rather than obsolete implementation structure.
- Detailed work-package and entry-document alignment is still pending after the initial product-document update. Do not present the direction as implemented or all documentation as reconciled.
- Prepare a file-level implementation plan and obtain approval before changing runtime code, schemas or tests. No speculative framework, store or registry is authorized.

## Non-negotiables

- Do not create autonomous search or recommendation agents.
- Do not expose TMDb credentials to the client.
- Do not call TMDb directly from browser code.
- Do not apply unvalidated LLM output to search state.
- Do not guess TMDb keyword IDs.
- Do not store real user conversations permanently.
- Do not push, merge or deploy without explicit user approval.

## Contract rules

- Follow [Typing](docs/typing.md) for all TypeScript and Zod typing conventions.
- Validate LLM output before changing state.
- Validate TMDb responses at the server boundary.
- Search state changes only through validated, domain-approved changes.

## Architecture and testability

Read the active work package and its referenced specifications before changing API or state code.

- Keep code simple, readable and easy to follow. Prefer direct, explicit solutions over clever, dense or hard-to-understand abstractions.
- Structure code for straightforward testing: separate decisions from side effects and keep dependencies explicit.
- Do not use object-oriented patterns unless they solve a concrete need. Prefer plain functions, data and composition.
- Document every exported function and method with a concise TSDoc/JSDoc comment directly above its declaration. Describe behavior, parameters and return values where they are not self-evident.
- Document local functions only when their purpose or contract is not immediately clear. Keep documentation synchronized with behavior; do not restate obvious implementation details.
- Use TSDoc-compatible JSDoc comments so documentation can later be generated automatically.
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
- Test application behavior, not Zod or framework standard behavior.
- Keep schema tests focused on happy paths, project-specific transforms, cross-field rules, and error mapping.
- Do not duplicate HTTP validation paths in direct handler tests when an HTTP integration test already covers the same contract.
- Test an error path in the layer that decides it; do not repeat the same error classification across schema, service, handler, and integration tests.
- Test schema/mapping/domain behavior in units, orchestration with injected transport, and real HTTP status/response contracts in integration tests.
- A service test is not an HTTP integration test.
- Direct handler tests that do not start a Nuxt/Nitro server are not HTTP integration tests.
- Test-layer guidance does not authorize new work: do not start or prepare integration tests unless the current task explicitly includes them.
- Include unimported application modules in coverage; do not hide files merely to improve percentages.
- No speculative framework layers or unused files.
- Preserve existing callers during refactoring or update every caller and its tests together.
- Remove obsolete tests with retired interfaces only after checking that required behavior remains covered. Do not remove failing tests merely to make checks pass.
- Keep schemas with distinct validated responsibilities; merge redundant contracts only with all affected callers and tests accounted for.

## Workflow

1. Establish the active work package and current repository state before proposing implementation work.
2. Define the task.
3. Read the relevant specification, schemas and tests.
4. Create a plan with affected files.
5. Obtain user approval.
6. Implement only the approved scope, test-first where executable.
7. Run automated validation; report commands not run honestly. For implementation changes, green means tests, coverage, ESLint and typecheck.
8. Review against specifications and guardrails.
9. Obtain user approval before committing or opening a pull request.

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
- Keep the README as an evolving entry point with current setup and implemented scope. Keep shared development rules in one authoritative document and link to it rather than duplicating rules.
- Work packages live in `docs/work-packages/`. Each work-package file contains a stable `## Specification` section and a current `## Execution status` section. Update the execution status as implementation progresses.
- Link to the authoritative documentation rather than duplicating rules. Add specialized coding-agent configuration only for an agreed need, referencing these shared rules.
- Document the current direction without references to other branches or a parallel migration narrative. Do not create a competing concept document.
- Remove or consolidate superseded documentation only after preserving still-valid decisions and checking references. No blanket deletion is authorized by the direction change.
- Obtain explicit approval for each GitHub write action with its exact target and content. Approval to create a branch is not approval to commit, open a pull request or merge.
