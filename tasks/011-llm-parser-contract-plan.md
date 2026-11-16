# WP 011 — LLM parser contract implementation plan

## Status and approval

- Status: Draft — awaiting approval.
- Created: 2026-11-16.
- Target branch: `feat/011-llm-parser-contract`.
- Reviewed remote baseline: `5c85d691e4ca95c033af8610f9fc5ae137153fc7`.
- Creating this document approves documentation only, not application implementation, a later code commit, PR or merge.
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

Implement validated parser input/output contracts and a pure application adapter for proposed filter changes, unresolved entity requests and clarification refinements. Preserve existing WP 009/010 transitions, limits, provenance boundaries and stale-answer protection.

WP 011 includes directly necessary, approved schema/domain extensions and migration from `MAX_PERSON_CLARIFICATION_CANDIDATES` to `MAX_PERSON_IDS`.

It does not implement an Ollama/LLM provider, parser HTTP endpoint, live identity lookup, TV-credit search, title-search execution, retry timers, UI components, persistence or browser journeys. There must be no network side effects or implicit search execution in the new adapter.

## 2. Read-only findings

These are findings from directly read files, not execution results or a complete repository-wide inventory.

| Capability | Evidence and status |
| --- | --- |
| Existing intent boundary | `src/lib/schemas/chat.ts`: ready changes are supported; needs_clarification explicitly permits zero changes. It cannot directly carry mixed accepted changes plus unresolved entities. |
| Atomic filter application | `src/lib/domain/search/apply-intent.ts`: validates the whole filter group, preserves people/pending state, applies genre compatibility, and increments revision once per effective transition. |
| List semantics | `src/lib/domain/search/extraction.ts`: set/replace address an entire ID list; add/remove operate on IDs. Targeted replacement must not be blindly mapped to whole-list replacement. |
| Pending operations | `src/lib/schemas/search-transition.ts` and `src/lib/domain/search/pending-operations.ts`: referenced person/keyword add/change/remove commands, stale guards and controlled person acceptance already exist. |
| Replacement/duplicates | `acceptResolvedPerson()` atomically retains/replaces source identity, removes the matching pending request and deduplicates IDs. Reuse it. |
| Semantic clarification | `src/lib/domain/search/semantic-guardrails.ts`: existing replacement-target, year-conflict and keyword-meaning actions reuse real transitions. Offering a question does not change criteria. |
| Replacement-source candidate gap | Existing replacement-target offers collect all eligible accepted people, not only those matching the user's source wording. WP 011 needs an application-controlled matching/subset policy before offering “which Tom?”. |
| Clarification ordering gap | `person-clarification-lifecycle.ts` offers only the first pending person; `apply-person-correction.ts` likewise requires the first request. Explicitly addressing another pending request is not yet supported by those paths. |
| Candidate bounds | `src/lib/schemas/clarification.ts` directly imports the candidate-only limit. The known-title limit is separate and must remain unchanged. |
| Existing regressions | Directly read `pending-operations.spec.ts`, `semantic-guardrails.spec.ts` and `year-range.spec.ts`: duplicate acceptance, source retention, stale references, year corrections and atomic invalid ranges already have tests. |
| Test inventory | Listed `tests/unit/domain/search`; remaining suites were not all read. Do not claim a full test audit. |
| Repository status documentation | `AGENTS.md` still names WP 010 and its old branch as active. Correct status through an explicitly approved documentation follow-up; do not reopen WP 010. |

The latest WP 011 specification is the saved baseline from the preceding documentation work. No application code was changed during planning.

## 3. Proposed contract design

### 3.1 Parser boundary

Create `src/lib/schemas/parser.ts` with strict external input/output schemas and types derived through `z.infer`.

Input contains the current relevant criteria/revision, supported capabilities/catalog version, supplied catalog information where needed, user text and explicit application-owned active-clarification context. Do not send result lists or a full conversation history by default. Do not persist raw text.

Output describes supported criteria changes and unresolved requests with explicit addition/replacement/removal/refinement meaning and mention order. Person/keyword names remain text until trusted resolution. The model cannot issue trusted IDs, allocate references, set authoritative revisions, select arbitrary actions or authorize a search.

Preserve the existing `ChatIntentSchema` as the filter-application contract rather than weakening its clarification branch to allow arbitrary mixed application. The new parser boundary and adapter split a validated proposal into accepted transition groups and separately retained unresolved work. Evidence text is not identity provenance.

Represent parser failure, unsupported requirements and clarification-needed outcomes explicitly. Treat malformed/invalid output as a failure without automatic repair or another model call. Concrete schema fields and discriminants must be included in the pre-code contract review, not improvised while coding.

### 3.2 Application-owned context

Create `src/lib/schemas/parser-application.ts` for the minimal session-level envelope required to retain overflow commands, unresolved replacement-source context, pending mention order and active clarification association. Reuse existing search and clarification schemas rather than copying their records.

Keep this envelope outside the bounded accepted-person/pending-addition collection. It must be bounded, revision/context-associated and ephemeral; it is not a second store of accepted filters or a hidden extra person slot. Exact bounds and full-capacity behavior require explicit approval before this schema is implemented.

Application-issued references identify retained requests and question instances. The adapter may allocate them through an explicit supplied allocator; never generate them from model guesses. Define consumption/replay protection for session-only actions even where criteria revision does not change. Reuse existing question sequences where possible; do not permit session reset to revive old answers.

### 3.3 Pure adapter and mixed changes

Create `src/lib/domain/search/apply-parser-result.ts` as the single pure coordination entry point. Use explicit state/session inputs and dependencies such as loaded genre catalogs and reference allocation. Return validated next state/session plus structured outcome facts; no transport, retry, rendering or execution.

Proposed sequence:

1. Validate the complete external proposal and verify its original base revision before applying anything. Malformed or stale proposals fail closed without mutation.
2. Bind any refinement/replacement source using stored application context, never model-supplied provider IDs.
3. Determine explicitly independent groups. Treat coupled year bounds and related overflowing additions as cohesive groups. Do not infer that every individual change can safely commit alone.
4. Apply an independent supported filter group through `applyIntent()` on a working copy.
5. Apply authorized entity commands through `applyPendingQueryCommand()` using the revision produced by the immediately preceding synchronous transition.
6. Retain unresolved source selection, overflow and other unapplied intentions in the envelope; do not silently discard them.
7. Reconcile affected clarification lifecycles. Never relabel old asynchronous lookup/candidate results with a newer revision.
8. Return the outcome for controlled caller persistence. An adapter result is not search permission.

Existing transition-level atomicity and revision increments remain authoritative. Do not force one revision increment for an entire mixed message. Internal revisions for fresh synchronous commands are distinct from rebasing old external results. Persist the returned state/session together under caller concurrency control.

A domain-valid independent group may succeed while another group awaits clarification. Unexpected internal inconsistencies must not be mistaken for ordinary partial success; define rejection versus retained-pending outcomes before coding and test both.

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

| File/group | Planned action |
| --- | --- |
| `src/lib/schemas/parser.ts` | New external parser contracts. |
| `src/lib/schemas/parser-application.ts` | Minimal bounded application-owned continuation context. |
| `src/lib/domain/search/apply-parser-result.ts` | Pure validated coordination using existing transitions. |
| `src/lib/schemas/search-state.ts`, `search-transition.ts` | Only approved keyword/domain contract extensions; preserve existing invariants. |
| `src/lib/schemas/semantic-guardrails.ts`, `src/lib/domain/search/semantic-guardrails.ts` | Reuse/extend source-subset binding; preserve year/keyword guards. |
| `src/lib/schemas/person-clarification-session.ts`, `person-correction.ts`, related flow schemas | Only fields needed for explicit non-first request association after direct inspection. |
| `src/lib/domain/search/person-clarification-lifecycle.ts`, `apply-person-correction.ts`, affected action/selection callers | Default ordering plus authorized explicit request activation and stale-context handling. |
| `src/lib/domain/search/pending-operations.ts` | Reuse existing person operations; add approved pure keyword acceptance support only if needed. |
| `src/lib/config/domain.ts`, `src/lib/schemas/clarification.ts`, every discovered caller | Shared-limit migration. |
| `tests/unit/schemas/parser.spec.ts`, `parser-application.spec.ts` | New project-specific schema invariants, not tests of Zod primitives. |
| `tests/unit/domain/search/apply-parser-result.spec.ts` | New adapter behavior and composed real-transition tests. |
| Existing affected schema/domain suites | Focused regressions; extend instead of duplicating coverage. |
| WP 011 execution status and this plan | Track actual progress and validation. |

No automatic barrel exports, server routes, provider dependencies or UI files are planned.

## 6. Implementation sequence

1. Reconfirm branch/local status, reread active WP and complete affected-caller/test inventory. Resolve stale `AGENTS.md` status explicitly before handing implementation to another agent.
2. Present exact schema shapes, envelope bounds, group-failure policy and criterion-gap disposition for approval. Reuse existing decisions; ask only genuinely new questions.
3. Add failing parser boundary tests and implement strict contracts.
4. Add failing session/overflow/source-selection tests and implement minimal context contracts.
5. Add failing mixed adapter tests; implement filter/entity coordination with real existing transitions.
6. Extend explicit-request targeting and replacement-source subset guards with regression tests; preserve default ordering and replay protection.
7. Add only approved keyword/domain extensions and criterion-specific mappings. If a product gap blocks them, stop that slice and record the precise question.
8. Migrate the shared constant and all actual references/tests.
9. Run composed fixture scenarios through the adapter and real domain functions. Keep them in the domain suite; do not mislabel them as HTTP integration tests.
10. Run validation, review scope and document actual results. Obtain explicit approval before application-code commit/PR/merge.

## 7. Test matrix

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
- Parser failures do not automatically request another model call; ready/clarification outcomes do not execute searches.
- Person candidate limit uses shared constant without consuming multiple person-condition slots.

Use synthetic fixtures and real internal transitions; mock only external boundaries if one exists. Add required coverage-intent comments. Preserve all existing unit regressions. No new HTTP endpoint or browser E2E work is authorized here.

## 8. Validation commands

Use the checked `package.json` scripts with the project's pnpm package manager:

- `pnpm test`
- `pnpm test:coverage`
- `pnpm lint`
- `pnpm typecheck`

During development, use focused Vitest runs for affected suites, then the complete commands above. Verify statement coverage at least 80%, including unimported application modules. Record actual command output/failures and commands not run. Do not claim Playwright, live TMDb or model-eval coverage from fixture tests.

No validation commands have been run for this draft.

## 9. Open design gates and downstream follow-up

Before coding the relevant slice, approve:

- Exact parser and application-envelope schemas, limits and full-capacity behavior.
- Matching policy/subset validation for ambiguous accepted source references.
- Mixed-group dependency/failure policy and session/revision commit semantics.
- Which keyword extensions belong in this implementation and which explicit contracts defer work.
- Any truly unspecified genre/keyword AND/OR or strict numeric semantics after checking existing specifications.

These gates do not reopen the eight agreed workflow decisions. Do not label this a fully approved implementation plan until they are resolved or explicitly deferred with a safe supported outcome.

Separately reviewed documentation follow-up:

- Link WP 011 back to this plan.
- Correct the stale active-package status in `AGENTS.md` without rewriting shared rules.
- Align WP 012 with explicit confirmation, executed snapshots and bounded transient retries; retain the existing separate Movie/TV paths.
- Align WP 014 with resolution/uniqueness, candidate continuation and bounded transient retries.
- Review the existing wizard task against the final cancellation/resumption rules.

This plan-creation commit changes only this new file. It does not silently update the work packages, `AGENTS.md` or UI task.

## 10. Approval log

- Draft creation requested by the user; implementation approval pending.
- Reviewed baseline and limitations recorded above.
- No application changes, tests, provider calls, branch creation or merge performed as part of this plan.
