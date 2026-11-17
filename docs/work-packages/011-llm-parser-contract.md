# LLM parser contract

## Specification

### Purpose and dependencies

Implement the parser boundary of the [product and search flow](000-product-and-search-flow.md): user input becomes validated proposals for the existing general search draft, not executable TMDb requests.

Reuse [WP 009](009-search-state-and-filter-catalog.md) state/transitions and [WP 010](010-clarification-and-guardrails.md) clarification/guardrails. Implementation order is WP 011 → [WP 014](014-entity-resolution.md) → [WP 012](012-search-execution-and-discover.md). Package numbers remain unchanged.

### Scope

- Define validated parser input/output for supported filter changes and unresolved person/keyword queries. The parser proposes changes; the application owns validation and mutation.
- Extract requested media type and single/multiple person or keyword wishes. Preserve common acting participation for people joined by AND; do not reinterpret it as crew work or appearances as oneself. TV-person intent remains valid even though its execution differs from Movie.
- For a new request, use the application default permitting movies and series when media type is absent. For follow-ups, preserve the current media type unless explicitly changed. Missing criteria are not instructions to clear existing wishes.
- Distinguish supported additions, replacements and removals. Application-owned references identify existing targets; the model must not invent references, provider IDs, authoritative revisions or search authorization. Ambiguous targets require clarification.
- Validate output before applying any changes. Technical parser failures and unsupported or ambiguous interpretations must not silently erase wishes or execute a partial search.

### Existing state and application boundary

- Reuse `SearchState`, accepted ID/name records and referenced pending requests in `src/lib/schemas/search-state.ts`. Do not create a second editable draft or synchronize separate Movie/TV states.
- Map parser proposals explicitly to supported `PendingQueryCommandSchema` operations in `src/lib/schemas/search-transition.ts` and supported filter intents. The application supplies references and expected revisions.
- Apply pending changes through `applyPendingQueryCommand()` and filter changes through `applyIntent()`. Do not mutate accepted people through chat filter fields or bypass trusted identity acceptance.
- Preserve unrelated criteria, pending requests, accepted replacement sources and inactive genre wishes. Use existing compatibility transitions for media changes rather than reconstructing partial state.
- Define mixed filter/entity application and coupled replacement behavior before implementation. Independent valid changes may proceed only when unresolved related work remains represented; coupled changes must not become partial replacements.
- Reuse application-supplied catalogs and existing limits. Do not infer new product filters from the full TMDb parameter catalog.
- Specify the smallest necessary temporary clarification context for concrete unsupported cases. Do not introduce a general continuation framework, store or registry without demonstrated need and separate approval.

### Inputs and outputs

Inputs: current user text, relevant existing search state, application-supplied catalogs and trusted request association.

Outputs: validated proposals, explicit clarification/unsupported information and a controlled application result for the same general draft. Output is neither a complete replacement state nor a provider query.

### Out of scope

- Live person/keyword identity lookup and candidate enrichment: WP 014.
- Movie/TV request mapping, TV-credit execution helpers, readiness/confirmation and result retrieval: WP 012.
- UI rendering, persistence, provider credentials, automatic model retries and autonomous tool loops.
- A production model/HTTP integration without its own approved implementation scope.

### Implementation tasks and acceptance criteria

- Inspect current schemas, instructions, transitions, callers and tests before proposing file changes. Record concrete keep/adapt/merge/remove decisions.
- Define a minimal parser contract and pure application adapter with explicit validation/failure behavior. Reuse schemas where responsibilities match; do not duplicate state contracts.
- Test supported extraction, absent-field preservation, media changes, multiple-person AND intent, target ambiguity, stale associations and mixed changes using synthetic fixtures.
- Test that accepted people, unrelated pending work and inactive genres survive relevant changes, and that parser output cannot invent accepted identities or start a search.
- Adapt or remove obsolete tests only with the affected interface and preserve required behavior coverage. Update callers and documentation together.
- Run tests, coverage, ESLint and typecheck for implementation changes; report actual commands and results.

## Execution status

### Current status

- In progress. The minimal proposal/application slice and the four parser-boundary steps below are implemented and locally reported green. WP 011 as a whole is not complete or finally accepted. WP 009 and WP 010 remain the completed foundation.
- Product direction and specification were aligned on 2026-11-17. Targeted file-level inspection and approval preceded implementation; this is not an exhaustive repository-wide reference inventory.

### Implemented foundation and scenario

- `2ffdfee`: added `src/lib/schemas/parser-proposal.ts`, `src/lib/domain/search/apply-parser-proposal.ts` and their schema/domain unit tests. Existing state schemas and domain transitions remained unchanged. The user explicitly confirmed tests, coverage checking, ESLint and typecheck green on 2026-11-17.
- The proposal contract supports typed filter edits, unresolved person/keyword additions and explicit clarification/unsupported outcomes. Model-owned authority fields and accepted person/keyword IDs are rejected. Genre membership is checked against application-supplied catalogs during application.
- `applyParserProposal()` uses real `applyIntent()` and `applyPendingQueryCommand()` transitions on a private working state. Expected revision and fresh-reference bindings are checked; rejection exposes no intermediate state. Each effective internal transition retains its existing revision increment, so a mixed proposal may advance revision more than once.
- `2affa9d`: added `tests/unit/domain/search/parser-proposal-scenario.spec.ts`, composing an initial synthetic proposal with a TV-only follow-up. Genre, year, rating and the stable pending-person reference are preserved; no person identity is invented. The user reported tests, typecheck and lint successful for that step. Coverage was not separately confirmed in that initial report; subsequent full-suite green reports are recorded below without inventing a historical percentage.

### Four parser-boundary steps

1. `924bda4` — input and fixed instructions: added `src/lib/parser/instructions.ts`, `build-parser-input.ts` and `tests/unit/parser/build-parser-input.spec.ts`. Instructions version `1.0.0`, projected context and original user text remain separate. Context capabilities follow the proposal contract, not unrestricted technical filter fields. Internal request references/revisions, unnecessary outer fields, credentials and histories are not forwarded. The caller still establishes trusted state/catalog provenance and completeness.
2. `83da325` — JSON Schema export: added `src/lib/parser/create-parser-proposal-json-schema.ts` and its tests. The draft-2020-12 input schema is derived directly from `ParserProposalSchema` using Zod input mode, without changing the existing contract or replacing transformations with unconstrained schemas. Runtime trimming, genre normalization and domain checks still require local validation/application. No model-provider Structured Outputs compatibility is certified.
3. `319fe4b` — response validation: added `src/lib/parser/validate-parser-response.ts` and its tests. Non-text input, invalid JSON and invalid proposals have distinct sanitized failures. Valid clarification/unsupported results remain semantic outcomes. No Markdown extraction, JSON repair, logging, retry or state mutation is performed. Transport success, completion/refusal metadata and source association are separate caller obligations.
4. `dd1f4da` — composition: added `tests/unit/parser/parser-flow.spec.ts`. Real input preparation, schema export, JSON-response validation and domain application are exercised with a scripted model double. The initial request and TV-only follow-up preserve the complete supported wish. Additional cases reject a schema-valid unknown genre and a reply whose original source revision became stale. Only the external model boundary is substituted; internal collaborators remain real.

The composition is a deterministic test, not a production caller, real natural-language extraction, provider enforcement of JSON Schema, HTTP integration or a live-LLM quality/security evaluation. Separate data fields and instruction-like test strings do not prove prompt-injection resistance of a future model integration.

### Validation report

- On 2026-11-17 the user explicitly confirmed all agreed checks green for `924bda4`. Subsequent reports for `83da325`, `319fe4b` and `dd1f4da` used the established shorthand that all tests are in order, covering tests, coverage checking, ESLint and typecheck.
- The latest complete user-reported green implementation state is `dd1f4da`. No exact coverage percentage, command logs, independently verified local HEAD or CI certification was supplied. The assistant did not execute these checks.
- Earlier validation reports apply to their historical implementation scope; they are not independent checks of later changes. This documentation update introduces no new executable validation result.

### Handoff to WP 014

- On 2026-11-17, work proceeded to the initial inventory and design phase of [WP 014](014-entity-resolution.md), using the implemented parser proposal/application contracts and referenced pending requests.
- This handoff does not constitute completion or final acceptance of WP 011, approval of a WP 014 implementation, or readiness for productive end-to-end integration. The remaining WP 011 operation/clarification requirements and integration responsibilities remain open as listed below.
- Provider search completeness and pagination gaps identified during the WP 014 inventory are tracked in that package, not as parser-contract defects.

### Remaining scope and limitations

- Entity additions only in the current proposal/application path. Entity replacement, refinement/removal routing and coupled multi-entity changes are not integrated. Clarification/unsupported proposals remain wholly unapplied with their parsed proposal retained. New incompatible genre assignments are blocked and retained rather than substituted. These limits do not remove broader specification requirements.
- Before resuming implementation in WP 011, select and approve the next concrete operation/clarification slice and any demonstrated domain-contract extensions. Do not introduce a general coordinator, duplicate state, store or registry merely to expand the flow.
- Model/provider selection and productive invocation remain unimplemented and require separate approval, including provider schema capability, complete-response/refusal/transport handling and safe separation of instruction/data roles.
- Trusted original-request association, reference allocation, response consumption and caller-side lifecycle/atomic adoption remain integration responsibilities. Expected-revision checks and a scripted stale-response test alone are not end-to-end replay protection.
- No production parser caller, model/HTTP endpoint, identity-resolution implementation, Movie/TV execution, persistence, UI or automatic search has been introduced. Live identity resolution remains WP 014; confirmed result execution remains WP 012.
- This update changes only Execution status; Specification is unchanged. No runtime files, schemas or tests changed and no validation commands were run by the assistant for this documentation update.
