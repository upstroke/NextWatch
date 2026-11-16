# WP 011 — Technical contract review findings

## Status and scope

- Recorded: 2026-11-16.
- Reviewed branch: `feat/011-llm-parser-contract`.
- Reviewed baseline: `5fa186d4a52ed267b70691f5c117e4b5ca1cc8f4`.
- Verdict: not ready for schema/adapter implementation; four blocking design gaps and two additional required clarifications remain open.
- Product authority: [WP 011 specification](../docs/work-packages/011-llm-parser-contract.md).
- Review target: [implementation plan and concrete contract draft](011-llm-parser-contract-plan.md).
- This file tracks findings and closure evidence, not an alternative product specification. Proposed remedies are not approved schema designs or implemented behavior. Settled product decisions remain unchanged.
- Recording findings does not approve their fixes, application implementation, a PR or a merge.

The review was static and read-only. Directly read at the baseline: the specification, plan, `src/lib/schemas/search-state.ts`, `src/lib/schemas/semantic-guardrails.ts`, `src/lib/domain/search/pending-operations.ts`, `src/lib/domain/search/apply-intent.ts` and `src/lib/domain/search/extraction.ts`. This was a targeted contract review, not a complete caller/test audit. No tests, coverage, ESLint, typecheck, schema export or live provider checks ran. Remote inspection does not establish local working-tree cleanliness.

## Work queue

All findings are open. Blocking means the affected design cannot safely be implemented as currently specified; the additional clarifications are also required before final contract approval.

| ID        | Classification         | Finding                                                                    | Status |
| --------- | ---------------------- | -------------------------------------------------------------------------- | ------ |
| WP011-R01 | Blocking               | Continuation lifecycle and compound-request ownership incomplete           | Open   |
| WP011-R02 | Blocking               | Reservation accounting for unresolved multi-person replacements incomplete | Open   |
| WP011-R03 | Blocking               | Cross-group dependency and conflict policy incomplete                      | Open   |
| WP011-R04 | Blocking               | Active clarification projection assumes an entity pending reference        | Open   |
| WP011-R05 | Required clarification | Reusable fields, enums, reference scopes and bounds not fully defined      | Open   |
| WP011-R06 | Required clarification | Staged resolution validity and revision association incomplete             | Open   |

Suggested order: R01 and R04 establish ownership/context; R02 and R06 establish capacity/result validity; R03 completes coordination; R05 consolidates the final field matrix. These topics can be designed together where they depend on each other. Do not close a finding just because a paragraph was added.

## WP011-R01 — Continuation lifecycle and compound-request ownership

Location: plan sections 2 and 4.

Finding: The draft names compound intentions, child references and staged resolutions without a complete record/lifecycle contract. Existing `PendingPersonQuerySchema` carries one query and, for a replacement, one accepted source. Multiple independently accepted requests do not preserve atomic one-to-many replacement.

Risk: refinement, discard or completion could lose a destination, detach a child from its parent or remove the accepted source too early.

Proposed direction: define a bounded continuation record with the common operation, ordered child queries, source binding, processing states and question association. Reference canonical accepted state; do not duplicate accepted criteria or create hidden slots.

Closure checklist:

- [ ] Specify required fields and allowed states for parent intentions and child queries.
- [ ] Define parent/child reference uniqueness, target types and discard/refinement scope.
- [ ] Define completion, cancellation, invalidation and transfer to existing transitions.
- [ ] Specify bounds and unchanged-state behavior at full capacity without truncation or dropped wishes.
- [ ] Add contract examples/test cases for refining and discarding a child while preserving the parent operation and unrelated work.

## WP011-R02 — Multi-replacement reservation accounting

Location: specification Capacity and overflow; plan section 4; `SearchStateSchema` capacity checks.

Finding: Final deduplicated capacity is described, but reservation treatment before all destinations are resolved is not fixed. Current state accounting reserves pending additions and assumes singular replacement targets.

Reproducer: four accepted people; replace one with two unresolved people; request another addition. The contract must determine whether the replacement has reserved the remaining slot or remains an unallocated overflow intention, rather than allowing incidental processing order to decide.

Proposed direction: account for each scheduled compound operation as a whole, distinguish unallocated overflow intentions, never assume unresolved queries are duplicate identities, and recompute actual capacity after trusted ID resolution. Do not silently displace existing reservations. This direction still needs a precise reviewed rule.

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

Proposed direction: bind each result to the exact query generation and parent context. Explicitly invalidate affected results; validate the source, current capacity and all staged provenance at atomic acceptance. Never make an old asynchronous response current by assigning it a newer revision. Define separately whether already validated staged facts may survive particular unrelated changes.

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

No application implementation is authorized by this record. Close or explicitly and safely defer every finding before requesting the affected implementation approval. Update the main plan/specification with accepted resolutions; do not let this checklist become a competing contract.

| Finding   | Resolution location | Design review / closure commit | Implementation evidence |
| --------- | ------------------- | ------------------------------ | ----------------------- |
| WP011-R01 | Pending             | Open                           | Not implemented         |
| WP011-R02 | Pending             | Open                           | Not implemented         |
| WP011-R03 | Pending             | Open                           | Not implemented         |
| WP011-R04 | Pending             | Open                           | Not implemented         |
| WP011-R05 | Pending             | Open                           | Not implemented         |
| WP011-R06 | Pending             | Open                           | Not implemented         |
