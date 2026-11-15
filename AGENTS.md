# NextWatch Studio — AI development rules

## Purpose

NextWatch is a controlled search application. The LLM proposes structured filter changes; the application validates and executes them.

## Current project status

- The active work package is
  `docs/work-packages/009-search-state-and-filter-catalog.md`.
- Work package 008 is completed by user acceptance and merged into `main`
  in commit `05c45d86430acb2e62e7395df8848de5ce8ed095`.
- The working branch for work package 009 is
  `feat/009-search-state-and-filter-catalog`, created from that `main` commit.
- Before implementing work package 009, perform a targeted read-only review
  of the existing search schemas, domain functions and tests on this branch.
  Reuse the completed work package 008 implementation; do not rebuild it.
- Document existing behavior with file references and distinguish between
  available, partially available, missing and contradictory capabilities.
- Read the work-package boundaries in work package 009. Pending entity-query
  state belongs to work package 009; parser fields and extraction belong to
  work package 011. Actual person/keyword resolution remains separately
  unassigned and is not part of work package 009.
- Prepare an implementation plan with affected files and obtain user approval
  before implementation. This status update does not approve that plan.
- The branch `feat/003-multi-step-search-orchestration` was discarded.
  Do not restore, reference or continue its architecture.
- Do not treat “Task 003a” as an official work package. It was only a
  temporary label for restarting the search-flow work.

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

## Workflow

1. Establish the active work package and current repository state before
   proposing implementation work.
2. Define the task.
3. Read the relevant specification, schemas and tests.
4. Create a plan with affected files.
5. Obtain user approval.
6. Implement only the approved scope, test-first where executable.
7. Run automated validation; report commands not run honestly.
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
- Obtain explicit approval for each GitHub write action with its exact target and content. Approval to create a branch is not approval to commit, open a pull request or merge.
