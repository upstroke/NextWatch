# NextWatch Studio — AI development rules

## Purpose and project status

NextWatch is a controlled search application. The LLM proposes structured changes to one general draft; the application validates, resolves and executes them. [Product and search flow](docs/work-packages/000-product-and-search-flow.md) is authoritative. Reuse `SearchState` and derive Movie/TV requests; do not maintain duplicate editable searches.

- WP 008–010 are completed and merged. Existing domain/clarification contracts are the foundation, not a requirement to retain every abstraction unchanged.
- On 2026-11-17 the user confirmed all previously outstanding pre-WP-011 validation successful, including tests, coverage, ESLint and typecheck. This is user-reported history, not an assistant-run check or validation of later changes. No fresh numeric coverage was supplied.
- WP 009's complete repository-wide reference inventory remains an accepted non-blocking follow-up. Successful checks and scoped documentation cleanup do not complete it.
- Product direction and WP 011/014/012 documentation are aligned. README and the reviewed adjacent documentation have been reconciled; do not claim an exhaustive repository audit.
- Next: inspect current code/tests and propose a file-level plan for [WP 011](docs/work-packages/011-llm-parser-contract.md), then [WP 014](docs/work-packages/014-entity-resolution.md), then [WP 012](docs/work-packages/012-search-execution-and-discover.md).
- WP 011 owns parser proposals/application, WP 014 identity resolution, WP 012 explicit execution confirmation, request mapping, TV-person helpers and results. WP 010 supplies clarification/guardrails. Credits are execution data, not identity acceptance or another permanent criteria store.
- UI and production parser/resolution/search integration remain pending. Documentation approval does not authorize runtime/schema/test changes, deletions, provider/model calls or new frameworks.

## Non-negotiables

- No autonomous search/recommendation agents or model-tool loops.
- No TMDb credentials or direct TMDb calls in the browser; no browser imports of server modules.
- No unvalidated LLM changes or guessed provider/keyword IDs.
- No permanent storage of real conversations.
- No push, PR, merge or deploy without explicit applicable approval.

## Contracts and architecture

Follow [Typing](docs/typing.md) and read the active package/references before API/state changes.

- Validate LLM input/output and provider responses at their boundaries; state changes only through validated domain-approved operations. Derive contract types from Zod.
- Use simple readable functions, data and composition; no clever abstractions, speculative layers or unused files. Use OOP only for a concrete need.
- Keep decisions separate from effects and dependencies explicit. Inject service transports; no hidden network/runtime-config access in pure domain code.
- Components render UI; composables call our API and manage execution state. Nitro routes adapt HTTP and compose dependencies, not domain/request-mapping rules.
- Separate transport, raw schemas, pure mappers and use-case execution. Keep domain/services framework-independent where appropriate.
- Media changes use existing domain/genre transitions; derive requests instead of synchronizing mutable Movie/TV objects. Accepted identities survive applicable switches.
- Add temporary context, stores or registries only for demonstrated needs with separate approval.
- Keep language and provider region separate. Distinguish valid emptiness, missing/incomplete data and technical failure.
- Reject unexpected credential destinations and redirects. Never log raw errors, headers, tokens or user conversations.
- Document every exported function/method with concise TSDoc-compatible JSDoc immediately above it. Explain parameters/returns when not self-evident. Document locals only for non-obvious contracts; keep comments synchronized rather than restating code.

## Testing and cleanup

[Testing](docs/testing.md) defines commands, locations, coverage and intent comments.

- Use synthetic reusable fixtures and existing mocks. Mock external boundaries, not the unit under test or every internal collaborator.
- Test application behavior, project-specific schema transforms/cross-field rules and error mapping, not framework/Zod standard behavior.
- Test a decision where owned; do not duplicate identical error/HTTP validation checks across layers without distinct behavior.
- Unit-test pure rules/mappings, exercise orchestration with injected transport, and use real HTTP integration for HTTP status/serialization contracts. Service/direct-handler tests are not HTTP integration tests.
- Guidance does not authorize starting new HTTP/browser tests or live provider work.
- Include unimported application modules in coverage; never hide files to improve percentages.
- Inventory affected code, contracts, callers, tests and docs as keep/adapt/merge/remove. Preserve callers or update all affected callers/tests together.
- Retire obsolete interfaces and their implementation-specific tests together only after preserving required behavior coverage. Do not delete failures to get green.
- Keep schemas with distinct responsibilities and consolidate redundancy only with all affected uses accounted for.

## Workflow and evidence

1. Establish target branch/commit and task. Read files directly at an explicit ref, not silently on the default branch.
2. Inspect relevant specifications, schemas, code and tests. An incomplete index/search is not evidence of absence.
3. Propose affected files and obtain implementation approval. No new package, configuration or framework without separate agreement.
4. Implement only approved scope, test-first where executable.
5. Run validation and report actual commands/results. Green means tests, coverage, ESLint and typecheck. When local results matter, request current user results; never report those as assistant-executed checks.
6. Review requirements/guardrails and obtain approval before commit/PR.

Remote inspection does not establish local working-tree cleanliness or unpushed changes. Correct only concrete findings within scope. Preserve the distinction between verified facts, assumptions, plans, historical reports and current validation.

## Communication and documentation

- Keep replies concise; no full code/file contents unless requested, except required write-approval previews. Report changes, checks not run and limitations honestly.
- README is an evolving concise entry point. Link authoritative shared rules instead of duplicating them. Add agent-specific configuration only for an agreed need.
- Work packages live in `docs/work-packages/` with `## Specification` and `## Execution status`. Keep current status distinct from historical evidence and planned behavior.
- Document current direction without references to other branches or a parallel migration narrative. Do not create a competing concept document.
- Before removing superseded documents, preserve valid decisions and check references. Retained historical entry points may link the authoritative document instead of duplicating it.
- Every GitHub write needs explicit approval of its exact target/content. Branch creation does not approve commits, PRs or merges.
