# NextWatch Studio — AI development rules

## Purpose

NextWatch is a controlled search application. The LLM proposes structured filter changes; the application validates and executes them.

## Current project status

- The active work package is
  [WP 011 — LLM parser contract](docs/work-packages/011-llm-parser-contract.md).
- The working branch is `feat/011-llm-parser-contract`.
- WP 010 is complete in its accepted clarification/guardrail contract and
  domain scope. Do not reopen it or treat later UI, live resolution or search
  execution as unfinished WP 010 implementation.
- WP 011 decisions are recorded in its work-package specification. Read that
  file before continuing; do not reconstruct settled decisions from chat memory.
- WP 011 is in incrementally approved implementation and remains incomplete.
  The [implementation plan](tasks/011-llm-parser-contract-plan.md) is a technical
  design reference, not blanket approval of all proposed work or closure of
  outstanding review gates. Saving or updating a plan does not authorize a
  later code change, commit, pull request or merge.
- Read the [implementation progress ledger](tasks/011-llm-parser-contract-progress.md)
  for implemented slices, user-reported validation and remaining work. Keep
  detailed commit/check history there rather than duplicating it in this file.
- The [continuation binding plan](tasks/011-parser-continuation-binding-plan.md)
  specifies binding lifetime, ownership, discriminated inputs/outcomes and
  validation precedence. Binding foundation primitives are implemented and
  locally reported green by the user; this is not complete runtime integration
  or assistant-executed validation. See the ledger for the validated baseline.
- Registry reconciliation is implemented in `processParserContinuationCommand()`
  with application tests in `f6d9db2`. A required fifth argument supplies the
  trusted expected session reference and stored registry. Applied edits return
  state, continuation, person session and reconciled registry together, with
  query invalidations and retired binding references. Rejected/no-op edits
  do not reconcile or expose partial stores. No binding/question is issued
  and no lookup, retry or search starts automatically.
- `processBoundPersonClarificationAction()` and its unit suite were added in
  `fa026dc`. The function processes bound canonical person refine/navigation/
  discard actions, cleans discarded canonical continuation links, consumes the
  question binding against the pre-state and reconciles remaining bindings
  against the post-state. Complete proposals distinguish consumed and retired
  bindings; rejected results expose no partial stores. Identity selection is
  excluded and follow-up data does not authorize or start another lookup.
- `ab704c3` added `BoundPersonRefinementRequestSchema`,
  `processBoundPersonRefinement()` and its unit suite. This alternative path
  validates one parser-proposed canonical person refinement against the trusted
  original submission/invocation and still-live question binding. It must not
  follow prior consumption by the deferred action path. Query edits reuse the
  existing transitions; successful proposals close the question and return all
  four stores with consumption, retirement and invalidation facts. A query no-op
  still completes the answer but preserves revision/generation (`queryChanged: false`).
- On 2026-11-17 the user confirmed all tests passing for `ab704c3`, after the
  earlier test report for `fa026dc`. Fresh typecheck, ESLint and coverage results
  for this latest code remain unreported. Older checks must not be carried forward
  as current proof. The assistant did not execute validation commands; see the
  ledger for historical evidence and open checks.
- Deferred follow-up coordination, candidate continuation, resolution-result/
  identity-selection integration, owned-target questions, result staging and full
  pause/resume remain later scoped work. The refinement function is not wired
  into productive callers. Trusted request loading, processing locks, persistence,
  concurrency control and complete invocation lifetime enforcement remain caller/
  runtime obligations, not capabilities established by the pure proposal.
  WP 011 is not complete or ready for an implicit merge.
- Before each further implementation slice, complete the relevant targeted
  caller/test inventory and concrete schema/adapter design gates. Do not claim
  all historical plan gates or repository-wide inventories are complete. Reuse
  WP 009 state, pending operations and controlled person acceptance, and WP 010
  clarification and guardrails. Do not introduce a competing state model.
- Document existing behavior with file references and distinguish between
  available, partially available, missing and contradictory capabilities.
- WP 011 owns parser extraction contracts and the pure application adapter,
  and directly necessary approved schema/domain extensions. Live person/keyword
  resolution belongs to WP 014;
  title-search execution belongs to WP 012; title disambiguation and providers
  remain in WP 013. Dependency order is WP 011 → WP 014 → WP 012.
- On 2026-11-17 the user withdrew the planned person-limit constant migration.
  Keep `MAX_PERSON_IDS` and `MAX_PERSON_CLARIFICATION_CANDIDATES` independent:
  search-state capacity and offered candidate-group size are different limits,
  currently both five. Keep `MAX_PERSON_CLARIFICATION_KNOWN_TITLES` at two.
  This is a withdrawn task, not a completed migration or reference inventory.
  See the decision supplement, section 6; do not revive the historical migration plan.
- Candidate/clarification context remains separate from accepted criteria.
  Independently accepted criteria changes do not execute a title search.
  Execution requires explicit “Search now” confirmation; preserve the distinction
  between edited criteria and the last executed search/results.
- The wizard UI is deferred to
  [tasks/clarificaton-wizzard-flow.md](tasks/clarificaton-wizzard-flow.md).
  WP 011 does not authorize UI rendering, live provider lookups, retry
  orchestration, search execution or a full LLM/provider implementation.
- Cross-package documentation and wizard-task alignment remain follow-ups.
  The WP 011 specification already links to its implementation plan; do not
  treat that backlink as missing. This status update does not claim downstream
  documents were updated or their implementation work completed.
- Work package 009 is completed by explicit user acceptance on 2026-11-15
  and merged into `main` through PR #11 in commit
  `61928e6fa9a4daeb7dbcdd44de34a04152d0715b`.
- WP 009 was accepted with a complete repository-wide reference inventory
  still outstanding as a documented, non-blocking follow-up. Do not claim
  that inventory was completed or that all possible references were ruled out.
- Work package 008 is completed by user acceptance and merged into `main`
  in commit `05c45d86430acb2e62e7395df8848de5ce8ed095`.
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
