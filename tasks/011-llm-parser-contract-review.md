# WP 011 — Technical contract review findings

## Status and scope

- Recorded: 2026-11-16; R01 design progress and accepted R02/R06 policies recorded 2026-11-17.
- Reviewed branch: `feat/011-llm-parser-contract`.
- Reviewed baseline: `5fa186d4a52ed267b70691f5c117e4b5ca1cc8f4`.
- Verdict: not ready for schema/adapter implementation. R01 design awaits follow-up; R02/R06 behavior policies are accepted but technical integration/review is pending. No finding is closed by this update.
- Product authority: [WP 011 specification](../docs/work-packages/011-llm-parser-contract.md). Subsequent accepted decisions A/R02 and B/R06 are recorded in the [decision supplement, sections 4–5](../docs/work-packages/011-parser-contract-decisions.md#4-r02--protect-existing-reservations), pending technical consolidation.
- Review target: [implementation plan and concrete contract draft](011-llm-parser-contract-plan.md).
- This file tracks findings and closure evidence, not an alternative product specification. Settled product decisions remain unchanged. R01's accepted direction is recorded in plan section 4.1; other proposed remedies are not approved schema designs or implemented behavior unless explicitly identified as accepted policy below.
- Recording findings or an accepted design direction does not approve application implementation, a PR or a merge.

The original review was static and read-only. Directly read at the baseline: the specification, plan, `src/lib/schemas/search-state.ts`, `src/lib/schemas/semantic-guardrails.ts`, `src/lib/domain/search/pending-operations.ts`, `src/lib/domain/search/apply-intent.ts` and `src/lib/domain/search/extraction.ts`. This was a targeted contract review, not a complete caller/test audit. No tests, coverage, ESLint, typecheck, schema export or live provider checks ran. Remote inspection does not establish local working-tree cleanliness.

## Work queue

No finding is closed. Blocking means the affected design cannot safely be implemented as currently specified; the additional clarifications are also required before final contract approval. Policy acceptance is not technical closure or implementation evidence.

| ID        | Classification           | Finding                                                                    | Status                                                          |
| --------- | ------------------------ | -------------------------------------------------------------------------- | --------------------------------------------------------------- |
| WP011-R01 | Blocking until re-review | Continuation lifecycle and compound-request ownership                      | Design specified; follow-up consolidation and re-review pending |
| WP011-R02 | Blocking                 | Reservation accounting for unresolved multi-person replacements incomplete | Policy A accepted; technical integration/review pending         |
| WP011-R03 | Blocking                 | Cross-group dependency and conflict policy incomplete                      | Open                                                            |
| WP011-R04 | Blocking                 | Active clarification projection assumes an entity pending reference        | Open                                                            |
| WP011-R05 | Required clarification   | Reusable fields, enums, reference scopes and bounds not fully defined      | Open                                                            |
| WP011-R06 | Required clarification   | Staged resolution validity and revision association incomplete             | Policy B accepted; technical integration/review pending         |

The user requested an overview of all R findings before further implementation. All six topics have been discussed; R02/A and R06/B were explicitly accepted. Next consolidate the existing contract and targeted technical clarifications once, not new product-decision rounds for already settled rules. No automatic closure or application implementation follows from this record.

## WP011-R01 — Continuation lifecycle and compound-request ownership

Original location: plan sections 2 and 4. Resolution design: [plan section 4.1](011-llm-parser-contract-plan.md#41-r01--continuation-ownership-and-lifecycle).

Finding: The draft named compound intentions, child references and staged resolutions without a complete record/lifecycle contract. Existing `PendingPersonQuerySchema` carries one query and, for a replacement, one accepted source. Multiple independently accepted requests do not preserve atomic one-to-many replacement.

Risk: refinement, discard or completion could lose a destination, detach a child from its parent or remove the accepted source too early.

Progress on 2026-11-17: the user accepted the proposed single-owner parent/child design. Plan section 4.1 specifies simple canonical pending requests versus continuation-owned compound intentions, operation-specific source binding, three child states, generations, question association, refinement/discard/pause/commit/transfer behavior and bounds. No runtime implementation or tests were performed. R02, R03, R04, R05 and R06 remain technically open; their rules must not be inferred from R01.

Follow-up review identified two wording gaps not yet incorporated into the plan: completion/discard of a linked canonical request must update its grouping/question bindings atomically; linked children cannot assume lifecycle/generation fields absent from canonical pending records. Add the eighth scenario: accepting one independent linked addition and then discarding the remaining group preserves the already accepted person. This entry records the follow-up; it does not claim those corrections are implemented or re-reviewed.

Design authoring checklist (checked means specified, not independently re-reviewed or implemented):

- [x] Specify required conceptual fields and allowed states for parent intentions and child queries.
- [x] Define parent/child reference uniqueness, target types and discard/refinement scope.
- [x] Define completion, cancellation, invalidation and transfer to existing transitions, with compound acceptance explicitly requiring an extension.
- [x] Specify bounds and unchanged-state behavior at full capacity without truncation or dropped wishes.
- [x] Add contract examples/test cases for refining and discarding a child while preserving the parent operation and unrelated work.
- [ ] Incorporate the two follow-up clarifications and the eighth scenario into the plan.
- [ ] Re-review section 4.1 and its scenarios against the specification and adjacent findings before design closure.

Seven scenarios are currently specified in the plan: partial resolution retains source; refining one child preserves siblings; discarding one child preserves the replacement; discarding the final child retains the accepted source; pause/resume rejects the old question; ownership transfer creates no duplicate query/reservation; full capacity rejects without eviction and still permits cleanup. These are expected contract outcomes, not automated test results.

## WP011-R02 — Multi-replacement reservation accounting

Location: specification Capacity and overflow; plan section 4; `SearchStateSchema` capacity checks.

Finding: Final deduplicated capacity is described, but reservation treatment before all destinations are resolved is not fixed. Current state accounting reserves pending additions and assumes singular replacement targets.

Reproducer: four accepted people; replace one with two unresolved people; request another addition. The contract must determine whether the replacement has reserved the remaining slot or remains an unallocated overflow intention, rather than allowing incidental processing order to decide.

Accepted decision A, 2026-11-17: [protect existing reservations](../docs/work-packages/011-parser-contract-decisions.md#4-r02--protect-existing-reservations). Existing valid reservations are not silently displaced by later wishes; related new competing wishes are not arbitrarily partially scheduled; unresolved identities count conservatively, with trusted duplicate handling. The exact arithmetic and current-state/continuation mapping still require technical integration and review. Do not reopen the accepted precedence rule or claim that the conversational formula has been verified.

Closure checklist:

- [ ] Define reservation calculation before and after partial/full identity resolution.
- [ ] Define interaction with existing additions, simultaneous replacements and sources included among destinations.
- [ ] Define when a whole intention enters/leaves overflow and how capacity changes are reconciled.
- [ ] Cover duplicate destinations, already accepted destinations and competing additions without arbitrary partial acceptance.
- [ ] Preserve the existing person limit and criterion-specific genre/keyword accounting.

## WP011-R03 — Cross-group dependencies and conflicts

Location: plan sections 3 and 4; existing `applyIntent()` and `applyChangeTo()` boundaries.

Finding: Model groups are correctly non-authoritative, but the application algorithm for merging dependencies or detecting conflicts across them is unspecified.

Cases: replace and remove the same person; replace all genres and then add one; update year bounds in separate groups; remove a value to make capacity for another change. These cases are not all equivalent: preserve explicit ordered meaning where it is clear, and clarify actual contradictions rather than treating every overlap as an error.

Proposed direction: define each operation's prerequisites, affected targets and capacity effects. Derive application-owned coordination units; do not use arbitrary last-write-wins or split a coupled intention for partial success. Reuse transition atomicity and distinguish semantic blocking from unexpected internal failure.

Closure checklist:

- [ ] Define dependency/conflict rules for shared targets, whole-selection changes, year ranges and shared capacity.
- [ ] Define ordered composition versus clarification for conflicting instructions.
- [ ] Define preflight, group retention, independent success and whole-working-copy rejection behavior.
- [ ] Add examples/test cases for all four cases above and input immutability on unexpected failure.

## WP011-R04 — Active clarification projection

Location: plan section 2, `activeClarification`; `SemanticClarificationSchema` in `semantic-guardrails.ts`.

Finding: `{pendingRef, subject}` is not enough for all existing questions. A year-conflict question has contradictory bounds and its own question binding, not a person/keyword pending request. Replacement-source and keyword-meaning questions also need their relevant context.

Reproducer: while resolving contradictory year bounds, the user answers, “Dann ab 2000.” The parser needs the actual conflict and the application needs the active question association, without inventing an entity request.

Proposed direction: use clarification-kind-specific projections of existing contracts. Include a pending request reference only where one exists. Keep authoritative question/revision binding application-owned and preserve closed-question protection.

Closure checklist:

- [ ] Define strict model-visible projections for person refinement, replacement-source selection, year conflict and keyword meaning.
- [ ] Define the response-to-active-question mapping and any necessary application adapter.
- [ ] Cover no active question, explicit targeting of another request and obsolete same-revision questions.
- [ ] Add the year-correction example without creating an artificial entity request.

## WP011-R05 — Complete the field matrix

Location: plan sections 2 and 3.

Finding: `correction` is described as null or optional; `subject`, pending `status`, the exact `criteria` structure and parent/child reference scopes are not closed field contracts. `inputExcerpt` also needs an explicit bound.

Proposed direction: make `correction` required with null for no suggestion; use closed discriminated variants and enum values, operation-specific fields and explicit bounds. This is a proposal pending technical review.

Closure checklist:

- [ ] Specify every required, nullable, optional and forbidden field with types/enums/bounds.
- [ ] Specify all reference target kinds and parent/child selection rules.
- [ ] Specify excerpt containment and length policy, plus nested aggregate limits.
- [ ] Align complete valid/invalid examples with the resulting matrix.
- [ ] Verify the concrete Zod-to-JSON-Schema export during the approved implementation slice; do not claim provider compatibility from documentation.

## WP011-R06 — Staged resolution validity

Location: plan section 4; existing `acceptResolvedPerson()` revision checks.

Finding: The draft requires staging several trusted results while forbidding revision rebasing, but does not define validity after refinement, cancellation or another relevant state/session change. Current singular acceptance rejects a result whose source revision differs from current state.

Accepted decision B, 2026-11-17: [retain validated results for unchanged child queries](../docs/work-packages/011-parser-contract-decisions.md#5-r06--retain-validated-results-for-unchanged-child-queries). Previously validated unchanged-child facts may remain, but changed-child results/candidates are invalidated and atomic acceptance rechecks current source, capacity, provenance and bindings. Stale incoming responses are not relabelled. Interruption closes outstanding authorizations/questions while preserving previously validated unchanged-child facts; discard removes corresponding open work. Exact generations, result bindings and acceptance mapping remain technical work, not existing runtime capabilities.

Closure checklist:

- [ ] Define lookup/result association with child generation, parent/source context and request/session lifetime.
- [ ] Define acceptance versus invalidation for related and unrelated state changes.
- [ ] Cover refinement after one result, cancellation/restart, late duplicate responses, source removal and capacity changes.
- [ ] Define complete atomic acceptance without sequential singular replacement or fabricated provenance.

## Confirmed reusable behavior

- `applyIntent()` validates a candidate state and accounts for the full active/inactive genre wish.
- `extraction.ts` implements whole-list set/replace separately from add/remove; targeted replacement needs deliberate mapping.
- `acceptResolvedPerson()` preserves the trusted acceptance boundary and deduplicates by ID. Multi-person atomic acceptance still needs an extension.

These observations do not establish passing tests or remove the need to inspect concrete affected callers before code changes.

## Completion and approval gate

For each finding, record the revised contract location, reviewed examples/tests, review outcome and closing commit when available. Separate design closure from later implementation/test evidence. R05's schema-export check is implementation acceptance work; record that handoff explicitly rather than claiming it ran during design review.

No application implementation is authorized by this record. Close or explicitly and safely defer every finding before requesting the affected implementation approval. Update the main plan/specification with accepted resolutions; do not let this checklist become a competing contract. This update records decisions and review progress only; it does not complete the consolidated contract or change parser instructions.

| Finding   | Resolution location                                  | Design review / closure commit                                     | Implementation evidence                                                     |
| --------- | ---------------------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| WP011-R01 | Plan section 4.1; two follow-up clarifications above | Design specified; follow-up consolidation/re-review pending        | Not implemented; seven plan scenarios not run; eighth pending incorporation |
| WP011-R02 | Decision supplement section 4                        | Policy A accepted 2026-11-17; technical integration/review pending | Not implemented                                                             |
| WP011-R03 | Pending                                              | Open                                                               | Not implemented                                                             |
| WP011-R04 | Pending                                              | Open                                                               | Not implemented                                                             |
| WP011-R05 | Pending                                              | Open                                                               | Not implemented                                                             |
| WP011-R06 | Decision supplement section 5                        | Policy B accepted 2026-11-17; technical integration/review pending | Not implemented                                                             |
