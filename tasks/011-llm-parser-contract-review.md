# WP 011 — Technical contract review findings

## Status and scope

Updated: 2026-11-17. Branch: `feat/011-llm-parser-contract`. Current inspected remote baseline: `594c1621982d5f85ab9ccf73af9a0d832776816e`; latest application slice: `ab704c3`.

The original review baseline was `5fa186d4a52ed267b70691f5c117e4b5ca1cc8f4`; design consolidation and instruction alignment were subsequently recorded in `3a8942a` and `348091d`. Those historical baselines must not be presented as the current implementation state.

Product authority: [WP 011 specification](../docs/work-packages/011-llm-parser-contract.md). Design references: [implementation plan](011-llm-parser-contract-plan.md) and [binding plan](011-parser-continuation-binding-plan.md). Implemented slices and check history: [progress ledger](011-llm-parser-contract-progress.md). Accepted policies A/R02 and B/R06 remain recorded in the [decision supplement](../docs/work-packages/011-parser-contract-decisions.md), commit `a2c548e`, and incorporated in the specification. Do not reopen them as new product questions.

The current [instruction artifact](../src/lib/parser/instructions.ts) declares `0.1.2-draft`, independently of parser contract version `0.1.0-draft`. It is not connected to a provider or productive caller.

This reconciliation records partial implementation and remaining verification, not final closure of R01–R06, completion of WP 011 or permission for a PR/merge. Shared development, typing and testing rules remain in AGENTS and the referenced authoritative documents.

## Evidence and limits

Targeted static inspection covered continuation ownership, the current bound refinement boundary, existing person selection/lifecycle, domain limits, the review protocol and relevant plan content. This is not a complete repository-wide caller/test inventory or a fresh full audit of every historical slice. The large implementation-plan fetch was truncated; no full reread of its later sections is claimed.

Implementation commits and test reports are recorded below by scope. A user report of passing tests is not assistant-executed validation or proof that every planned acceptance scenario exists. The user reported all tests passing after `ab704c3` and reiterated that tests remain in order during this review. Fresh typecheck, ESLint and coverage for the latest application code remain unreported. No numeric current coverage or command logs were supplied.

The assistant did not run tests, coverage, lint, typecheck, model evaluations or provider lookups. Remote inspection does not establish local working-tree cleanliness or absence of unpushed changes.

## Status definitions and summary

- Design recorded: a policy or technical direction exists; it is not implemented merely by being documented.
- Partially implemented: named executable slices exist, with their limitations below.
- Verification open: affected signatures, callers, complete scenarios or current validation still require evidence.
- Closed: requires explicit finding-specific review and acceptance evidence; no finding is marked closed here.

Original severity is retained for traceability, not as a claim that nothing has been implemented.

| Finding   | Original classification | Existing implementation evidence                                                                                                      | Remaining closure work                                                                                              |
| --------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| WP011-R01 | Blocking                | Bounded ownership, refine/discard transitions and person-session/registry coordination; bound actions and canonical parsed refinement | Linked acceptance, owned-result lifecycle, ownership transfer, pause/resume and compound acceptance                 |
| WP011-R02 | Blocking                | Existing canonical pending limits and bounded continuation storage                                                                    | Protected reservation arithmetic, new competition, transfer and current-state acceptance mappings                   |
| WP011-R03 | Blocking                | Existing atomic domain transitions; narrow single-refinement response application                                                     | General mixed-result adapter, dependency/conflict units and retained unsupported/clarification work                 |
| WP011-R04 | Blocking                | Kind-specific parser context contracts; canonical person question binding, action processing and parsed refinement                    | Full response-to-action mappings, owned/non-person question authority and caller routing                            |
| WP011-R05 | Required clarification  | Dedicated parser schemas, JSON Schema export function, composer, validator, fixtures and unit suites                                  | Complete field/fixture/caller alignment, canonical correction metadata and remaining export/acceptance verification |
| WP011-R06 | Required clarification  | Binding registry primitives, edit reconciliation and bounded person action/refinement consumption                                     | Trusted result staging, complete invocation lifetime and current-state compound acceptance                          |

## WP011-R01 — Continuation ownership and lifecycle

Authority/design: [plan 4.1](011-llm-parser-contract-plan.md#41-r01--continuation-ownership-and-lifecycle), including the two linked-request follow-up rules and eighth scenario consolidated in `3a8942a` from R01 design `b984463`.

Implemented portions:

- `db830a5`: bounded intention/child schema; canonical children hold references only, owned children hold query/generation. See `src/lib/schemas/parser-continuation.ts`.
- `4e2a719`: real pending-operation delegation for canonical edits, owned refinement, scoped child/parent discard, final-child cleanup and invalidation facts. See `apply-parser-continuation-command.ts` and its unit suite.
- `da318aa` and `f6d9db2`: person-question and registry reconciliation in `process-parser-continuation-command.ts`; applied proposals return all four stores.
- `fa026dc`: bound canonical person actions, including linked/unlinked explicit discard. `ab704c3`: one bound canonical parsed refinement, with preserved reference/operation and no-op distinction.

Open evidence/implementation:

- Bound successful person acceptance must reconcile linked continuation work and registry authority together. Existing `process-person-selection.ts` does not return a continuation/registry proposal.
- Owned results, authoritative owned questions and ownership transfer are not implemented by the query/generation schema. Canonical links currently support additions, not linked compound replacement ownership.
- Complete pause/resume and atomic compound acceptance remain open. Never simulate a multi-person replacement through several committed single-person acceptances.
- Finish all eight design scenarios: partial resolution retains source; refine preserves siblings; child discard preserves the remaining operation; final-child discard retains source; pause/resume rejects old questions; ownership transfer avoids duplication; full-capacity failure retains work while cleanup remains usable; accepting one independent linked addition then discarding the rest does not undo the accepted person. Existing partial unit coverage is not completion of the full set.

## WP011-R02 — Capacity and protected reservations

Authority: [specification](../docs/work-packages/011-llm-parser-contract.md#capacity-and-overflow), accepted [decision A](../docs/work-packages/011-parser-contract-decisions.md#4-r02--protect-existing-reservations), [plan 4.2](011-llm-parser-contract-plan.md#42-r02--capacity-and-protected-reservations).

Existing canonical limits and bounded continuation storage are useful foundations, not the protected-reservation algorithm.

Open:

- Verify proposed arithmetic with partial resolution, source among destinations, duplicate/already accepted destinations, competing replacements and capacity released after discard.
- Protect valid existing reservations from later wishes; evaluate newly related competitors together without iteration-order subsets. Preserve unresolved overflow rather than dropping wishes.
- Distinguish accepted occupancy, allocated reservations and retained unallocated work; count canonical/linked queries once and unresolved terms conservatively.
- Finalize keyword/compound mappings and interactions with R03 coupled units. Respect keyword and complete active/inactive genre limits separately.
- Demonstrate capacity invariants and failure-safe ownership transfer, then revalidate current capacity before full acceptance.

The four-accepted-person reproducer remains required: replacement of one by two unresolved people plus another addition must not be decided by processing order. The policy is accepted; the proposed formulas are not certified by this review.

## WP011-R03 — Mixed requests, dependencies and conflicts

Design: [plan 4.3](011-llm-parser-contract-plan.md#43-r03--dependencies-and-conflicts).

`processBoundPersonRefinement()` now validates and applies one exact canonical person refinement with real internal transitions. It rejects mixed/broader responses rather than silently taking a subset. That safe rejection is not the general adapter or a mechanism for retaining every unapplied wish.

Open:

- Implement the general pure parser-result adapter with explicit inputs, private working copies, validated complete results and structured applied/retained/rejected facts.
- Derive prerequisites, shared modified targets, whole-selection/year effects and capacity dependencies application-side. Model groups are not sufficient authority.
- Keep explicitly coupled operations together; merge dependent units where necessary. Do not use generic last-write-wins for unresolved conflicts.
- Retain semantic blockers and unsupported/non-query intentions while allowing independent valid work. Unexpected internal inconsistency rejects the complete proposal without exposing a partial working copy.
- Verify complete fixtures for replace/remove same person, whole-genres-plus-add, split year bounds and explicit removal-to-make-room, including revision ordering and existing open-work reconciliation.

Do not introduce a generic workflow engine or competing state model.

## WP011-R04 — Clarification projection and answer mapping

Design: [plan 3](011-llm-parser-contract-plan.md#3-request-and-response-boundary).

Existing parser contracts distinguish person, replacement-source, year-conflict, keyword-meaning and capacity projections. Existing canonical person sessions retain authoritative question references and sequences. Binding foundation `ebe4c41`/`c5d4b3e`, actions `fa026dc` and refinement `ab704c3` implement a limited canonical-person path, not all projected capabilities.

Open:

- Verify and implement remaining exact source/meaning/year/capacity response-to-action mappings using actual WP 010 contracts. Offered references interpret a choice; they do not establish identity or accepted criteria.
- Preserve unmentioned proposed year bounds: proposed 2020–2010 plus “Dann ab 2000” yields a proposed 2000–2010 pair before controlled acceptance. Do not fabricate an entity pending reference for a year question.
- Existing `person-clarification-lifecycle.ts` still offers/reconciles the first canonical pending person. Owned and non-person question support requires authoritative session contracts and real callers, not merely a criterion enum value.
- Define routing before consumption: the deferred action path closes/consumes a question, whereas the parsed-refinement path needs the still-live original binding. Do not run them in sequence or revive a closed question from followUp data.
- Verify no-active-question, explicit-other-request, additional independent wish, stale same-revision question and scoped discard scenarios for each affected path.

## WP011-R05 — Executable field contracts and fixtures

Design: [plan 2](011-llm-parser-contract-plan.md#2-contract-ownership-and-common-field-rules--r05) and [plan 3](011-llm-parser-contract-plan.md#3-request-and-response-boundary).

Implemented evidence is no longer wholly pending:

- `b2e8407`, `0400ce4`, `4eac220`: dedicated `src/lib/schemas/parser.ts`, `compose-request.ts`, `validate-response.ts`, synthetic fixtures and tests, including explicit keyword/capacity-context coverage.
- The response boundary distinguishes completion failures, JSON/schema validity, request association, excerpts, reference membership and aggregate limits. A JSON Schema export function exists; provider compatibility is not thereby verified.
- `db830a5` adds concrete continuation ownership/bounds; subsequent binding and original-refinement-request schemas extend application associations without making model references authoritative.

Open:

- Complete the field-by-field comparison between plan, executable context/proposal contracts, fixtures and application mappings. Verify source/meaning/discard and mixed-operation examples rather than treating named scenarios as complete fixtures.
- Verify remaining JSON Schema/export combinations and document actual limitations without weakening local domain contracts. Earlier export implementation does not validate every later schema or provider.
- Canonical pending queries cannot retain a distinct spelling correction. Current `unsupported-correction` rejection avoids silent loss but leaves the original-plus-hint requirement unfinished. Preserve a single query owner when extending it.

Constant decision update, 2026-11-17: the user withdrew the former migration task. `MAX_PERSON_IDS` and `MAX_PERSON_CLARIFICATION_CANDIDATES` intentionally remain separate, currently five each; `MAX_PERSON_CLARIFICATION_KNOWN_TITLES` remains two. This is not an open R05 migration requirement or evidence of a completed reference inventory. See decision supplement section 6.

## WP011-R06 — Bindings, staged validity and acceptance

Authority: [specification](../docs/work-packages/011-llm-parser-contract.md#staged-resolution-results-and-current-state-acceptance), accepted [decision B](../docs/work-packages/011-parser-contract-decisions.md#5-r06--retain-validated-results-for-unchanged-child-queries), [plan 4.4](011-llm-parser-contract-plan.md#44-r06--result-validity-and-current-acceptance), and [binding supplement](011-parser-continuation-binding-plan.md).

Implemented portions:

- `ebe4c41`/`c5d4b3e`: bounded strict registry and pure issue/check/consume/reconcile/epoch-retirement helpers, with unit suites.
- `f6d9db2`: registry reconciliation on applied edits, using post-edit context and exact query invalidations.
- `fa026dc`/`ab704c3`: bound canonical-person action/refinement processing. Consume checks the pre-state; remaining bindings reconcile against the post-state. Rejections return no partial stores. A query no-op can still complete a question without changing criteria revision.

Open:

- Trusted original-request loading/routing, reference allocation without lifetime reuse, processing permissions and complete invocation consumption need coherent application integration. Matching shapes or returned check data are not durable authority.
- Registry epoch retirement alone does not pause a workflow or close questions. Implement interruption/resume coordination without automatic work and without reopening old questions.
- Store validated unchanged-child facts separately from outstanding response permissions. Current continuation children have no trusted-result staging contract. Never rebase stale incoming responses to retain facts.
- Integrate source/capacity/dependency/provenance checks and full current-state atomic replacement/selection acceptance. Existing singular acceptance guards remain authoritative.
- Verify self/sibling refinement, scalar/source/capacity changes, interruption/resume, reset/recreate, late/duplicate responses and partial/unexpected failure without mutation.

Pure proposals require caller-controlled atomic persistence and concurrency exclusion; no exactly-once external execution or storage transaction is established here. Live provenance/resolution belongs to WP 014, not a model assertion.

## Prioritized implementation and verification queue

1. Complete current typecheck, ESLint and statement-coverage evidence before calling the latest code fully green. Tests are user-reported passing; the assistant has not run validation.
2. The focused review reconciliation is recorded in `528bc21`; the subsequently withdrawn constant migration is not part of the remaining queue.
3. Bound canonical single-person acceptance with continuation/question/registry coordination, reusing existing trusted selection/acceptance validation.
4. Owned-target result/question contracts and staging, together with concrete lifetime/invalidation design.
5. Protected reservation arithmetic and competition, then full atomic compound/whole-selection acceptance.
6. General mixed-result application, remaining clarification mappings and lossless retained work; include canonical correction metadata before claiming the complete query contract.
7. Final scenario, field/caller, downstream-documentation and validation review before explicit WP 011 acceptance.

Design verification precedes each affected code slice. Do not require provider/UI integration for deterministic domain tests. Follow repository test conventions, including real internal transitions, synthetic fixtures and coverage-intent comments. Required statement coverage remains at least 80%, including unimported application modules.

The queue is not blanket authorization for every file change or commit. Resolve each concrete target/content and obtain its write approval. No further product-decision round is required for already accepted policies.

## Execution status

The review reconciliation in `528bc21` superseded the former blanket statement that all implementation evidence remains pending. No R01–R06 finding is finally closed. Existing implementations and user reports remain bounded by the scopes above and the progress ledger. This later documentation amendment records the explicit withdrawal of the constant migration and removes it from active review work.

The earlier preparatory inspection confirmed the definition and clarification-schema consumer plus existing five/six-candidate and two/three-known-title boundary tests. It was not a complete reference inventory. The user ended the migration task; do not continue an inventory for removal of a constant that must now remain independent.

Only the six related documentation files are aligned by this amendment. No runtime code, tests, prompt, provider integration, HTTP/CLI/UI, persistence, title execution, PR or merge is changed. The assistant ran no validation commands. WP 011 remains incomplete; dependency order remains WP 011 → WP 014 → WP 012. Other downstream package/wizard alignment and unrelated reference/caller work remain explicit follow-ups where not completed.
