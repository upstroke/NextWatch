# WP 011 — LLM parser contract implementation plan

## Status and approval

- Status: Draft — awaiting approval.
- Created: 2026-11-16.
- Target branch: `feat/011-llm-parser-contract`.
- Original read-only application review baseline: `5c85d691e4ca95c033af8610f9fc5ae137153fc7`.
- Prompt/JSON contract alignment: specification commit `a8dbca0954a9f8da5b44bf41f35ce82909c4858f`, 2026-11-16.
- Targeted follow-up review completed at `a6fe74b2fd7083fd4bc25c0e830f646792014701` on 2026-11-16; scope, unchanged-code evidence and remaining limitations are recorded in section 2.
- Narrowly approved draft artifact: `src/lib/parser/instructions.ts`, instruction revision `0.1.0-draft`, saved in `d4138d916da442f29d20b1b8cf8373092cfb3e8c`. This does not approve the remaining implementation plan or runtime use; see section 3.4.
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
- [Parser instruction draft](../src/lib/parser/instructions.ts), the single maintained prompt text; not yet connected to runtime.
- [Deferred wizard task](clarificaton-flow.md), path verified in the tasks directory; its contents were not reviewed for alignment in this pass.

## 1. Goal and boundaries

Implement validated parser input/output contracts, the fixed parser-instruction/context contract and a pure application adapter for proposed filter changes, unresolved entity requests and clarification refinements. Preserve existing WP 009/010 transitions, limits, provenance boundaries and stale-answer protection.

WP 011 includes a versioned prompt and consistent external JSON-schema contract, pure request composition/response validation with deterministic tests, directly necessary approved schema/domain extensions and migration from `MAX_PERSON_CLARIFICATION_CANDIDATES` to `MAX_PERSON_IDS`.

It does not implement an LLM provider connection, parser HTTP endpoint, CLI, live identity lookup, TV-credit search, title-search execution, retry timers, UI components, persistence or browser journeys. There must be no network side effects or implicit search execution in the new adapter.

The first later interactive test surface is a CLI using a real LLM with initially mocked search data/execution. A fully mocked interactive parser stage is not a prerequisite. Provider/model selection remains open among the user-named NVIDIA Build, OpenRouter and Google AI Studio/Gemini API options; no integration or capability has been verified by naming them. Provider/CLI implementation requires a separately approved file-level scope. Automated contract tests remain deterministic and mock external model responses.

## 2. Read-only findings

The original application findings below remain applicable to the reviewed remote code: Git tree/blob hashes at `5c85d691e4ca95c033af8610f9fc5ae137153fc7` and `a6fe74b2fd7083fd4bc25c0e830f646792014701` are identical for `src/`, `server/`, `app/`, `tests/`, `package.json`, `pnpm-lock.yaml` and the TypeScript, Vitest and ESLint configuration. Differences are in `AGENTS.md`, `docs/` and `tasks/`. A repeated full audit is not required merely because documentation changed. This comparison does not turn the original targeted review into a complete caller/test inventory or establish passing tests.

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

### Targeted follow-up review — 2026-11-16

Directly read at `a6fe74b`: `AGENTS.md`, `docs/typing.md`, `package.json`, `src/lib/schemas/chat.ts`, `search.ts`, `search-state.ts`, `search-transition.ts`, `src/lib/domain/search/filter-catalog.ts`, `extraction.ts`, and `tests/unit/schemas/chat.spec.ts`, `search.spec.ts`, `search-year-range.spec.ts`. The schema and schema-test directories were directly listed.

- Existing intent tests explicitly reject changes on non-ready statuses. Preserve that boundary; introduce the separate parser proposal contract instead of weakening `ChatIntentSchema`.
- `FilterChangeSchema` currently accepts a general string field and unknown value; it is not yet a precise field-dependent external model-response contract.
- Reuse the versioned filter catalog and existing value schemas. Catalog entries describe capabilities, not identity provenance or blanket permission for the model to set IDs; derive an allowed model-facing projection.
- Existing search tests cover defaults, ranges and list limits; year-range tests cover open/closed/equal bounds and reversed-bound rejection. Do not duplicate those general rules as parser tests. Test the new composition, response and adapter boundaries.
- `package.json` pins Zod `4.6.7`. Local installation/runtime behavior was not checked. Zod 4's native `z.toJSONSchema()` is the starting approach; no additional conversion library is required by the current design. Verify conversion of the concrete new parser schema during implementation.
- Zod validates separate external boundaries, including TMDb responses and LLM parser responses; these are different contracts, not one shared API payload.
- Markdown instructions explain semantics; JSON Schema supports provider-side Structured Outputs; local Zod and domain validation control acceptance. These complement each other. Prefer Structured Outputs when the selected provider/model supports the required contract; exact compatibility is deferred to provider selection, and fallback requires explicit approval.
- The existing filter `.transform()` deduplication and domain checks remain local and unchanged for this purpose. Do not export the complete domain filter/state schema as the LLM response or remove transforms merely to enable export. Design a dedicated JSON-Schema-compatible parser response contract.
- Further caller/test inspection is limited to concrete planned adapter/domain changes and remaining relevant gaps. Do not restart a repository-wide audit or reopen WP 009/010.

The prompt/JSON requirements and backlink to this plan are saved in WP 011 at `a8dbca0954a9f8da5b44bf41f35ce82909c4858f`. No application code was changed and no validation commands were run during those documentation/review steps. The later instruction-draft addition in `d4138d9` is recorded separately below; the unchanged-tree comparison above does not include that addition.

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

#### Saved instruction draft — 2026-11-16

- Source: [src/lib/parser/instructions.ts](../src/lib/parser/instructions.ts), saved in commit `d4138d916da442f29d20b1b8cf8373092cfb3e8c` after explicit approval of this narrowly scoped artifact.
- Exports: `PARSER_INSTRUCTION_VERSION` with value `0.1.0-draft`, and `PARSER_INSTRUCTIONS` containing the fixed German Markdown instruction. This instruction revision is not the future parser input/output schema version.
- JSDoc documents purpose, draft status, separate context/user-input composition, later structured-output schema supply, local/domain validation and links to the specification and this plan.
- The prompt describes extraction boundaries, unchanged criteria, additions/replacements/removals/refinements, media-type preservation, unresolved persons/keywords, active-clarification reference rules and transparent handling of unsupported/ambiguous wishes.
- Keep the prompt text in that source file only. This plan documents its role and status; do not copy the full prompt into the specification or another documentation file.
- No runtime caller/provider is connected. No request composer, parser schema, response validator, adapter, CLI or placeholder implementation was created by that commit. The unconnected draft is the explicitly requested design artifact, not approval for further unused scaffolding.
- Input/context fields and bounds, response JSON/Zod schema, normalized response outcomes, synthetic schema-aligned examples and deterministic tests remain open. Review and align the instruction with those contracts before runtime use; saving the draft does not complete the prompt/schema design gate.
- No tests, coverage, ESLint, typecheck or live model evaluations were run for the instruction-draft commit. Do not infer behavioral correctness or passing validation from the saved text.

#### Remaining contract work

Complete the versioned fixed parser instruction together with the external response schema and synthetic request/response examples. It must describe supported extraction/operations, preservation of supplied meaning, missing/ambiguous/unsupported input, and prohibitions on invented identities, IDs, execution or authoritative state changes. User text and supplied names are data, not authority to override these rules.

Provide a pure provider-neutral request composer with three logically separated parts: trusted fixed instructions, a minimal serialized application-context projection, and the current untrusted user input. A later provider adapter maps these parts to API roles/options. Do not embed secrets, result lists or full conversation history, or duplicate accepted state in a competing model. Define allowed context fields and serialization/bounds before implementation.

Use a single consistent schema source following project Zod/typing conventions. Start with native `z.toJSONSchema()` for the dedicated parser response schema; verify the concrete schema's conversion and target limitations during implementation. Do not add a dependency or maintain a second handwritten schema without approval. Specify contract version, required fields, allowed values, strict unknown-field policy, bounds and missing/ambiguous/unsupported representations. Existing domain transforms remain unchanged and local; the model response is not an export of the complete domain schema. Review provider-relevant schema limitations without selecting a provider or weakening local validation.

Specify that the later adapter supplies the schema through supported structured-output controls. Document the minimum capability requirements and require explicit approval for any fallback; asking for JSON in a prompt alone is not an acceptance guarantee. No automatic provider/model failover is planned.

Design the response boundary as: normalized response status/completion check, JSON parsing, external-schema validation, application-owned request association/stale checks, then domain validation/application. Provider-specific status mapping and transport remain later work; WP 011 defines minimal normalized outcomes and pure validators, not a provider SDK abstraction or network client.

Distinguish refusal, incomplete/truncated response, transport/timeout failure, malformed JSON and schema-invalid output from valid clarification/unsupported outcomes. Domain-invalid proposals follow the reviewed group-failure policy in 3.3; never apply the invalid group or silently omit wishes. Technical/format failures preserve accepted criteria and pending wishes and trigger no automatic model repeat, JSON repair or search. Explicit retry is required for another model call.

Remaining proposed implementation files, subject to pre-code review: `src/lib/parser/compose-request.ts` for pure context projection/composition, and `src/lib/parser/validate-response.ts` for normalized response validation. Reuse the existing instruction draft rather than creating another prompt source. Confirm repository naming/layer placement first; do not create unused scaffolding or persist real conversations. Keep schema ownership in `src/lib/schemas/parser.ts`.

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

Except for the saved instruction draft explicitly recorded in section 3.4, new names below remain proposed, not implemented APIs. Avoid empty scaffolding and add a file only when used or as the separately approved draft artifact.

| File/group                                                                                                                 | Planned action                                                                                                                                                     |
| -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/lib/schemas/parser.ts`                                                                                                | External parser schemas, normalized response outcomes and consistent versioned JSON-schema representation; inspect generation support before choosing an approach. |
| `src/lib/parser/instructions.ts` | Draft saved in `d4138d9`; reuse and align version/text with the approved schema and examples before runtime use. |
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

No automatic barrel exports, server routes, provider dependencies, CLI or UI files are planned. Confirm remaining new parser module/test paths during the design gate before coding.

## 6. Implementation sequence

1. Reconfirm branch/local status and reread the active WP. Use the completed targeted follow-up review in section 2; inspect only remaining relevant callers/tests for concrete planned changes, and recheck changed files if the code baseline moves. Verify `AGENTS.md` remains aligned with WP 011; do not restart a full audit or reopen WP 009/010.
2. Present the concrete design deliverables consolidated in section 9 for approval. Reuse existing decisions and the saved instruction draft; ask only genuinely new questions.
3. Add failing parser boundary/request-composition/response-validation tests; implement strict consistent contracts and pure helpers, and align the existing instruction text/version. No provider connection or live model call.
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

No validation commands have been run for this draft, its documentation updates, the targeted read-only follow-up review or the saved instruction draft `d4138d9`.

## 9. Open design gates and downstream follow-up

### Consolidated open tasks before implementation

This is the single consolidated checklist of remaining design deliverables; details are in sections 3 and 4. The targeted prerequisite review in section 2 is complete within its stated scope, not an open requirement for a repeated full audit.

- [ ] Fixed parser instruction: the concrete Markdown draft/version is saved in `src/lib/parser/instructions.ts` at `d4138d9`. Still review it against the exact context/response schema and add synthetic schema-aligned request/response examples for new requests, additions, replacements, removals, refinements and mixed changes. Do not mark this gate complete from text storage alone.
- [ ] Model-visible context: define the allowed fields, supported-catalog projection, serialization, size bounds and separation from user text. Specify application-owned request/revision and clarification association; do not expose trusted IDs as authority to generate new identities.
- [ ] Parser input/output: specify exact JSON fields, types, status/discriminant values, contract version, required/optional semantics and strict unknown-field policy. Keep the model response distinct from TMDb payloads and complete domain state.
- [ ] Structured Outputs contract: use native Zod JSON-schema generation as the starting approach and verify the concrete parser schema's conversion. State minimum provider capabilities; exact provider/model compatibility is a later integration task. No silent fallback, extra dependency or handwritten duplicate schema without approval.
- [ ] Response validation: define normalized refusal, incomplete/truncated, transport/timeout, malformed-JSON and schema-invalid outcomes, distinct from valid clarification/unsupported interpretations. Specify unchanged-state behavior and the separate domain-invalid group policy; no automatic repair or repeat call.
- [ ] Mixed changes: define independent versus cohesive/dependent groups, partial-success/rejection behavior, atomicity and state/session revision/commit semantics. Preserve unresolved wishes and existing transition guarantees.
- [ ] Continuation context: specify the bounded overflow and unresolved-replacement-source representation, pending mention order, question/request association, capacity behavior, replay/stale protection and matching/subset policy for ambiguous accepted sources.
- [ ] Targeted domain extensions: inspect only remaining relevant callers/tests and verify genuine genre/keyword gaps, especially trusted keyword acceptance and targeted replacement. List exact necessary extensions versus safe deferrals; do not reopen shared rules or invent undecided AND/OR or strict numeric semantics.
- [ ] Concrete implementation map: confirm used helper/test paths, reused transitions, any necessary dependency changes and the focused tests for each change. Existing domain deduplication/transforms remain unchanged solely for schema export.

Review and approve these deliverables before coding the relevant slice. They do not reopen the eight agreed workflow decisions or imply approval of application implementation. Do not label this a fully approved implementation plan until the gates are resolved or explicitly deferred with a safe supported outcome. WP 011's specification needs no change solely for the Markdown/Zod/Structured Outputs clarification recorded here.

### Documentation alignment already completed

- WP 011 links back to this plan in specification commit `a8dbca0954a9f8da5b44bf41f35ce82909c4858f`.
- The directly read target-branch `AGENTS.md` identifies WP 011 and this draft plan. Its other follow-up descriptions may need a separately reviewed status refresh; this update does not edit it.
- This plan links to the saved instruction draft and documents its version, purpose, limits and pending contracts without duplicating the full prompt.

### Separately reviewed downstream follow-up

- Align WP 012 with explicit confirmation, executed snapshots and bounded transient retries; retain the existing separate Movie/TV paths.
- Align WP 014 with resolution/uniqueness, candidate continuation and bounded transient retries.
- Review the existing wizard task against the final cancellation/resumption rules.
- Plan and approve the real-provider CLI integration separately, with search data/execution initially mocked. Select provider/model and verify actual structured-output support then; do not assign a new work-package number implicitly. Dependency order remains WP 011 → WP 014 → WP 012.

The original plan-creation commit changed only this plan file. This documentation update also changes only this plan; it does not silently update the prompt source, work packages, `AGENTS.md` or the UI task.

## 10. Approval log

- Draft creation requested by the user; remaining implementation approval pending.
- Reviewed baseline and limitations recorded above.
- Prompt/JSON plan alignment requested on 2026-11-16 after specification commit `a8dbca0954a9f8da5b44bf41f35ce82909c4858f`. This records documentation scope, not technical implementation approval.
- Open-task consolidation and the targeted follow-up review status requested on 2026-11-16. This preserves the specification and does not approve implementation or claim a complete repository-wide audit.
- The user explicitly approved the isolated instruction draft on 2026-11-16; `src/lib/parser/instructions.ts` was created in `d4138d916da442f29d20b1b8cf8373092cfb3e8c`. Approval did not include further parser modules or runtime integration.
- The user requested documentation of that artifact in this existing plan. This update records actual progress rather than creating a second prompt copy or claiming the parser is implemented.
- No tests, live model/provider calls, branch creation, PR or merge were performed for the instruction draft or this documentation step. No application/domain behavior, schemas, adapters or provider integration were implemented by these steps.
