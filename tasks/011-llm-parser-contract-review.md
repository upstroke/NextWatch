# WP 011 — Technical contract review findings

## Status and scope

- Original review recorded: 2026-11-16. Consolidation tracking updated: 2026-11-17.
- Branch: `feat/011-llm-parser-contract`.
- Original defect-review baseline: `5fa186d4a52ed267b70691f5c117e4b5ca1cc8f4`.
- Current documentation/prompt baseline: `348091d7f3b950aa67ae788df4884b856d8ca083`.
- Status: R01–R06 have documented resolution directions in the consolidated plan. This reconciliation replaces outdated missing-documentation statements; it does not certify complete executable contracts, passing tests, implementation readiness or final finding closure.
- Product authority: [WP 011 specification](../docs/work-packages/011-llm-parser-contract.md), including approved A/R02 and B/R06 in `113a5ab`.
- Technical resolution locations: [consolidated plan](011-llm-parser-contract-plan.md), commit `3a8942a`.
- Decision evidence: [decision supplement](../docs/work-packages/011-parser-contract-decisions.md), A/R02 and B/R06 recorded in `a2c548e`. Do not reopen accepted product decisions.
- Model-facing instruction artifact: [instructions.ts](../src/lib/parser/instructions.ts), English revision `0.1.2-draft` in `348091d`; not connected to a provider/caller and not a runtime guarantee.
- This file records findings, resolution locations and verification work. It is not another specification and does not approve application implementation, a code commit, PR or merge.

## Evidence and limits

The original static review directly read the specification, plan, `src/lib/schemas/search-state.ts`, `src/lib/schemas/semantic-guardrails.ts`, `src/lib/domain/search/pending-operations.ts`, `src/lib/domain/search/apply-intent.ts` and `src/lib/domain/search/extraction.ts`. It was not a complete caller/test audit.

This reconciliation compares the existing checklist with the consolidated plan and instruction artifact; it does not repeat a repository-wide audit. The current plan fetch was truncated within section 4.4. Its remaining R06 text, file map, test sequence and verification table are available in the approved full content committed in `3a8942a`; this record does not claim a new untruncated file-tool read of the whole plan. The instruction artifact and previous checklist were read completely at the current baseline.

AGENTS, docs/testing.md, docs/typing.md and the WP 011 specification remain binding. Earlier contextual reading also covered WP 009/010/012/013/014 and the deferred wizard task. Its current verified filename is [clarificaton-wizzard-flow.md](clarificaton-wizzard-flow.md), renamed in `ed48ad3`.

No tests, coverage, ESLint, typecheck, schema-export check, model evaluation or live provider lookup ran for this reconciliation. Runtime parser schemas/composer/validator/adapter and proposed compound acceptance are not claimed implemented. Remote evidence does not establish local cleanliness or absence of unpushed work.

## Status definitions and work queue

Checked design items below mean that the stated rule is now documented at the linked location. They do not mean an executable schema, independently verified algorithm or automated test exists.

- Design consolidated: the original issue has a traceable proposed resolution in the plan.
- Verification pending: concrete schema/signature/fixture/caller checks remain before approval of the affected code slice.
- Implementation acceptance pending: behavior must be implemented and tested under a separately approved file-level scope.

No finding is marked finally closed in this update. Original severity is retained for traceability, not as a claim that no resolution has been written. Finish one focused contract/file-level verification, not six new product-decision rounds. Report a new product question only for a concrete uncovered case that cannot safely follow existing rules.

| ID        | Original classification | Consolidated location                             | Current status                                                                                                |
| --------- | ----------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| WP011-R01 | Blocking                | Plan 4.1                                          | Design consolidated, including both follow-up rules and eighth scenario; verification/implementation pending  |
| WP011-R02 | Blocking                | Specification Capacity and overflow; plan 4.2     | Policy A accepted; proposed calculation consolidated; arithmetic/mapping verification pending                 |
| WP011-R03 | Blocking                | Plan 4.3                                          | Dependency/conflict direction consolidated; fixture/adapter verification pending                              |
| WP011-R04 | Blocking                | Plan 3, kind-specific active clarification        | Context/response mapping consolidated; exact contracts/caller verification pending                            |
| WP011-R05 | Required clarification  | Plan 2–3                                          | Common field rules/matrix consolidated; exact context shapes, fixtures and schema-export verification pending |
| WP011-R06 | Required clarification  | Specification Staged resolution results; plan 4.4 | Policy B accepted; validity direction consolidated; exact bindings/acceptance verification pending            |

## WP011-R01 — Continuation lifecycle and compound-request ownership

Original issue: compound intentions, child references and staged results lacked a complete ownership/lifecycle definition. Singular pending-person requests cannot represent an atomic multi-person replacement through independent acceptance calls.

Resolution: [plan 4.1](011-llm-parser-contract-plan.md#41-r01--continuation-ownership-and-lifecycle), consolidated in `3a8942a` from the accepted R01 design in `b984463`.

Design coverage:

- [x] Canonical simple pending requests versus continuation-owned compound/unallocated work; accepted criteria remain canonical in SearchState.
- [x] One child owner and at most one parent; atomic transfer, no independent query copies or double reservation.
- [x] Owned-child unresolved/needs_clarification/resolved states; technical failure remains distinct from no match.
- [x] Refinement, scoped child/parent discard, pause, complete atomic acceptance and bounded cleanup.
- [x] Continuation bounds and unchanged-state failure; discard/cleanup remains available at full capacity.
- [x] Follow-up: linked-query text/operation comes from canonical state, processing/question facts from responsible contexts, not nonexistent canonical lifecycle fields.
- [x] Follow-up: linked acceptance/discard reconciles parent/question bindings atomically; unexplained disappearance is an inconsistency.
- [x] Eighth scenario: accept one independent linked addition, then discard the remainder without undoing the accepted person.

Remaining evidence:

- [ ] Verify concrete continuation/linked-binding variants against all affected producers/consumers and proposed acceptance signatures.
- [ ] Implement and execute the eight planned scenarios under the approved code scope, including rollback/mutation isolation and no dangling references.

The prior statements that the two follow-up rules/eighth scenario were not incorporated are superseded by `3a8942a`. Their presence is not proof of implemented behavior or final design closure.

## WP011-R02 — Multi-replacement reservation accounting

Original issue: final deduplicated capacity was described, but reservation of unresolved compound replacements and competing additions was not fixed.

Reproducer: four accepted people; replace one with two unresolved people; request another addition. Iteration order must not decide which wish receives the last available slot.

Resolution: [specification](../docs/work-packages/011-llm-parser-contract.md#capacity-and-overflow), accepted [decision A](../docs/work-packages/011-parser-contract-decisions.md#4-r02--protect-existing-reservations), and [plan 4.2](011-llm-parser-contract-plan.md#42-r02--capacity-and-protected-reservations).

Design coverage:

- [x] Protect valid existing reservations from later wishes; retain new related competitors for explicit choice rather than arbitrary partial scheduling.
- [x] Distinguish occupancy, allocated reservations and unallocated overflow.
- [x] Conservative unresolved counts, trusted ID deduplication and no double-counting canonical/linked queries.
- [x] Proposed per-operation formulas before/after partial resolution; source-slot sharing and future-removal/cross-operation savings are constrained.
- [x] Reevaluate on relevant changes and before acceptance, preserving criterion-specific keyword and active/inactive genre limits.

Remaining evidence:

- [ ] Verify the proposed arithmetic with concrete/property cases: partial resolution, source among destinations, duplicate/already accepted destinations, competing replacements and capacity released after discard.
- [ ] Finalize controlled keyword/compound reservation mappings and their interaction with R03 dependent units before coding the affected slice.
- [ ] Demonstrate that accepted occupancy plus valid reservations never exceeds the limit and that transfer/failure cannot create hidden slots or lose wishes.

The formula is documented, not certified by this checklist. Do not reopen the accepted precedence policy to resolve an implementation detail.

## WP011-R03 — Cross-group dependencies and conflicts

Original issue: model groups were non-authoritative, but the application dependency/conflict policy was unspecified.

Resolution: [plan 4.3](011-llm-parser-contract-plan.md#43-r03--dependencies-and-conflicts). The instruction artifact now preserves explicit relationships/self-correction while leaving application decisions outside the model.

Design coverage:

- [x] Derive prerequisites, modified targets, whole-selection scope, year effects and capacity effects application-side.
- [x] Treat model coupling as a minimum constraint, merge dependent units and forbid splitting coupled operations for partial success.
- [x] Distinguish explicit self-correction/ordered composition from ambiguous same-target conflicts; no generic last-write-wins.
- [x] Couple year bounds, whole-selection edits and explicit remove-to-make-room dependencies appropriately.
- [x] Retain semantic blockers while independent valid units may succeed; reject the complete working-copy result on unexpected internal inconsistency.

Remaining evidence:

- [ ] Align complete context/proposal/outcome fixtures for replace/remove same person, whole-genres-plus-add, split year bounds and explicit capacity dependency.
- [ ] Check exact adapter coordination and real-transition composition, including existing open-work reconciliation, revision ordering and mutation isolation.

These are focused technical verification tasks, not authorization for a generic workflow engine or another state model.

## WP011-R04 — Active clarification projection

Original issue: a generic activeClarification with an entity pendingRef could not represent a year-conflict question, and source/meaning contexts were underspecified.

Resolution: [plan 3](011-llm-parser-contract-plan.md#3-request-and-response-boundary), kind-specific active clarification table; instruction revision `0.1.2-draft`, Active clarification section.

Design coverage:

- [x] Person, replacement-source, year-conflict and keyword-meaning context directions are distinct, with capacity clarification identified as planned extension rather than existing functionality.
- [x] Preserve authoritative question/revision/session association application-side; no fabricated entity request for a year question.
- [x] Offered source/meaning references are interpretations, not identity acceptance; prepared buttons do not call the model.
- [x] Year example: proposed 2020–2010 plus “Dann ab 2000” changes only the mentioned bound, then validates 2000–2010 together.
- [x] No-active-question and explicit-other-request rules preserve closed-question protection and additional independent wishes.

Remaining evidence:

- [ ] Define/verify exact strict context shapes and response-to-action mappings against actual WP 010 contracts and affected callers.
- [ ] Execute focused year/source/meaning/person/capacity association tests, including old same-revision questions and scoped discard.

This record does not assert that capacity clarification or all text-answer adapters already exist.

## WP011-R05 — Complete the field matrix

Original issue: correction optionality, subject/status sets, criteria/context shapes, reference scope and excerpt bounds were not fully defined.

Resolution: [plan 2](011-llm-parser-contract-plan.md#2-contract-ownership-and-common-field-rules--r05) and [plan 3](011-llm-parser-contract-plan.md#3-request-and-response-boundary); instruction revision `0.1.2-draft`, Response structure and field meaning section.

Design coverage:

- [x] Query text and correction required; correction null means no suggestion, not removal. Variant-inappropriate fields are forbidden.
- [x] Typed reference scopes, source selector direction, subject/query-status/blocker sets and operation-dependent response matrix are documented.
- [x] Excerpt literal containment, overlapping excerpts, UTF-16 length counting, per-field and aggregate limits are specified.
- [x] Single Zod source/inferred types/derived JSON Schema and central stable limits follow typing rules; no schema per internal helper or export of the complete domain state.

Remaining evidence:

- [ ] Finish/verify exact model-visible context and continuation-boundary shapes where the plan still gives descriptions rather than complete executable field definitions.
- [ ] Produce complete valid/invalid synthetic fixtures with actual supplied context/ref registries, including the new answer and discard variants; named example scenarios alone do not satisfy fixture acceptance.
- [ ] Verify concrete Zod-to-JSON-Schema conversion during the approved implementation slice; document actual unsupported constructs/provider limitations without silently weakening local validation.

Do not claim that every wire field or provider capability is proven merely because the operation matrix and prompt were updated. Generic primitive/missing-field Zod tests alone are not useful project acceptance coverage.

## WP011-R06 — Staged resolution validity

Original issue: preserving several trusted results without revision rebasing lacked a concrete validity/acceptance direction for refinement, cancellation and state changes.

Resolution: [specification](../docs/work-packages/011-llm-parser-contract.md#staged-resolution-results-and-current-state-acceptance), accepted [decision B](../docs/work-packages/011-parser-contract-decisions.md#5-r06--retain-validated-results-for-unchanged-child-queries), and [plan 4.4](011-llm-parser-contract-plan.md#44-r06--result-validity-and-current-acceptance).

Design coverage:

- [x] Distinguish already validated unchanged-child facts from incoming responses with stale associations; never relabel sourceRevision.
- [x] Describe session lifetime/processing epoch, query generation, parent/source and attempt bindings, bounded consumption and fresh-attempt supersession.
- [x] Staging is session bookkeeping, not accepted identity mutation or a query edit-generation increment; preserve the existing canonical singular acceptance guard.
- [x] Refinement invalidates the affected child's results/candidates; unrelated unchanged facts may remain but cannot authorize mutation by themselves.
- [x] Interruption closes questions/outstanding authorizations without deleting valid unchanged-child facts or automatically starting another call; discard/reset removes corresponding work.
- [x] Current-state compound acceptance rechecks source, child membership/provenance, full destinations, deduplication, capacity and dependencies atomically.

Remaining evidence:

- [ ] Verify exact binding records, comparison/invalidation rules and acceptance signatures with the controlled domain boundary and WP 014 handoff, without bypassing global stale guards.
- [ ] Test refine self/sibling, unrelated scalar changes, source/capacity changes, interruption/resumption, reset/recreate same name, late/duplicate responses and stale-incoming versus previously-validated facts.
- [ ] Demonstrate one atomic compound acceptance, retaining original provenance and rejecting partial/unexpected failure without mutation.

Do not reopen decision B; determine the concrete safe implementation within its constraints. No live provider lookup or automatic recovery is authorized here.

## Verification handoff and closure

The earlier broad missing-design descriptions are now traceable to consolidated resolution directions. The remaining unchecked items above are the concrete verification/implementation acceptance queue. Do not keep re-asking accepted product questions, but do not mark unknown signatures, incomplete context shapes or unexecuted fixtures as verified.

Before starting the affected application slice: complete the targeted caller/signature/field review, agree a file-level scope and obtain implementation approval. During that approved slice: add focused failing tests, implement with real internal transitions and verify schema export where applicable. Do not require a model/provider integration to run deterministic contract tests, or label composed domain tests as HTTP integration.

Apply the actual testing conventions: synthetic reusable fixtures; mock external boundaries, not the unit; coverage-intent comments immediately above unit-test declarations; no new HTTP/browser scope. Run actual project scripts for tests, statement coverage at least 80% including unimported application modules, ESLint and typecheck. Record commands/results and checks not run honestly. No such execution occurred for this checklist update.

Finding closure must record the reviewed resolution and verification evidence at the responsible stage. Design closure and implementation acceptance are separate; future checks can be explicitly handed off, not falsely checked off. Saving this reconciliation does not close R01–R06 or grant application-code/PR/merge approval.

Next documentation step: update the decision-history consolidation backlinks. The plan's earlier forward references to prompt/review alignment are historical progress statements to reconcile when that plan is next edited, not proof those artifacts are still wholly untouched. Downstream WP 012/WP 014 and the renamed wizard-task alignment remain separate follow-up work. No new product decisions or a new work-package number are introduced here.

## Execution status

Only this review protocol is updated. Specification `113a5ab`, consolidated plan `3a8942a` and prompt `348091d` are referenced, not modified. No runtime schema, adapter, domain transition, provider client, tests, other documentation files, PR or merge changed. All implementation evidence remains pending; no validation commands or model evaluations ran.
