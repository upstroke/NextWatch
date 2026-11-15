# Clarification and guardrails

## Specification

### Purpose

Define clarification and guardrails for ambiguous, incomplete or invalid requests without silently changing accepted search criteria. Use the state and transition contract in [WP 009](009-search-state-and-filter-catalog.md) and the resolution outcomes in [WP 014](014-entity-resolution.md).

### Scope and boundaries

- Define clarification states, pending clarification requirements and preservation rules.
- Consume unique, ambiguous and no-match entity outcomes from [WP 014](014-entity-resolution.md); do not perform provider lookups here.
- Associate candidate selections with a stable WP 009 pending-request reference and source revision. Reject stale or unrelated selections; validate membership in the offered candidate set.
- For ambiguous people, present candidate names and available known movie/series titles with media type. No profile image is required. Define candidate count and a missing-title fallback before implementation.
- Apply the [WP 014 candidate-enrichment rule](014-entity-resolution.md#scope): known titles are identity-selection aids, not a complete filmography or final search results.
- Do not select the highest-ranked candidate merely to avoid a question.
- For no match, request correction or explicit removal of the condition; do not silently drop a person. Distinguish provider failures from no-match outcomes.
- Preserve independently accepted people, unrelated criteria and pending replacements. A question or candidate retrieval alone does not change criteria or revision.
- Route accepted selections through WP 014 validation and the pure WP 009 acceptance transition. Do not mutate active IDs directly.
- Preserve the complete requested AND condition. Required unresolved people block execution of the new search in WP 012.

### Integration with existing WP 009 code

- Reuse `src/lib/schemas/search-state.ts` and `src/lib/schemas/search-transition.ts`; do not introduce competing accepted-person or pending-request models.
- Pending requests are structured records, not bare strings. Carry the application-owned `ref` and source revision through clarification; a person request distinguishes addition from replacement using its operation and replacement target.
- Reuse `applyPendingQueryCommand()` in `src/lib/domain/search/pending-operations.ts` for accepted corrections/removals. Only effective accepted criteria changes advance revision; showing a question does not.
- After WP 014 establishes identity provenance and candidate membership, reuse `acceptResolvedPerson()` with the matching reference, source revision and ID/name record. Do not reimplement its atomic replacement, limit or deduplication decisions.
- Keep candidate/clarification state separate from active criteria. Reuse existing `applyIntent()` clarification and error outcomes rather than conflating semantic questions with malformed input or technical failure.
- Consume optional `applyIntent()` media-change feedback facts for later clarification/feedback contracts where needed; this does not authorize UI work here or provider execution.

### Out of scope

- Provider entity resolution (WP 014).
- Search execution (WP 012).
- Result rendering, automatic error recovery and full LLM implementation.

### Inputs and outputs

Inputs: user request, existing WP 009 state, filter catalog, validation schemas and WP 014 resolution outcomes. Outputs: clarification states, guardrail outcomes, pending clarification requirements and accepted selections for controlled state application.

### Implementation tasks and acceptance criteria

- Define clarification states and guardrails for ambiguous, incomplete and invalid input.
- Preserve existing filters and revision unless an effective criteria transition is accepted through WP 009.
- Define candidate presentation and selection contracts, no-match correction/removal and safe stale-selection rejection.
- Test preservation, invalid selection, no-match versus technical error and independent handling of multiple people.
- Test integration with existing pending commands and person acceptance without copying domain rules into clarification code.
- Prepare contracts using synthetic outcomes before WP 014 exists; live resolution integration depends on WP 014.

## Execution status

- Specification aligned with the approved person-search requirements on 2026-11-15.
- Replaced the separate requirements-document reference with direct WP links and explicitly linked the selection-aid versus filmography distinction.
- Follow-up integration scope aligned with inspected code at `26aefe9`: structured requests, pure pending operations, person acceptance and intent outcomes already exist; the complete clarification workflow is not thereby implemented.
- This is a documentation-only scope update. No implementation ownership is transferred out of WP 009 to avoid its acceptance criteria.
- No tests, coverage, lint or typecheck were run for this update.
