# WP 011 — LLM parser contract implementation plan

## Status and approval

- Status: Consolidated technical draft — awaiting consistency review and application implementation approval.
- Created: 2026-11-16. R01 design and R01–R06 consolidation: 2026-11-17.
- Target branch: `feat/011-llm-parser-contract`; current documentation baseline: `ed48ad3a9c43d6d4bb1f47d2778dca10c62f24a9`.
- Product authority: [WP 011 specification](../docs/work-packages/011-llm-parser-contract.md), including accepted reservation/result-validity rules integrated in `113a5ab`.
- [Decision history](../docs/work-packages/011-parser-contract-decisions.md): A/R02 and B/R06 explicitly accepted and recorded in `a2c548e`; do not reopen those decisions. [Review checklist](011-llm-parser-contract-review.md) tracks verification, not another product contract.
- Decision update 2026-11-17: the user withdrew the person-limit constant migration. Keep `MAX_PERSON_IDS` and `MAX_PERSON_CLARIFICATION_CANDIDATES` independent, currently five each, and the known-title limit at two. See decision history section 6. This task is withdrawn, not completed.
- This change consolidates the discussed technical directions. It does not approve application implementation or assert that R01–R06 are closed, tested or implemented. Prompt and review-file alignment are separate next steps.
- Follow [AGENTS](../AGENTS.md), [Typing](../docs/typing.md) and [Testing](../docs/testing.md). Reuse completed WP 009/010 rather than reopening them.
- Deferred UI task: [clarification wizard flow](clarificaton-wizzard-flow.md), renamed by the user and verified at `ed48ad3`. Use this exact filename. Its older commit/skip/parser-status wording still needs a separately scoped alignment.

## 1. Scope, existing evidence and limitations

WP 011 owns dedicated parser contracts, pure request composition/response validation, the pure application adapter and necessary explicitly planned domain extensions. No provider client, HTTP endpoint, CLI implementation, live identity lookup, retry timers, persistence, UI, browser journey or title-search execution is authorized here. Dependency order: WP 011 → WP 014 → WP 012; title disambiguation/providers remain WP 013.

Historical evidence: initial review `5c85d69`, follow-up `a6fe74b`, initial plan `99b5a2d`, prompt/schema alignment `a8dbca0`, instruction draft `d4138d9`, English instruction revision `0.1.1-draft` in `166e144`, consolidated contract `5fa186d`, R01 design `b984463`. The recorded identical-tree comparison concerns the initial/follow-up baselines only. No exhaustive caller inventory, local cleanliness, installed runtime or passing validation follows from it.

| Existing boundary                 | Reuse / concrete gap                                                                                                                                                                            |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SearchState`, `search-state.ts`  | Accepted people are canonical ID/name records; pending requests have stable references. Singular replacement and shared pending-addition bounds exist; compound replacement is not implemented. |
| `applyIntent()` / `extraction.ts` | Atomic filter-group application and complete active/inactive genre-wish handling exist. List set/replace is whole-list behavior, not targeted replacement.                                      |
| `applyPendingQueryCommand()`      | Existing referenced person/keyword add/change/remove, stale guards and normalized no-ops remain authoritative.                                                                                  |
| `acceptResolvedPerson()`          | Trusted single-person acceptance removes its pending request atomically and deduplicates by ID. Do not call it repeatedly to simulate atomic multi-replacement.                                 |
| Keyword acceptance                | Inspected pending schema represents additions; controlled acceptance and replacement require a planned extension, not model IDs through ordinary filter changes.                                |
| WP 010 guardrails                 | Replacement-target, year-conflict and keyword-meaning sessions/actions exist. Reuse their question ownership and sequence checks.                                                               |
| Person lifecycle/correction       | Prior review found first-pending assumptions. Inspect affected callers/tests before adding explicit non-first targeting.                                                                        |
| Source clarification              | Existing source offers need an application-validated eligible subset and preservation of the complete replacement intent.                                                                       |
| Tooling                           | Prior review recorded Zod 4.6.7. Verify actual dedicated-schema export with native `z.toJSONSchema()`; no converter dependency or provider compatibility is assumed.                            |

The earlier direct-read tests include pending operations, semantic guardrails, year-range and selected chat/search schema suites; this is not a full audit. All planned new checks below are unexecuted. The direct current plan fetch was truncated; R01 commit content, prior complete material and the `ed48ad3` formatting diff informed this consolidated rewrite. Do not represent that as a fresh complete read of every intervening revision.

## 2. Contract ownership and common field rules — R05

Maintain one Zod source for each external structure in `src/lib/schemas`, derive public types with `z.infer`, and derive JSON Schema consistently. Reuse existing field schemas, catalog keys and constants. Strict external variants reject unknown fields. Do not export the complete domain state as model output, remove existing domain transforms for export, duplicate manual interfaces, or add runtime parsing/schema wrappers to every internal helper. Runtime parsing belongs at actual boundaries.

Missing required field is invalid. Nullable means only the meaning explicitly assigned to that field; null is not a universal removal command. Fields not belonging to a variant are forbidden rather than optionally meaningful. Lists are non-empty unless an explicit empty meaning is specified.

Reusable model query: `{text, correction}`; both keys required. `text` is the supplied term, not an invented expansion. `correction` is null or a non-empty spelling suggestion. It is neither another requested person nor trusted identity evidence. Preserve the original input/term ephemerally; no permanent real-conversation storage.

Source selector for accepted-value changes: `{mode: "reference", ref}` or `{mode: "unresolved", description}`. References must be supplied, of the matching criterion kind and accepted-target scope. Unresolved wording cannot authorize immediate removal/replacement. No provider IDs, authoritative revisions or model-allocated request references.

Pending references have typed application bindings: whole intention versus individual query. Refinement accepts query scope only; discard must use the explicitly supplied intention/query scope. Unknown, wrong-kind or stale references are application rejection, not identity evidence.

Technical bounds: input 8,000 characters; term/correction/label/source wording 512; opaque reference 128; 32 response groups; 64 total items and 64 total query entries across the complete response. `inputExcerpt` is required, non-empty, at most the input limit and a literal substring of current input; overlapping excerpts are allowed. Containment does not prove semantic completeness or identity. Count text lengths using JavaScript UTF-16 string length, consistently in validation/tests; do not silently normalize excerpts before containment checking.

Continuation bounds: 64 open intentions, 64 total owned/linked child queries counted once, 64,000 retained continuation-text characters. Count retained source wording, terms, corrections and excerpts without storing duplicate canonical text. Non-query retained work also counts toward the intention/text bounds. Stable bounds belong in `src/lib/config/domain.ts`, not duplicated numeric schema literals or environment secrets. Criterion limits remain unchanged. Provider context/output-byte limits are separately verified before connection.

Never truncate, evict wishes or pick a subset to satisfy bounds. Reject an over-capacity proposed state/session without mutation; caller retains current input in its ephemeral editor and shows a capacity fact. Discard/cleanup remain usable at full capacity. Reject composition before a model call if required context cannot be supplied intact.

## 3. Request and response boundary

### Internal invocation envelope

Application-owned fields: `requestRef`, `baseRevision`, `sessionSequence`, immutable supplied `context` and current `userInput`. Bind the call to the session lifetime and relevant active-question association. Consume an invocation once; reset cannot revive old requests. These fields are not model-generated authority.

### Model-visible context

Compose fixed English instructions, serialized context and current untrusted user input as three logical parts. A later provider adapter maps them to API roles/options. Do not transmit credentials, result caches or full conversation history by default.

Context contains:

- `contractVersion`: draft literal `0.1.0-draft`, separate from instruction version.
- `catalogVersion` and `capabilities`: existing versioned catalog projected to supported operations, field-dependent scalar values and bounds; never blanket permission to emit IDs.
- `criteria`: current mediaType/sortBy, nullable absent minRating/minYear/maxYear, and accepted person/keyword/genre descriptors. Each descriptor has application `ref` and `label`; genre additionally has active/inactive activity. Provider IDs stay in application bindings. Genre descriptor order represents the complete wish.
- `pending`: readable projections of canonical and continuation work. Each supplied reference explicitly identifies intention or query scope and criterion; query descriptors include original/corrected term and one of unresolved, needs_clarification or resolved as a projection, not a second stored state. Include operation, parent association where applicable and source description/binding. A simple canonical request needs no artificial stored parent. Project canonical lifecycle facts from their responsible application contexts, not nonexistent fields on the pending record.
- `activeClarification`: null or the kind-specific projection below. Supply only the relevant current question; do not copy a mutable question into continuation state.
- `genreCatalogs`: complete application-supplied Movie/TV labels and available aliases with media association, derived from validated catalogs. Mapping remains application-owned; equal display labels alone are not interchangeable identities.

Closed context subjects are person, keyword, genre, mediaType, minRating, minYear, maxYear, yearRange, sortBy and workflow. Query statuses are the three states above; operation values follow the matrix below. Blocker reasons projected from application evaluation are source, identity, capacity, semantic_conflict and unsupported. They are not editable model-controlled state.

### Kind-specific active clarification — R04

| Kind               | Relevant model-visible information                                                                                                   | Controlled response mapping                                                                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| person             | Exact pending query reference, original term/refinement context, parent/source operation where applicable; ambiguous/no-match reason | Refine that query; explicit addition remains separate. Identity selection still requires trusted resolution/selection validation.                                   |
| replacement_source | Retained intention, complete replacement terms and offered eligible accepted-source refs/labels                                      | Interpret source reference, check offered membership/current binding, then continue the retained operation. No source removal yet.                                  |
| year_conflict      | Contradictory proposed minYear/maxYear, distinct from accepted criteria                                                              | Interpret set/remove for the mentioned bounds; preserve unmentioned proposed bounds, validate the full pair, then map to the existing correct-years action.         |
| keyword_meaning    | Pending query, original term and supplied option refs/labels/queries                                                                 | Offered meaning selection or textual refinement; neither accepts a keyword ID.                                                                                      |
| capacity           | Affected intention/query refs and application-computed occupied/reserved/maximum counts for the criterion                            | Explicitly scoped discard/refinement or another supported proposed change, followed by capacity reevaluation. Do not invent a fully implemented capacity guardrail. |

The exact question token, source revision and session sequence remain in the application invocation association. Never use an entity pendingRef for a year conflict that has no entity request. Prepared buttons bypass the LLM. Free-text source/meaning selection may return only a supplied target/option reference; application validation remains authoritative. No active question means a bare name cannot answer a closed question; explicit reference to other pending work takes precedence.

### External response matrix — R05

Top level: required `contractVersion` and ordered `groups`; each group has a non-empty `items` array. Each item requires `kind` and `inputExcerpt`; action items additionally require the operation/action listed. Only listed variant fields are allowed. Groups suggest coupling, never authorize it. Empty groups means no extracted changes, not successful fulfillment or execution permission; caller must not report unsupported/uninterpreted content as fulfilled.

| Variant                               | Required payload / scope                                                                                                                                                                                            |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| filter / set                          | `field`, field-dependent `value`: mediaType movie/tv/all; minRating number 0–10; year bounds integer 1900–2100; sortBy existing catalog value. Derive from existing schemas, not a loose field/value cross-product. |
| filter / remove                       | `field` minRating/minYear/maxYear; no value. Reuse existing optional-scalar removal.                                                                                                                                |
| entity / add                          | `entityType` person/keyword, non-empty `queries`.                                                                                                                                                                   |
| entity / refine                       | `entityType`, supplied query-scope `pendingRef`, one `query`; no source/operation replacement.                                                                                                                      |
| entity / replace                      | `entityType`, `source`, non-empty `queries`. Preserve all destinations as one replacement.                                                                                                                          |
| entity / remove                       | `entityType`, `source`; no queries. Unresolved source wording is retained for target clarification, not applied.                                                                                                    |
| entity / discard                      | `entityType`, `target` with `scope` intention/query and supplied `ref`; no accepted source.                                                                                                                         |
| entity / replace_all                  | `entityType` keyword only, non-empty `queries`, no source.                                                                                                                                                          |
| genre / add                           | Non-empty `queries`.                                                                                                                                                                                                |
| genre / refine                        | Query-scope `pendingRef`, one `query`.                                                                                                                                                                              |
| genre / replace                       | `source`, non-empty `queries`.                                                                                                                                                                                      |
| genre / remove                        | `source`; no replacement queries.                                                                                                                                                                                   |
| genre / discard                       | `target` with intention/query scope and supplied ref.                                                                                                                                                               |
| genre / replace_all                   | Non-empty `queries`, complete active/inactive wish, no source.                                                                                                                                                      |
| clarification_answer / select_source  | Supplied accepted `sourceRef` from the current offered source choices; question binding comes from the invocation.                                                                                                  |
| clarification_answer / select_meaning | Supplied `optionRef` from the current keyword-meaning choices; no identity ID.                                                                                                                                      |
| clarification                         | `subject` from the closed subject set, reason missing_value/ambiguous_meaning/ambiguous_reference, and `relatedTarget` null or a supplied intention/query target. No invented UI question/options.                  |
| unsupported                           | Reason unsupported_criterion/unsupported_operation; preserve request excerpt, no substitute criterion.                                                                                                              |

Year free-text answers use typed filter set/remove parts, not ambiguous null values. For proposed 2020–2010 and answer “Dann ab 2000”, retain proposed maxYear 2010 and validate 2000–2010 together. Existing correct-years output receives both bounds, with null only for explicitly removed bounds. Contradictory extracted bounds remain representable outside accepted state; do not reject the whole extraction merely for their joint conflict.

Incomplete names remain queries. Out-of-range numeric wording is not silently corrected. Clear-all via an empty replace_all list and person replace_all are not introduced; retain/clarify such requests rather than guessing. Stop/reset/resume remain application-owned workflow choices; free text can request workflow clarification but cannot directly reset state, resume closed work or authorize search.

Examples to retain/align: addition of Brad Pitt; active Chris-to-Chris-Evans refinement; Tom Hanks to Tom Cruise and Brad Pitt; whole genre replacement with Komödien/Thriller; original Tom Hnaks with correction Tom Hanks; independent TV change plus unresolved Chris; source/meaning option interpretation; year-conflict correction; explicitly scoped parent versus child discard. Fixtures must include complete context/ref registries, not just isolated output JSON.

Reject fabricated/wrong-kind refs, provider IDs, authoritative revisions, unknown variant fields, inappropriate source/value/query fields, empty replacement lists, unsupported operation cross-products, absent excerpts and aggregate overflows. Schema shape and application membership/staleness are distinct checks. Do not add unit tests for generic Zod primitives alone.

## 4. Pure application coordination

Normalize completion/status before JSON parsing, then validate the whole external response and invocation association before mutation. Normalized technical failures: refusal, incomplete, timeout, transport_error, malformed_json and schema_invalid. Failed/refused responses need not contain success JSON. No repair, repeat model call, provider failover or implicit search.

`apply-parser-result.ts` is one pure entry point with explicit state/session/context/catalog inputs and reference allocation dependency. Work on copies; return validated next state/session and structured applied/retained/rejected facts. Caller persists state/session together under concurrency control. Existing domain transitions retain their revision increments. Fresh synchronous commands may use the preceding transition's revision; old external responses may not be relabelled.

### 4.1 R01 — Continuation ownership and lifecycle

Canonical simple requests stay in SearchState.pendingQueries. Continuation links never own a second editable copy of canonical query text or operation. Compound replacements and not-yet-admissible intentions own their child queries in bounded ephemeral context; accepted criteria stay only in SearchState. A child has one owner and at most one parent. An ownership transfer removes old storage, installs new storage and updates bindings atomically; any failure preserves original state/session.

A query-bearing intention has application `ref`, criterion, add/replace/replace_all operation, operation-specific source, ordered non-empty children and an edit generation. Each owned child has its own ref, query, generation and one exclusive state: unresolved; needs_clarification with ambiguity/no-match context; resolved with a trusted staged fact. Technical errors do not discard it or impersonate no-match. A compound replacement's children are never inserted as independent pending additions.

Linked children obtain text/operation from canonical pending records, and question/processing associations from their responsible application contexts. They do not assume canonical pending records already store child generation or resolution status. Extra binding metadata, where needed, belongs to the invocation/session boundary, not duplicated criteria. A missing/wrong-kind canonical reference is an inconsistency, not completion.

An unresolved non-query operation, such as removal with an unclear source, retains its validated proposal and blocker under a bounded intention reference; do not create an artificial entity query or empty replacement. Retained coupled groups refer to owned intentions instead of copying them. All retained work counts against continuation bounds and search readiness.

Blockers/readiness are derived from current context, not independently editable duplicate status. Parent/child refs are unique in the session and never reused within its lifetime; linked children retain canonical request identity. Questions belong to existing clarification sessions and are associated with the parent/child and relevant generation, never copied into a second question store.

Lifecycle:

1. Create only after bounds/ownership validation; preserve order and unresolved source wording. Clarify source first without losing destinations.
2. Refine only the addressed child; advance child and parent edit generations; invalidate affected result/candidates/questions. Preserve siblings/source subject to R06.
3. Stage a valid owned-child resolution without accepting one destination of a compound replacement. No match/ambiguity keeps the same child.
4. Discard a child explicitly; reevaluate the remaining operation. Discarding the final child discards the replacement, never removes the accepted source.
5. Discard a parent removes its remaining owned/linked open work and bindings through controlled transitions, not unrelated accepted criteria.
6. Pause closes question and outstanding response authorizations; retains wishes and already validated unchanged-child facts. Resume only deliberately.
7. Accept compound replacement/whole selection only after full current validation; update state/session and remove open work together. Do not simulate this with successive single-person acceptances.
8. When a linked canonical request is accepted or explicitly discarded, reconcile the parent and question bindings in the same controlled state/session result. Acceptance fulfills that part; discard retracts it; unexplained disappearance is an error. Remove its open link and finish an empty parent. Previously accepted independent additions are not undone when the remaining group is later discarded.
9. Return bounded completion facts and remove completed/discarded open records; no permanent conversation history or unbounded tombstone list. Allocation/session lifetime prevents reference revival.

Eight required design scenarios: partial replacement resolution retains source; child refinement preserves siblings; child discard preserves operation; final-child discard retains source; pause/resume rejects old question; owner transfer avoids duplicates; full-capacity rejection retains work and permits cleanup; accept one linked independent addition then discard the remainder without undoing the accepted person. They are future test expectations, not passing tests.

### 4.2 R02 — Capacity and protected reservations

Distinguish accepted occupancy, valid allocated reservations and retained unallocated overflow. Existing reservations have precedence over later wishes. Evaluate new related capacity-competitors together; if they do not all fit, retain them for explicit choice, never schedule a subset merely by iteration order. Independent noncompeting changes may proceed.

Canonical pending additions keep their existing one-slot reservation until their normal transition removes/accepts them. Do not free it on a model guess or count a linked copy again. Owned unresolved terms conservatively count once each; validated duplicate IDs within an operation count once. Do not pre-deduplicate unresolved names.

For a bound single-source replacement: let A be current accepted IDs, s its source, D the distinct currently valid resolved destination IDs and u the unresolved destination count. Additional reservation r = max(0, |D minus (A minus {s})| + u - 1). The source remains accepted; r is extra space, not removal permission. For an owned addition use r = |D minus A| + u. These are proposed conservative per-operation calculations to verify with fixtures/property cases, not already verified production arithmetic.

Admit only when accepted occupancy plus canonical addition reservations plus owned-operation additional reservations stays within MAX_PERSON_IDS, with no duplicate accounting. Multiple operations cannot spend the same source slot. Do not credit possible future removals or cross-operation duplicate savings independently; explicit dependent operations require R03 common final-state validation. An unbound source receives no source-slot credit and remains unallocated until bound/validated. Changes invalidating an existing replacement source must be reconciled explicitly, not silently convert its reservation to an addition.

Reevaluate after trusted resolution, refinement, discard, accepted-state changes and immediately before acceptance. Decreases release unused extra reservation. A change increasing demand cannot evict other valid reservations: the affected change must fit or remain pending for explicit capacity handling. Final acceptance always deduplicates actual IDs and rechecks all remaining reservations. Moving records between owners transfers, never duplicates, reservations.

Example: four accepted, one-to-two unresolved replacement needs one extra slot; one-to-one replacement at five accepted needs no extra slot. A later addition cannot steal an allocated extra slot. Simultaneous related wishes exceeding capacity remain for choice. Retaining overflow does not allocate a hidden sixth slot. Eligibility becoming true does not start processing/search or resume interrupted clarification.

Keywords retain their active-plus-pending limit; genre active/inactive values share the existing unique-wish limit. Whole-selection replacement validates the new complete set atomically while retaining the old selection; do not sum old and new as if both were simultaneously active. Confirm concrete keyword extension/reservation mapping in the targeted pre-code review.

### 4.3 R03 — Dependencies and conflicts

For each proposal derive required targets, modified targets, complete-selection scope, year-range effects and capacity effects. The model cannot declare these authoritative. Preserve model grouping as a minimum coupling constraint; merge overlapping/dependent groups as needed, never split a coupled intention to claim partial success.

Rules:

- Same accepted/pending target: evaluate together. Explicit semantic self-correction may supersede an earlier value; mention order alone does not authorize generic last-write-wins. Ambiguous replace/remove instructions retain both meanings for clarification, not a destructive remove-first attempt.
- Whole-selection replacement overlaps every change to that criterion. Compose an explicit sequence such as replace genres with Comedy then add Thriller into the complete intended final selection and validate together.
- minYear/maxYear edits share one resulting range, including an existing active year-conflict proposal. Contradiction produces the existing semantic guardrail, not partial boundary application.
- Shared capacity invokes R02; it does not turn every person request into an atomic replacement. Explicit remove-to-make-room dependency is coupled: do not remove the source while the dependent destination is unresolved.
- A proposal changing the source/context of existing open work must reconcile that work or retain the conflicting change, never strand its references or silently erase it.

Preflight the complete proposal, derive coordination units, resolve clearly expressed composition and retain true semantic conflicts. Apply executable independent units on a working copy through existing transitions. Expected semantic blockers retain their whole unit while unrelated valid units may succeed. Any unexpected internal inconsistency rejects the whole working-copy result. State/session outputs commit together. No lookup, rendering, retry, result-cache update or execution occurs here.

### 4.4 R06 — Result validity and current acceptance

Maintain application-owned session lifetime and processing epoch, child edit generation, parent/source association and lookup-attempt identity. A lookup captures these bindings and the original global source revision; clarification selections additionally require the actual current offered context. Do not expose authority to the model.

Validate incoming responses against their original live invocation/request association before staging. Reject stale, closed, cancelled, wrong-generation, repeated or wrong-target responses; never rewrite sourceRevision or attach an old response to a new same-name request. A fresh attempt supersedes the previous attempt. Per-attempt consumption is bounded by active work, not an unbounded response history.

Staging a valid owned-child fact is not accepted-state mutation, identity adoption or a reservation guarantee. It updates session bookkeeping, not the query's edit generation. Several results for unchanged children may be staged without pretending each was accepted into SearchState. Existing canonical single-person acceptance retains its global revision guard unchanged.

Already validated staged facts may survive unchanged-child context changes: refining a sibling, unrelated scalar edits, or confirmed interruption. They do not themselves authorize the changed parent's acceptance. Refining that child invalidates its own fact/candidates; discard/reset removes corresponding open work. Source changes/removal invalidate the operation's authority; never automatically bind another source. Capacity changes force reevaluation, not identity guessing.

Interruption closes outstanding response authorizations and the active question, preserves valid unchanged-child facts and creates no new lookup. Deliberate resume issues fresh bindings only where needed. A result first arriving after its binding became stale cannot be promoted into the retained-fact category. This distinction preserves the accepted B/R06 policy without bypassing old-result guards.

Atomic compound acceptance receives the current expected state/session association plus validated staged facts with unchanged original provenance. The proposed domain extension verifies source, child membership/current query generation, complete destinations, identity provenance, ID deduplication, R02 capacity and R03 dependencies before a single controlled acceptance result. A new current-state acceptance command is not a relabelled old provider response. Exact function/type signatures and all affected callers must be reviewed before code, with WP 014 owning provider provenance and no autonomous recovery.

## 5. Implementation file map and targeted inspection

| File/group                                                                               | Planned work                                                                                                                                                                            |
| ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/schemas/parser.ts`                                                              | Strict external context/proposal/normalized outcome contracts, inferred types and native derived JSON Schema; verify actual export.                                                     |
| `src/lib/schemas/parser-application.ts`                                                  | Bounded continuation and public application associations only where runtime validation is needed; no schema per internal helper.                                                        |
| `src/lib/parser/compose-request.ts`                                                      | Pure minimal context projection and separated request parts.                                                                                                                            |
| `src/lib/parser/validate-response.ts`                                                    | Status/JSON/schema rejection without repair/retry.                                                                                                                                      |
| `src/lib/domain/search/apply-parser-result.ts`                                           | Pure ownership/dependency/reservation coordination using real transitions.                                                                                                              |
| `src/lib/parser/instructions.ts`                                                         | Later align the existing single English prompt, currently 0.1.1-draft, with final model fields and increment instruction revision. No internal ledger/staging implementation in prompt. |
| `search-state.ts`, `search-transition.ts`, `pending-operations.ts`                       | Minimal explicitly reviewed compound acceptance, keyword acceptance/replacement and required state invariants. Preserve current duplicate/name retention and stale guards.              |
| Semantic guardrail schema/domain                                                         | Eligible offered-source subset, complete replacement context, projected question-kind mappings; preserve existing year/keyword behavior.                                                |
| Person session/correction/lifecycle/action/selection modules                             | Inspect exact callers/tests; explicit non-first targeting and cleanup reconciliation without reordering unrelated wishes or duplicating question state.                                 |
| Existing genre compatibility/catalog/application modules                                 | Confirm targeted/whole-selection mapping and active/inactive order; no invented provider IDs. Inspect concrete paths before editing.                                                    |
| `src/lib/config/domain.ts`, `src/lib/schemas/clarification.ts`, discovered callers/tests | Preserve independent search-state, candidate-group and known-title limits; the former constant migration was withdrawn on 2026-11-17. |

No automatic barrel exports, catch-all types.ts, provider dependency, route, UI scaffolding or unused implementation files. Reuse and extend current tests/fixtures before introducing new shared helpers.

## 6. Tests and implementation sequence

First review this consolidated draft and complete only the affected caller/test inventory, including existing genre/numeric semantics and the proposed controlled compound/keyword acceptance signatures. This documentation does not substitute for that inspection or approve implementation.

Then, under an approved file-level code scope:

1. Add failing project-specific composition/response tests and implement dedicated external contracts/JSON-schema derivation.
2. Add failing ownership, linked-completion, full-capacity and question-association tests; implement minimal continuation contracts.
3. Add reservation/deduplication/overflow tests, including the R02 formula before/after partial resolution, existing-reservation precedence, simultaneous new competition, source included as destination and no double reservation.
4. Add dependency tests: TV plus unresolved replacement; same-target replace/remove; whole genres plus add; split year bounds; explicit removal needed for capacity; self-correction versus actual conflict.
5. Add staged-result tests: refine self/sibling, unrelated scalar change, capacity/source change, pause/resume, reset/recreate same name, duplicate/late response and stale incoming versus already validated fact.
6. Implement only the approved pure domain extensions and adapter with real existing transitions; test working-copy rejection and mutation isolation.
7. Extend explicit non-first targeting/source-offer subset paths; preserve independent person-capacity and candidate-group limits.
8. Run focused suites, then current project scripts for test, coverage, lint and typecheck; report actual results and commands not run. Seek approval before application-code commit/PR/merge.

Proposed test locations: `tests/unit/schemas/parser.spec.ts`, `parser-application.spec.ts`, parser composition/validation unit suites and `tests/unit/domain/search/apply-parser-result.spec.ts`, plus existing affected regressions. Verify exact local naming before creation. Synthetic context/provenance fixtures only; mock external boundaries, not the module or its domain collaborators. Unit tests need the required Statement coverage/Branch coverage comment immediately above the declaration; unit tests do not need integration IDs. Do not duplicate generic Zod missing-field/primitive behavior as standalone tests.

Use `pnpm test`, `pnpm test:coverage`, `pnpm lint`, `pnpm typecheck` after checking current package scripts. Statement coverage minimum 80%, including unimported application modules; branch coverage is diagnostic, not an invented separate hard threshold. Composed domain tests remain unit tests, not HTTP integration. No new Playwright/HTTP/browser/live-provider work in this slice.

## 7. Remaining verification and downstream alignment

| Finding | Consolidated design location                            | Remaining evidence                                                                                             |
| ------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| R01     | 4.1, including both follow-up rules and eighth scenario | Consistency re-review and later executable tests; not closed here.                                             |
| R02     | 4.2; accepted A policy in authoritative specification   | Verify arithmetic/multi-operation interactions and domain mapping with tests; not closed here.                 |
| R03     | 4.3                                                     | Validate complete examples and adapter grouping behavior; not closed here.                                     |
| R04     | 3, kind-specific context/response mapping               | Align with actual WP 010 action contracts/callers and final schema; not closed here.                           |
| R05     | 2–3                                                     | Verify actual Zod export and aligned fixtures during approved implementation; no provider compatibility claim. |
| R06     | 4.4; accepted B policy in authoritative specification   | Review acceptance signatures and demonstrate stale/staged distinction through tests; not closed here.          |

The next separate file steps are parser-instruction alignment, review-checklist reconciliation and decision-history backlinks. Do not start six new product-decision rounds or mark all findings closed just because this draft is saved. If a concrete unresolved product issue is discovered in targeted implementation design, identify only that issue; do not silently expand functionality.

WP 012/WP 014 and [the renamed wizard task](clarificaton-wizzard-flow.md) still need separately reviewed documentation alignment for explicit confirmation, executed snapshots, controlled acceptance, bounded retries and cancellation/resumption. Their older wording does not override the current WP 011 decisions. WP 010 remains complete. AGENTS already identifies WP 011; do not revive the historical stale-WP-010 finding.

The first later interactive test surface remains a real-LLM CLI with initially mocked search data/execution. NVIDIA Build, OpenRouter and Google AI Studio/Gemini API remain unselected options, not verified integrations. Provider/CLI implementation needs separate approval; deterministic contract tests do not wait for it.

## Execution status

This revision updates only this technical plan and uses the verified new `clarificaton-wizzard-flow.md` filename. It consolidates the existing R01 design/follow-up and discussed R02–R06 directions under the accepted specification; it does not modify the prompt, review checklist, decision record, application code, tests or other work packages. No tests, coverage, ESLint, typecheck, schema-export check or provider call ran. No PR or merge. Remote evidence does not establish local cleanliness or absence of unpushed changes.

Decision amendment 2026-11-17: the former migration instruction in this plan is withdrawn by explicit user decision. Both constants remain independent and unchanged, with the known-title limit separate. The six related documents are aligned in the same documentation commit; runtime code is not changed. The incomplete preparatory inventory is not claimed completed. Current implementation/check evidence remains in the progress ledger rather than inferred from this historical design sequence.
