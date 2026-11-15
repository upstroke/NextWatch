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
- Prepare contracts using synthetic outcomes before WP 014 exists; live resolution integration depends on WP 014.

## Execution status

- Specification aligned with the approved person-search requirements on 2026-11-15.
- Replaced the separate requirements-document reference with direct WP links and explicitly linked the selection-aid versus filmography distinction.
- This is a documentation-only scope update, not a claim of implemented clarification behavior.
- No tests, coverage, lint or typecheck were run for this update.
