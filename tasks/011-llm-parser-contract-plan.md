# WP 011 — LLM parser contract implementation plan

## Status and approval

- Status: Draft — awaiting approval.
- Created: 2026-11-16.
- Target branch: `feat/011-llm-parser-contract`.
- Original read-only application review baseline: `5c85d691e4ca95c033af8610f9fc5ae137153fc7`.
- Prompt/JSON contract alignment: specification commit `a8dbca0954a9f8da5b44bf41f35ce82909c4858f`, 2026-11-16. The plan was reread on the target branch before this documentation update; application code was not re-audited.
- Creating or updating this document approves documentation only, not application implementation, a later code commit, PR or merge.
- The remote review does not establish local working-tree cleanliness, unpushed commits or passing validation.
- Product decisions are authoritative in [WP 011](../docs/work-packages/011-llm-parser-contract.md). This plan describes their implementation, not an alternative specification.

## References

- [Development rules](../AGENTS.md).
- [Typing](../docs/typing.md) and [Testing](../docs/testing.md).
- [WP 009](../docs/work-packages/009-search-state-and-filter-catalog.md).
- [WP 010](../docs/work-packages/010-clarification-and-guardrails.md), complete in its accepted contract/domain scope.
- [WP 012](../docs/work-packages/012-search-execution-and-discover.md).
- [WP 013](../docs/work-packages/013-title-disambiguation-and-providers.md).
- [WP 014](../docs/work-packages/014-entity-resolution.md).
- [Deferred wizard task](clarificaton-flow.md), path verified in the tasks directory; its contents were not reviewed for alignment in this pass.

## 1. Goal and boundaries

Implement validated parser input/output contracts, the fixed parser-instruction/context contract and a pure application adapter for proposed filter changes, unresolved entity requests and clarification refinements. Preserve existing WP 009/010 transitions, limits, provenance boundaries and stale-answer protection.

WP 011 includes a versioned prompt and consistent external JSON-schema contract, pure request composition/response validation with deterministic tests, directly necessary approved schema/domain extensions and migration from `MAX_PERSON_CLARIFICATION_CANDIDATES` to `MAX_PERSON_IDS`.

It does not implement an LLM provider connection, parser HTTP endpoint, CLI, live identity lookup, TV-credit search, title-search execution, retry timers, UI components, persistence or browser journeys. There must be no network side effects or implicit search execution in the new adapter.

The first later interactive test surface is a CLI using a real LLM with initially mocked search data/execution. A fully mocked interactive parser stage is not a prerequisite. Provider/model selection remains open among the user-named NVIDIA Build, OpenRouter and Google AI Studio/Gemini API options; no integration or capability has been verified by naming them. Provider/CLI implementation requires a separately approved file-level scope. Automated contract tests remain deterministic and mock external model responses.

## 2. Read-only findings

The application findings below are historical observations at the original review baseline, not execution results, a fresh code audit or a complete repository-wide inventory.

| Capability                       | Evidence and status                                                                                                                                                                                                                                 |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Existing intent boundary         | `src/lib/schemas/chat.ts`: ready changes are supported; needs_clarification explicitly permits zero changes. It cannot directly carry mixed accepted changes plus unresolved entities.                                                              |
| Atomic filter application        | `src/lib/domain/search/apply-intent.ts`: validates the whole filter group, preserves people/pending state, applies genre compatibility, and increments revision once per effective transition.                                                      |
| List semantics                   | `src/lib/domain/search/extraction.ts`: set/replace address an entire ID list; add/remove operate on IDs. Targeted replacement must not be blindly mapped to whole-list replacement.                                                                 |
| Pending operations               | `src/lib/schemas/search-transition.ts` and `src/lib/domain/search/pending-operations.ts`: referenced person/keyword add/change/remove commands, stale guards and controlled person acceptance already exist.                                        |
| Replacement/duplicates           | `acceptResolvedPerson()` atomically retains/replaces source identity, removes the matching pending request and deduplicates IDs. Reuse it.                                                                                                          |
| Semantic clarification           | `src/lib/domain/search/semantic-guardrails.ts`: existing replacement-target, year-conflict and keyword-meaning actions reuse real transitions. Offering a question does not change criteria.                                                        |
| Replacement-source candidate gap | Existing replacement-target offers collect all eligible accepted people, not only those matching the user's source wording. WP 011 needs an application-controlled matching/subset policy before offering “which Tom?”.                             |
| Clarification ordering gap       | `person-clarification-lifecycle.ts` offers only the first pending person; `apply-person-correction.ts` likewise requires the first request. Explicitly addressing another pending request is not yet supported by those paths.                      |
| Candidate bounds                 | `src/lib/schemas/clarification.ts` directly imports the candidate-only limit. The known-title limit is separate and must remain unchanged.                                                                                                          |
| Existing regressions             | Directly read `pending-operations.spec.ts`, `semantic-guardrails.spec.ts` and `year-range.spec.ts`: duplicate acceptance, source retention, stale references, year corrections and atomic invalid ranges already have tests.                        |
| Test inventory                   | Listed `tests/unit/domain/search`; remaining suites were not all read. Do not claim a full test audit.                                                                                                                                              |
| Repository status documentation  | The original review found stale WP 010 status. A subsequent direct read on the target branch verified that `AGENTS.md` names WP 011, its branch and this draft plan. Do not reopen WP 010 or report the old status correction as still outstanding. |

The prompt/JSON requirements and backlink to this plan are saved in WP 011 at `a8dbca0954a9f8da5b44bf41f35ce82909c4858f`. No application code was changed during this documentation alignment.

## 3. Proposed contract design

### 3.1 Parser boundary

Create `src/lib/schemas/parser.ts` with strict external input/output schemas and types derived through `z.infer`.

Input contains the current relevant criteria/revision, supported capabilities/catalog version, supplied catalog information where needed, user text and explicit application-owned active-clarification context. Distinguish the internal request envelope from the model-visible projection; retain authoritative request/revision binding in the application. Do not send result lists or a full conversation history by default. Do not persist raw text.

Output describes supported criteria changes and unresolved requests with explicit addition/replacement/removal/refinement meaning and mention order. Person/keyword names remain text until trusted resolution. The model cannot issue trusted IDs, allocate references, set authoritative revisions, select arbitrary actions or authorize a search.

Preserve the existing `ChatIntentSchema` as the filter-application contract rather than weakening its clarification branch to allow arbitrary mixed application. The new parser boundary and adapter split a validated proposal into accepted transition groups and separately retained unresolved work. Evidence text is not identity provenance.

Represent parser failure, unsupported requirements and clarification-needed outcomes explicitly. A provider refusal or failed response is not required to contain valid success JSON. Treat malformed/invalid output as a failure without automatic repair or another model call. Concrete schema fields and discriminants must be included in the pre-code contract review, not improvised while coding.

### 3.2 Application-owned context

Create `src/lib/schemas/parser-application.ts` for the minimal session-level envelope required to retain overflow commands, unresolved replacement-source context, pending mention order and active clarification association. Reuse existing search and clarification schemas rather than copying their records.

Keep this envelope outside the bounded accepted-person/pending-addition collection. It must be bounded, revision/context-associated and ephemeral; it is not a second store of accepted filters or a hidden extra person slot. Exact bounds and full-capacity behavior require explicit approval before this schema is implemented.

Application-issued references identify retained requests and question instances. The adapter may allocate them through an explicit supplied allocator; never generate them from model guesses. Define consumption/replay protection for session-only actions even where criteria revision does not change. Reuse existing question sequences where possible; do not permit session reset to revive old answers.

### 3.3 Pure adapter and mixed changes

Create `src/lib/domain/search/apply-parser-result.ts` as the single pure coordination entry point. Use explicit state/session inputs and dependencies such as loaded genre catalogs and reference allocation. Return validated next state/session plus structured outcome facts; no transport, retry, rendering or execution.

Proposed sequence:

1. Validate the complete external proposal and verify its original base revision from the application-owned request association before applying anything. Malformed or stale proposals fail closed without mutation; do not depend on a model-generated revision.
2. Bind any refinement/replacement source using stored application context, never model-supplied provider IDs.
3. Determine explicitly independent groups. Treat coupled year bounds and related overflowing additions as cohesive groups. Do not infer that every individual change can safely commit alone.
4. Apply an independent supported filter group through `applyIntent()` on a working copy.
5. Apply authorized entity commands through `applyPendingQueryCommand()` using the revision produced by the immediately preceding synchronous transition.
6. Retain unresolved source selection, overflow and other unapplied intentions in the envelope; do not silently discard them.
7. Reconcile affected clarification lifecycles. Never relabel old asynchronous lookup/candidate results with a newer revision.
8. Return the outcome for controlled caller persistence. An adapter result is not search permission.

Existing transition-level atomicity and revision increments remain authoritative. Do not force one revision increment for an entire mixed message. Internal revisions for fresh synchronous commands are distinct from rebasing old external results. Persist the returned state/session together under caller concurrency control.

A domain-valid independent group may succeed while another group awaits clarification. Unexpected internal inconsistencies must not be mistaken for ordinary partial success; define rejection versus retained-pending outcomes before coding and test both.

### 3.4 Fixed instructions, request composition and JSON response

Define a versioned fixed parser instruction together with the external response schema and synthetic request/response examples. It must describe supported extraction/operations, preservation of supplied meaning, missing/ambiguous/unsupported input, and prohibitions on invented identities, IDs, execution or authoritative state changes. User text and supplied names are data, not authority to override these rules.

Provide a pure provider-neutral request composer with three logically separated parts: trusted fixed instructions, a minimal serialized application-context projection, and the current untrusted user input. A later provider adapter maps these parts to API roles/options. Do not embed secrets, result lists or full conversation history, or duplicate accepted state in a competing model. Define allowed context fields and serialization/bounds before implementation.

Use a single consistent schema source following project Zod/typing conventions. Determine the supported JSON Schema generation approach after inspecting installed versions; do not add a dependency or maintain a second handwritten schema without approval. Specify contract version, required fields, allowed values, strict unknown-field policy, bounds and missing/ambiguous/unsupported representations. Review provider-relevant schema limitations without selecting a provider or weakening local validation.

Specify that the later adapter supplies the schema through supported structured-output controls. Document the minimum capability requirements and require explicit approval for any fallback; asking for JSON in a prompt alone is not an acceptance guarantee. No automatic provider/model failover is planned.

Design the response boundary as: normalized response status/completion check, JSON parsing, external-schema validation, application-owned request association/stale checks, then domain validation/application. Provider-specific status mapping and transport remain later work; WP 011 defines minimal normalized outcomes and pure validators, not a provider SDK abstraction or network client.

Distinguish refusal, incomplete/truncated response, transport/timeout failure, malformed JSON and schema-invalid output from valid clarification/unsupported outcomes. Domain-invalid proposals follow the reviewed group-failure policy in 3.3; never apply the invalid group or silently omit wishes. Technical/format failures preserve accepted criteria and pending wishes and trigger no automatic model repeat, JSON repair or search. Explicit retry is required for another model call.

Proposed used implementation files, subject to pre-code review: `src/lib/parser/instructions.ts` for fixed instruction/version, `src/lib/parser/compose-request.ts` for pure context projection/composition, and `src/lib/parser/validate-response.ts` for normalized response validation. Confirm repository naming/layer placement first; do not create unused scaffolding or persist real conversations. Keep schema ownership in `src/lib/schemas/parser.ts`.

## 4. Changes by concern

### 4.1 Refinement and out-of-order requests

Update `person-clarification-lifecycle.ts`, `apply-person-correction.ts` and only necessary related session schemas/callers so mention order remains the default while an explicit application-validated request selection may activate another pending request.

Reuse existing no-match, refine, selection and correction boundaries. Read all affected lifecycle/action/selection modules and tests before modification. Retire old candidate groups and question references; do not reorder or discard unrelated requests just to bypass the current first-item checks.

A bare name during active clarification refines that request; an explicit addition creates another request. A bare name after confirmed cancellation must not answer the closed question.

### 4.2 Ambiguous replacement source

Reuse `offerSemanticGuardrail()` and `processSemanticGuardrailResponse()` rather than adding another replacement state machine. Extend their schemas/offer validation only as needed to carry an application-validated subset of current eligible source identities.

Retain the desired replacement query while asking which accepted source to replace. Validate selected source membership and current revision, then create the normal pending replacement. Lookup of the replacement remains WP 014 work. Keep the source until trusted identity acceptance.

### 4.3 Overflow

Retain the related addition group before calling a bounded pending transition. Present structured clarification facts; do not insert an over-limit request and rely on silent dropping or an arbitrary subset.

On a validated user choice, transfer only the chosen change into normal state and retain other wishes until resolved or explicitly discarded. Recompute capacity from current state for every action. Replacement/refinement at full capacity remains possible.

### 4.4 Shared rules, genres and keywords

Audit existing schemas, genre compatibility, keyword meaning and acceptance paths before extending them. Keep ID provenance and accepted/pending distinctions intact.

`PendingKeywordQuerySchema` currently represents additions only, and no controlled keyword acceptance was present in the inspected `search-transition.ts`/`pending-operations.ts`. Specify a minimal trusted keyword-acceptance and targeted-replacement extension only if required for the approved contract; implement pure contract support here if approved, with provider provenance supplied later by WP 014. Do not inject model-proposed keyword IDs through ordinary filter changes.

Preserve existing year-conflict correction and atomic range rules. Do not re-ask those general principles. Check existing specifications before deciding whether list AND/OR or strict numeric wording is supported. Do not invent an OR feature, broaden sorting or approximate unsupported numeric meaning silently.

### 4.5 Edited versus executed search

Keep WP 009 state as the editable criteria owner. WP 011 may return criteria/session changes and downstream contract facts only; it must not update result caches or run searches.

Specify that the WP 012 owner retains its executed revision/criteria snapshot and that prior results remain associated with it until a new confirmed execution. Do not add an unused execution cache or UI store to WP 011. Concrete readiness/confirmation execution is implemented later and must validate unresolved requests, session-held work and stale review actions, not just projected active IDs.

### 4.6 Constant migration

Update `src/lib/config/domain.ts` and `src/lib/schemas/clarification.ts`; perform a repository-wide reference search for all other callers and tests. The inspected import is a known caller, not an exhaustive list.

Replace candidate-limit references with `MAX_PERSON_IDS`, keep value five, retain `MAX_PERSON_CLARIFICATION_KNOWN_TITLES`, and test that candidates remain options for one wish rather than additional person slots. Do not alter global coverage configuration to hide regressions.

## 5. Proposed file map

All new names below are proposed, not already implemented APIs. Avoid empty scaffolding and add a file only when used.

| File/group                                                                                                                 | Planned action                                                                                                                                                     |
| -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/lib/schemas/parser.ts`                                                                                                | External parser schemas, normalized response outcomes and consistent versioned JSON-schema representation; inspect generation support before choosing an approach. |
| `src/lib/parser/instructions.ts`                                                                                           | Fixed trusted parser instruction/version, kept consistent with the response contract.                                                                              |
| `src/lib/parser/compose-request.ts`                                                                                        | Pure provider-neutral request composition with bounded context projection and separated user text.                                                                 |
| `src/lib/parser/validate-response.ts`                                                                                      | Pure status/JSON/schema validation; no transport, repair or retry.                                                                                                 |
| `src/lib/schemas/parser-application.ts`                                                                                    | Minimal bounded application-owned continuation context.                                                                                                            |
| `src/lib/domain/search/apply-parser-result.ts`                                                                             | Pure validated coordination using existing transitions.                                                                                                            |
| `src/lib/schemas/search-state.ts`, `search-transition.ts`                                                                  | Only approved keyword/domain contract extensions; preserve existing invariants.                                                                                    |
| `src/lib/schemas/semantic-guardrails.ts`, `src/lib/domain/search/semantic-guardrails.ts`                                   | Reuse/extend source-subset binding; preserve year/keyword guards.                                                                                                  |
| `src/lib/schemas/person-clarification-session.ts`, `person-correction.ts`, related flow schemas                            | Only fields needed for explicit non-first request association after direct inspection.                                                                             |
| `src/lib/domain/search/person-clarification-lifecycle.ts`, `apply-person-correction.ts`, affected action/selection callers | Default ordering plus authorized explicit request activation and stale-context handling.                                                                           |
| `src/lib/domain/search/pending-operations.ts`                                                                              | Reuse existing person operations; add approved pure keyword acceptance support only if needed.                                                                     |
| `src/lib/config/domain.ts`, `src/lib/schemas/clarification.ts`, every discovered caller                                    | Shared-limit migration.                                                                                                                                            |
| `tests/unit/schemas/parser.spec.ts`, `parser-application.spec.ts`                                                          | New project-specific schema invariants, not tests of Zod primitives.                                                                                               |
| `tests/unit/parser/compose-request.spec.ts`, `validate-response.spec.ts`                                                   | Deterministic instruction/context separation, schema consistency and normalized response-failure tests; synthetic examples, no live model calls.                   |
| `tests/unit/domain/search/apply-parser-result.spec.ts`                                                                     | New adapter behavior and composed real-transition tests.                                                                                                           |
| Existing affected schema/domain suites                                                                                     | Focused regressions; extend instead of duplicating coverage.                                                                                                       |
| WP 011 execution status and this plan                                                                                      | Track actual progress and validation.                                                                                                                              |

No automatic barrel exports, server routes, provider dependencies, CLI or UI files are planned. Confirm the new parser module/test paths during the design gate before coding.

## 6. Implementation sequence

1. Reconfirm branch/local status, reread active WP and complete affected-caller/test inventory. Verify `AGENTS.md` remains aligned with WP 011; its previously stale active-package status has already been corrected.
2. Present exact schema shapes, prompt/version and request examples, model-visible context/bounds, JSON-schema generation approach, normalized response outcomes, envelope bounds, group-failure policy and criterion-gap disposition for approval. Reuse existing decisions; ask only genuinely new questions.
3. Add failing parser boundary/request-composition/response-validation tests; implement strict consistent contracts, fixed instructions and pure helpers. No provider connection or live model call.
4. Add failing session/overflow/source-selection tests and implement minimal context contracts.
5. Add failing mixed adapter tests; implement filter/entity coordination with real existing transitions.
6. Extend explicit-request targeting and replacement-source subset guards with regression tests; preserve default ordering and replay protection.
7. Add only approved keyword/domain extensions and criterion-specific mappings. If a product gap blocks them, stop that slice and record the precise question.
8. Migrate the shared constant and all actual references/tests.
9. Run composed fixture scenarios through the parser response boundary, adapter and real domain functions. Keep them in the appropriate unit/domain suites; do not mislabel them as HTTP integration tests or evidence of live model quality.
10. Run validation, review scope and document actual results. Obtain explicit approval before application-code commit/PR/merge. Define provider/CLI work separately; do not start it under this plan.

## 7. Test matrix

- Fixed instructions, application context and user input remain logically separated; instruction-like user text stays in the untrusted data part and cannot replace trusted instructions in the composed request. This is not proof that a live model resists every injection.
- Only approved context fields are serialized; omit secrets, results and full history, preserve synthetic Unicode/quoted text safely and enforce reviewed bounds.
- Prompt/schema contract versions and required response fields stay consistent; reject forbidden authoritative identity/reference/revision fields and unsupported schema shapes according to the strict contract.
- Complete valid JSON can proceed; refusal, incomplete/truncated responses, transport/timeout failures, malformed JSON and schema-invalid output remain distinct from valid clarification/unsupported outcomes and cause no state mutation or automatic retry.
- Synthetic request/response examples cover new input, additions, replacements, removals, corrections/refinements, mixed changes and missing/ambiguous information. Fixtures establish contract/application behavior, not actual extraction quality of an untested model.
- Mixed message: TV change succeeds; replacement query remains pending; accepted source is retained.
- Incomplete person query preserved without invented identity/ID.
- Active bare-name refinement versus explicit addition; explicitly referenced non-first request; unrelated requests preserved.
- Ambiguous accepted source: only matching eligible people offered, replacement query retained, unoffered/stale selection rejected.
- Overflow: two additions competing for one slot; no arbitrary subset, no sixth slot, unselected wish retained, cancellation and duplicate resolution handled without data loss.
- Existing duplicate addition and A-to-already-accepted-B replacement behavior stays unchanged.
- No-match and technical error remain distinct; neither silently removes the pending wish/source.
- Coupled year updates remain atomic; independent groups do not weaken existing `applyIntent()` guarantees.
- Stale external base revision, same-revision obsolete questions, reference collisions, replay and input mutation are rejected/prevented.
- Keyword meaning remains query refinement rather than identity acceptance; approved keyword acceptance checks request/revision and limits.
- Genre compatibility and inactive return values survive adapter coordination.
- Parser failures do not automatically request another model call; ready/clarification outcomes do not execute searches. Domain-invalid groups follow the explicitly approved partial-success/rejection policy without applying invalid changes or losing wishes.
- Person candidate limit uses shared constant without consuming multiple person-condition slots.

Use synthetic fixtures and real internal transitions; mock only external boundaries if one exists. Add required coverage-intent comments. Preserve all existing unit regressions. No new HTTP endpoint, live provider evaluation or browser E2E work is authorized here. Test an error mapping at its owning boundary rather than duplicating it across every suite.

## 8. Validation commands

Use the checked `package.json` scripts with the project's pnpm package manager:

- `pnpm test`
- `pnpm test:coverage`
- `pnpm lint`
- `pnpm typecheck`

During development, use focused Vitest runs for affected suites, then the complete commands above. Verify statement coverage at least 80%, including unimported application modules. Record actual command output/failures and commands not run. Do not claim Playwright, live TMDb or model-eval coverage from fixture tests.

No validation commands have been run for this draft or its prompt/JSON documentation alignment.

## 9. Open design gates and downstream follow-up

Before coding the relevant slice, approve:

- Exact parser and application-envelope schemas, limits and full-capacity behavior.
- Fixed instruction text/version, synthetic request/response examples, model-visible context projection/serialization and request association.
- Consistent JSON-schema generation approach after checking installed versions, response discriminants and normalized failure mapping. Record minimum future provider capabilities; no silent fallback or provider/model selection.
- Concrete used helper/test paths and any required dependencies before adding them.
- Matching policy/subset validation for ambiguous accepted source references.
- Mixed-group dependency/failure policy and session/revision commit semantics.
- Which keyword extensions belong in this implementation and which explicit contracts defer work.
- Any truly unspecified genre/keyword AND/OR or strict numeric semantics after checking existing specifications.

These gates do not reopen the eight agreed workflow decisions. Do not label this a fully approved implementation plan until they are resolved or explicitly deferred with a safe supported outcome.

Documentation alignment already completed outside this plan update:

- WP 011 links back to this plan in specification commit `a8dbca0954a9f8da5b44bf41f35ce82909c4858f`.
- The directly read target-branch `AGENTS.md` identifies WP 011 and this draft plan. Its other follow-up descriptions may need a separately reviewed status refresh; this update does not edit it.

Separately reviewed downstream follow-up:

- Align WP 012 with explicit confirmation, executed snapshots and bounded transient retries; retain the existing separate Movie/TV paths.
- Align WP 014 with resolution/uniqueness, candidate continuation and bounded transient retries.
- Review the existing wizard task against the final cancellation/resumption rules.
- Plan and approve the real-provider CLI integration separately, with search data/execution initially mocked. Select provider/model and verify actual structured-output support then; do not assign a new work-package number implicitly.

The original plan-creation commit changed only this plan file. This alignment also changes only this plan; it does not silently update work packages, `AGENTS.md` or the UI task.

## 10. Approval log

- Draft creation requested by the user; implementation approval pending.
- Reviewed baseline and limitations recorded above.
- Prompt/JSON plan alignment requested on 2026-11-16 after specification commit `a8dbca0954a9f8da5b44bf41f35ce82909c4858f`. This records documentation scope, not technical implementation approval.
- No application changes, tests, provider calls, branch creation, PR or merge performed as part of this plan alignment.
