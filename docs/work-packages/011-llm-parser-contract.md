# LLM parser contract

## Specification

### Purpose

Define validated parser input/output for LLM-assisted extraction of filters and entity queries. Follow the [WP 009 state-application contract](009-search-state-and-filter-catalog.md) and [WP 012 participation semantics](012-search-execution-and-discover.md#scope) rather than introducing a second state model.

### Scope

- Define parser inputs, outputs, filter fields, entity-query fields and validation boundaries.
- Extract one or multiple person names, keyword queries and requested media type. Preserve common participation when people are joined by AND.
- With no explicit media type, preserve the contract default permitting movies and series.
- Distinguish additions, replacements and removals for subsequent validated domain application; internal references are controlled by the application, not guessed by the model.
- Preserve acting-participation intent. Do not reinterpret it as crew work or appearances as oneself.
- Prepare extracted data for WP 009 pending-query operations and WP 010 clarification.

### Integration with existing WP 009 code

- Reuse `SearchState`, accepted ID/name records and structured pending person/keyword requests from `src/lib/schemas/search-state.ts`. Do not emit bare strings as an alternative domain-state format or invent resolved IDs.
- Define an explicit validated application adapter from parser output to `PendingQueryCommandSchema` in `src/lib/schemas/search-transition.ts`. The application supplies references and base revisions; it resolves replacement targets against the current accepted state rather than trusting model-generated IDs. Ambiguous targets require clarification.
- Apply pending changes through `applyPendingQueryCommand()` and supported filter intents through `applyIntent()`. Preserve existing atomicity boundaries; specify coordination for requests containing both filter and entity changes before implementation.
- Do not expand chat filter changes to edit `people` or `personIds`; validated person acceptance remains a separate trusted boundary.
- Complete genre catalogs are application-supplied inputs to existing genre compatibility handling, not model-generated lists or evidence of provider identity.
- Parser integration must retain inactive genre wishes and unrelated pending requests via the existing domain functions, not by reconstructing a partial state.

### Out of scope

- Person/keyword identity lookup or candidate selection: assigned to [WP 014](014-entity-resolution.md).
- Search execution (WP 012), result presentation, automatic error recovery and full LLM implementation.
- Inventing provider IDs, selecting popular candidates or applying unvalidated model output.

### Inputs and outputs

Inputs: user request, existing search state, filter catalog and validation schemas. Outputs: parser input/output contracts, extracted filters and unresolved entity queries ready for validated application.

### Implementation tasks and acceptance criteria

- Define and validate parser input/output and extraction fields.
- Extract single/multiple person requests and keyword queries without turning names into IDs.
- Preserve requested media type and AND semantics.
- Integrate with WP 009 operations; preserve unrelated accepted criteria.
- Test the application adapter, reference/revision ownership, replacement-target clarification and mixed filter/entity coordination without live entity lookup.
- Test extraction-contract validation and state-application compatibility without live entity lookup.

## Execution status

- Specification aligned on 2026-11-15; actual entity resolution is explicitly assigned to WP 014.
- Replaced the separate requirements-document reference with direct state-contract and participation-semantics links.
- Integration scope aligned with inspected code at `26aefe9`; WP 009 already supplies structured pending commands and person-state transitions. Parser extraction and its application adapter remain separate work, not implemented by this update.
- Documentation-only update, not a claim of parser implementation or completion of WP 009.
- No tests, coverage, lint or typecheck were run for this update.

## Recovered planning decisions — 2026-11-16

This section preserves decisions recovered from the user's conversation record and the subsequent wizard discussion. It is a planning record, not an implementation report. WP 010 is complete in its agreed contract/domain scope. WP 011 is the current planning package. Do not begin implementation until the remaining contract questions and implementation plan are approved.

The original scope above remains in force. Cross-package product decisions below do not silently expand WP 011 implementation scope. Proposed ownership changes require approval and corresponding updates to the affected packages. Recommended dependency order remains WP 011 → WP 014 → WP 012.

### A. Mixed requests and pending context

- Apply unambiguous, independent filter changes while unrelated entity requests remain pending; preserve existing operation-level atomicity and define coordination explicitly.
- Preserve each pending request's intent and context. Do not display pending values as accepted criteria.
- Example: “Only TV series and replace Tom Hanks with another Tom” applies the TV change, creates or updates a replacement query using “Tom”, and retains Tom Hanks until successful replacement.
- Applying criteria is distinct from executing a title search. Explicit search confirmation is required.

### B. Person extraction, refinement and resolution outcomes

- Incomplete names such as “Tom” are valid. Preserve the supplied query; do not invent surnames, identities or IDs.
- Multiple plausible identities require selection or refinement. One returned candidate alone does not establish uniqueness. Acceptance requires established identity or explicit valid selection.
- During an active clarification, a bare person reference corrects/refines that request. “Tom Cruise” replaces the unresolved query “Tom” and invalidates its prior candidate group; it does not remove previously accepted people merely because they were offered as candidates.
- An explicit addition such as “and Brad Pitt” creates a separate request and leaves “Tom” pending.
- An explicit reference to another pending request takes precedence: “By Chris I mean Chris Evans” refines Chris while Tom stays pending.
- Clarify pending person requests in mention order by default.
- When more candidates exist, offer both additional candidates and free-text refinement.
- No match is reported explicitly, leaves the request open and allows correction. It is not a technical failure.
- For replacement, retain the accepted source person until successful acceptance of the target. No-match and intermediate candidates do not remove the source. Explicit discard closes the request without replacement.

### C. Identity deduplication and replacement

- Deduplicate by resolved person ID, not display name.
- An addition resolving to an accepted person closes the pending request, retains that person once and briefly reports that the person is already included.
- Equal names with different IDs are not duplicates.
- Replacing A with already accepted B removes A, retains B once and closes the request without an extra duplication question.
- Preserve unrelated accepted people and pending requests. Reuse existing domain transitions rather than duplicating these policies.

### D. Shared limit and overflow

- Use `MAX_PERSON_IDS` as the common configuration source for the person-condition limit and clarification candidate-group limit; agreed value: five.
- Remove `MAX_PERSON_CLARIFICATION_CANDIDATES`; replace all code/test imports and usages, update descriptions/documentation, verify no references remain, and run tests, coverage, lint and typecheck. This is planned work, not an already performed change. Its implementation package must be confirmed.
- Accepted persons occupy one slot each. Pending additions reserve one slot each. Multiple candidates for one request do not reserve separate slots. A replacement uses its source person's slot. Refining an existing request does not add a slot.
- On overflow, explain the limit and that pending additions count. Ask whom to add/replace or which pending wish to discard.
- Do not choose an arbitrary subset or silently remove existing requests. Preserve excess requested additions for clarification without inserting an invalid sixth bounded pending entry.
- If two additions compete for one free slot, neither is arbitrarily selected. Independent unambiguous filter changes may still proceed.

### E. Shared rules and criterion-specific boundaries

- Reuse the general principles of independent unambiguous changes, preserved pending context, explicit additions versus refinements, mention-order clarification and deliberate overflow resolution.
- Use the appropriate `MAX_GENRE_IDS`, `MAX_PERSON_IDS` or `MAX_KEYWORD_IDS` limit.
- Identity/normalization, resolution, replacement and compatibility rules remain criterion-specific.
- Do not copy person-slot accounting or person candidate-selection rules to genres/keywords without checking their existing contracts.

### F. Cancellation and deliberate continuation

- When no processing/search is running, “Stop” or “Cancel” does not immediately mutate filters or pending wishes and does not start a search.
- Show accepted filters separately from pending changes. Ask whether to discard a selected pending wish, discard all pending wishes while retaining filters, reset the entire search, or return unchanged.
- With no pending wishes, clarify whether the entire search should be reset.
- Execute only the explicitly selected cancellation scope and confirm it. Show retained filters and remaining wishes.
- After confirmed cancellation, do not automatically search, retry or activate the next question. There is no active clarification until deliberately resumed.
- Use labelled buttons for resumption, filter editing, retry and reset rather than requiring free-text control commands.
- A new bare name after cancellation must not accidentally answer the closed clarification. Explicitly referenced pending requests may be resumed in context.
- Do not execute a search by silently omitting pending wishes. They must first be resolved or explicitly discarded.

### G. Processing locks and technical retries

- Lock new input during parser processing, person/keyword resolution and title-search execution. Lock state-changing actions during processing/retries and show status.
- Release input when a response is needed, processing completes, or a terminal failure/timeout is reached. Preserve pending wishes.
- Agreed technical-retry behavior: at most three attempts per cycle, progress feedback, stop immediately on success, and no fourth automatic attempt.
- After three failures, report the failure, unlock input and offer “Try again” and cancellation options. Explicit retry starts a new cycle of up to three attempts.
- Keep the affected wish pending and accepted filters unchanged. No-match and ambiguity do not trigger technical retries.
- Retry ownership, eligible operations/errors, timeout handling and parser budget implications remain to be specified. This decision does not authorize adding generic retries to every subsystem or overriding existing transport policy.

### H. Wizard and explicit search confirmation

- The later wizard decision supersedes the earlier default continuation-card layout with individual “Clarify” buttons; preserve its underlying cancellation/resumption semantics.
- The wizard replaces the search input completely, presents one question per step and ends with filter review. It is not a modal.
- Both ready interpretations and clarified requests require explicit “Search now” confirmation. Completing clarification does not execute a title search.
- After confirmation, restore the search input with a readable representation of the executed criteria and show titles below using the existing result view.
- Do not represent skipped or unsupported wishes as fulfilled. Keep original request context during clarification.
- Deferred UI task reported by the user: `tasks/clarificaton-flow.md` (path recorded as supplied; not verified by this update).
- Structured button actions are application-controlled, not prompts. Validate request/revision association and reject obsolete actions. Action names discussed in chat were illustrative, not approved APIs.
- UI implementation must support keyboard access, visible focus and accessible status updates.

### I. Proposed ownership — not a scope-transfer approval

- WP 011: extraction contracts, clarification response interpretation, application-owned references/revisions and coordination of mixed changes; define only necessary interfaces to downstream behavior.
- WP 014: live person/keyword resolution, uniqueness policy, candidate retrieval/continuation, no-match and validated identity acceptance integration.
- WP 012: execution readiness, explicit confirmation integration, revision-bound execution and honest failure/result status.
- WP 013: retain title disambiguation/provider scope; no evidence currently requires moving person/keyword work here.
- Later UI/integration package: wizard rendering, review, input replacement/restoration, result-view integration, focus, locks and cancellation/resumption controls. Use the deferred task; package number is not assigned here.
- Retry orchestration and shared-constant cleanup: confirm ownership before implementation. Any necessary domain extension requires explicit approval; do not reopen completed WP 010 implicitly.
- WP 012–014 and other specifications are not changed by this record. Align them after ownership decisions are approved.

### J. Remaining questions before implementation

1. What evidence permits accepting a person without explicit selection? Finalize with WP 014; define the outcome contract in WP 011.
2. How are excess additions retained without violating pending-state bounds?
3. How is an ambiguous replacement target handled when multiple already accepted people match? The earlier discussion clarified candidate refinement instead and did not settle this case.
4. How are accepted independent changes, the proposed search and the currently executed search represented without inventing a competing state model? Determine review/confirmation revision semantics.
5. Which operations/errors receive three-attempt retries, which package owns orchestration, and how are budgets, timeouts and existing no-auto-recovery boundaries reconciled?
6. Which genre/keyword cases are already covered, and which require approved contract extensions, including keyword acceptance?
7. How do cancellation, explicit resumption, free-text refinement and input locks map onto the final wizard? No UI implementation is authorized here.
8. Assign the shared-constant cleanup and cross-package follow-up changes explicitly.

### K. Implementation gate and validation plan

- Resolve WP-011-blocking questions and agree which downstream details may remain deferred behind explicit contracts.
- Approve the package allocation and update affected specifications, including any older automatic-search rules contradicted by explicit confirmation.
- Approve an implementation plan listing files, reused transitions and required schema extensions before coding.
- Add contract/adapter tests for incomplete names, mixed changes, refinement versus addition, preserved replacement sources, no-match retention, identity duplicates, mention order, overflow and stale-context rejection as applicable to WP 011.
- Use synthetic fixtures and mocks; do not implement live WP 014 resolution or WP 012 execution inside WP 011.
- Assign integration/UI tests for cancellation, retries, input locks, review and execution only after explicit confirmation to their approved owners.
- Report actual tests, statement coverage (project target at least 80%), lint and typecheck results; never present planned validation as completed.

This record is documentation only. No application code, tests, package reassignment or implementation completion is asserted.
