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

- In progress. The minimal proposal/application foundation, four parser-boundary steps and four pending-operation steps below are implemented and locally reported green through `9927559`. WP 011 as a whole is not complete or finally accepted. WP 009 and WP 010 remain the completed foundation.
- Product direction and specification were aligned on 2026-11-17. Targeted file-level inspection and approval preceded implementation; this is not an exhaustive repository-wide reference inventory.
- After an initial WP 014 inventory, active work returned to the open WP 011 requirements on 2026-11-17. Further WP 014 work is deferred while these requirements are addressed. Its recorded provider-search integration gap remains open in that package.

### Implemented foundation and scenario

- `2ffdfee`: added `src/lib/schemas/parser-proposal.ts`, `src/lib/domain/search/apply-parser-proposal.ts` and their schema/domain unit tests. Existing state schemas and domain transitions remained unchanged. The user explicitly confirmed tests, coverage checking, ESLint and typecheck green on 2026-11-17.
- The initial proposal contract supported typed filter edits, unresolved person/keyword additions and explicit clarification/unsupported outcomes. Model-owned authority fields and accepted person/keyword IDs are rejected. Genre membership is checked against application-supplied catalogs during application. The pending-operation extension is recorded separately below.
- `applyParserProposal()` uses real `applyIntent()` and `applyPendingQueryCommand()` transitions on a private working state. Expected revision and fresh-reference bindings are checked; rejection exposes no intermediate state. Each effective internal transition retains its existing revision increment, so a mixed proposal may advance revision more than once.
- `2affa9d`: added `tests/unit/domain/search/parser-proposal-scenario.spec.ts`, composing an initial synthetic proposal with a TV-only follow-up. Genre, year, rating and the stable pending-person reference are preserved; no person identity is invented. The user reported tests, typecheck and lint successful for that step. Coverage was not separately confirmed in that initial report; subsequent full-suite green reports are recorded below without inventing a historical percentage.

### Four parser-boundary steps

1. `924bda4` — input and fixed instructions: added `src/lib/parser/instructions.ts`, `build-parser-input.ts` and `tests/unit/parser/build-parser-input.spec.ts`. Initial instructions version `1.0.0`, projected context and original user text remain separate. Context capabilities follow the proposal contract, not unrestricted technical filter fields. Internal request references/revisions, unnecessary outer fields, credentials and histories are not forwarded to the model. The caller still establishes trusted state/catalog provenance and completeness. Later input/instruction extensions are recorded below.
2. `83da325` — JSON Schema export: added `src/lib/parser/create-parser-proposal-json-schema.ts` and its tests. The draft-2020-12 input schema is derived directly from `ParserProposalSchema` using Zod input mode, without changing the existing contract or replacing transformations with unconstrained schemas. Runtime trimming, genre normalization and domain checks still require local validation/application. No model-provider Structured Outputs compatibility is certified.
3. `319fe4b` — response validation: added `src/lib/parser/validate-parser-response.ts` and its tests. Non-text input, invalid JSON and invalid proposals have distinct sanitized failures. Valid clarification/unsupported results remain semantic outcomes. No Markdown extraction, JSON repair, logging, retry or state mutation is performed. Transport success, completion/refusal metadata and source association are separate caller obligations.
4. `dd1f4da` — composition: added `tests/unit/parser/parser-flow.spec.ts`. Real input preparation, schema export, JSON-response validation and domain application are exercised with a scripted model double. The initial request and TV-only follow-up preserve the complete supported wish. Additional cases reject a schema-valid unknown genre and a reply whose original source revision became stale. Only the external model boundary is substituted; internal collaborators remain real.

The composition is a deterministic test, not a production caller, real natural-language extraction, provider enforcement of JSON Schema, HTTP integration or a live-LLM quality/security evaluation. Separate data fields and instruction-like test strings do not prove prompt-injection resistance of a future model integration.

### Pending refinement and discard slice

1. `1585aa0` — request-local targets: extended `src/lib/parser/build-parser-input.ts` with model-visible `context.pendingTargets` and separate application-only `bindings` containing `expectedRevision` and target-key/entity/internal-ref associations. Existing person/keyword context views remain intact. Added `tests/unit/parser/build-parser-targets.spec.ts`. Keys such as `person-1` and `keyword-1` are local labels that may repeat across preparations, not stable references or authorization tokens. Only `result.input` is intended for the model.
2. `a714c2b` — proposal contract: added `ParserPendingOperationSchema` and optional `pendingOperations` with `refine` (`targetKey`, nonempty trimmed `query`) and `discard` (`targetKey` only). Strict objects reject extra authority fields; operation count is bounded by combined existing pending capacity and repeated targets are rejected. Missing operations preserve prior parsed output. Added `tests/unit/parser/parser-pending-proposal.spec.ts`, including schema export and response-validation composition. This intermediate commit blocked all nonempty pending operations to prevent partial application before step 3.
3. `1a692bc` — bound atomic application: extended `applyParserProposal()` with original `context.pendingBindings`. It checks their revision and complete ordered target mapping, resolves offered targets and delegates to existing `change`/`remove` commands. Refinement preserves the reference and existing addition/replacement context; discard removes only the pending request and preserves its accepted replacement source. Filters, pending edits and additions are applied privately as one returned result, with no partial state on rejection. Ineffective refinements do not advance revision. Missing bindings still block nonempty operations; malformed mappings or unknown targets reject. Added `tests/unit/parser/apply-bound-pending-proposal.spec.ts` with real preparation/response-validation/domain composition, stale and inconsistent bindings, sibling preservation, no-op behavior, mixed changes and late capacity failure.
4. `9927559` — instructions and capabilities: raised fixed instructions to `1.1.0`, replaced the obsolete addition-only rule and described offered-target selection, refinement versus addition, explicit withdrawal, ambiguity, replacement-source preservation and unsupported accepted-identity/coupled edits. `buildParserInput()` projects pending-operation names and fields from `ParserPendingOperationSchema`, plus the existing combined capacity limit. Added `tests/unit/parser/parser-pending-instructions.spec.ts`. Scripted discard/clarification tests verify composition, not live model interpretation or instruction adherence.

When nonempty pending operations are present and the complete proposal changes state, `pendingInvalidation` reports the original source revision and all original pending refs whose revision-bound results are obsolete, including otherwise unchanged siblings. It does not remove those siblings, retire clarification sessions or coordinate asynchronous lookups. This metadata is not currently emitted for proposals without pending operations.

The binding checks validate structure, revision and mapping consistency, not provenance of the original parser request. A trusted caller must retain the original bindings with that request, never rebuild or rebase them after receiving a response, and control response consumption and atomic adoption. Same-revision response swaps and end-to-end replay protection are not solved by this slice. No competing search state, persistence store or general coordinator was introduced.

### Validation report

- On 2026-11-17 the user explicitly confirmed all agreed checks green for `924bda4`. Subsequent reports for `83da325`, `319fe4b` and `dd1f4da` used the established shorthand that all tests are in order, covering tests, coverage checking, ESLint and typecheck.
- The user subsequently reported all tests in order after each pending-operation commit: `1585aa0`, `a714c2b`, `1a692bc` and `9927559`. Under the agreed shorthand, these reports include tests, coverage checking, ESLint and typecheck. The latest complete user-reported green implementation state is `9927559`.
- No exact coverage percentage, command logs, independently verified local HEAD or CI certification was supplied for this slice. The assistant did not execute these checks.
- Earlier validation reports apply to their historical implementation scope; they are not independent checks of later changes. This documentation update introduces no new executable validation result.

### WP 014 inventory handoff and return to WP 011

- On 2026-11-17, an initial inventory and design phase of [WP 014](014-entity-resolution.md) used the implemented parser proposal/application contracts and referenced pending requests. This did not constitute completion or final acceptance of WP 011, approval of a WP 014 implementation, or readiness for productive end-to-end integration.
- The user then chose to address the remaining WP 011 requirements directly. The pending refinement/discard slice above is the resulting completed, locally reported green implementation slice; it is not completion of the whole package. Further WP 014 work is deferred.
- Provider search completeness and pagination gaps identified during the WP 014 inventory remain tracked in that package, not as parser-contract defects.

### Remaining scope and limitations

- Supported entity operations now comprise unresolved person/keyword additions and bound refinement/discard of existing pending requests. Initiating replacements or removing accepted people/keywords through the parser, changing a replacement source and coupled identity/multi-target replacements remain unimplemented. Supporting several pending edits atomically is not a coupled identity-replacement contract. These limits do not remove broader specification requirements.
- Clarification/unsupported proposals remain wholly unapplied with their parsed proposal retained. New incompatible genre assignments remain blocked and retained rather than substituted. A retained message or scripted clarification response alone is not an implemented clarification continuation lifecycle.
- Select and approve the next concrete accepted-entity operation or clarification slice and any demonstrated domain-contract extensions. Inspect existing transitions and callers before proposing changes; do not introduce a general coordinator, duplicate state, store or registry merely to expand the flow.
- Model/provider selection and productive invocation remain unimplemented and require separate approval, including provider schema capability, complete-response/refusal/transport handling and safe separation of instruction/data roles. A production model/HTTP integration is outside this package without its own approved scope.
- Trusted original-request association, fresh-reference allocation, response consumption and caller-side lifecycle/atomic adoption remain integration responsibilities. Bindings checks and scripted stale-response tests alone are not end-to-end replay protection. Application handling of invalidation metadata and clarification-session reconciliation remain open integration work.
- No production parser caller, model/HTTP endpoint, identity-resolution implementation, Movie/TV execution, persistence, UI or automatic search has been introduced. Live identity resolution remains WP 014; confirmed result execution remains WP 012.
- This update changes only Execution status; Specification is unchanged. No runtime files, schemas or tests changed and no validation commands were run by the assistant for this documentation update.
