# Search intent and filter application

## Specification

### Purpose

This work package defines how structured filter-change proposals become validated search filters.

It describes how proposed filter values are validated and applied before search execution. Pending entity-query state belongs to [WP 009](009-search-state-and-filter-catalog.md#work-package-boundaries); parser fields and natural-language extraction belong to WP 011.

### Scope

- Accept structured filter changes through the search intent contract.
- Validate proposed values and operations.
- Apply valid filters to the search state.
- Preserve existing filters when new input is incomplete or invalid.
- Prepare validated filters for use by later work packages.

### Out of scope

- Pending entity-query state representation and preservation (WP 009).
- Parser fields and natural-language extraction (WP 011).
- Entity resolution.
- Discover execution.
- Result presentation.
- Automatic error recovery.
- Full LLM implementation.

### Inputs

- Structured search intent.
- Existing search filters and current revision.
- Supported filter fields and operations.
- Validation schemas.

### Outputs

- Updated search filters when changes are applied.
- Validation result.
- Pending clarification requirements.

### Implementation tasks

- Define the search intent input contract.
- Define rules for applying structured filter changes.
- Validate proposed filters.
- Apply valid filters to the search state.
- Preserve unchanged filters.
- Return a clear result for incomplete or invalid input.

### Acceptance criteria

- A valid request updates the search state.
- Invalid values do not silently replace existing filters.
- Incomplete input does not start Discover execution.
- The resulting state can be used by later work packages.

### Clarification intent contract

- Only `ready` intents may contain filter changes; their change list may be empty.
- `needs_clarification` requires clarification data and an empty change list.
- `unsupported` and `error` require empty change lists.
- Clarification data is forbidden for every status except `needs_clarification`.
- Clarification keys and option labels are trimmed and must remain non-empty.
- Clarification requires at least one option. Question catalogs and option semantics belong to WP 010.
- Structural validation precedes revision validation for every status.
- Every structurally valid intent must match the current revision, including clarification, unsupported and error intents.
- A clarification result requires clarification data; other result variants do not carry it.
- Clarification never changes existing filters. Contradictory intent payloads are rejected, not silently ignored.

### Year-range validation

- When both bounds are present, `maxYear` must be greater than or equal to `minYear`.
- Equal bounds represent a single year; either bound may be omitted for an open range.
- Validate the resulting range after all changes, not intermediate states.
- Reversed bounds reject the entire intent with `invalid-value` at `maxYear`; existing filters remain unchanged. Never swap bounds automatically.

## Execution status

- Status: completed by explicit user acceptance on 2026-11-14, within the clarified scope above.
- Accepted branch: `feat/008-search-intent-and-filter-application`; implementation and test correction through `0e057d0`, scope clarification in `06e02a4`.
- Filter application exists in `src/lib/domain/search/`.
- The chat schema and clarification result contract enforce status-dependent payloads; the revision guard applies to all valid statuses.
- Focused schema and domain tests cover clarification payloads, normalization, revision handling and state preservation.
- Year-range validation is implemented in `SearchFiltersSchema`. Schema tests cover supported and reversed ranges; domain tests cover atomic rejection, joint bound updates and bound removal.
- Validation evidence: after the test correction, the user reported "alles gruen" on 2026-11-14. The assistant did not execute the checks; individual command outputs and a coverage percentage were not supplied in this conversation.
- Review limitation retained at acceptance: the remote code search was incomplete and a complete caller audit was not independently verified. This completion entry does not claim that audit was performed.
- Entity-query state is assigned to WP 009; parser fields and extraction are assigned to WP 011. See the linked WP 009 boundaries. Actual entity resolution still needs an explicit implementation assignment.
- The WP 010 clarification workflow remains outside this completed scope.
- Completion records user acceptance on the feature branch; it does not record or authorize a merge, deployment or implementation start of WP 009.
