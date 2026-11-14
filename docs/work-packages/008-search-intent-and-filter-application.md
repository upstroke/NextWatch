# Search intent and filter application

## Specification

### Purpose

This work package defines how a user request becomes a validated search state.

It describes how filters and entity queries are extracted, validated and applied before search execution.

### Scope

- Extract filters and entity queries from a user request.
- Validate extracted values.
- Apply valid filters to the search state.
- Preserve existing filters when new input is incomplete or invalid.
- Prepare a search state that can later be used for entity resolution and Discover execution.

### Out of scope

- Entity resolution.
- Discover execution.
- Result presentation.
- Automatic error recovery.
- Full LLM implementation.

### Inputs

- User request.
- Existing search state.
- Filter catalog.
- Validation schemas.

### Outputs

- Updated search state.
- Validation result.
- Pending clarification requirements.

### Implementation tasks

- Define the search intent input contract.
- Define filter extraction rules.
- Validate extracted filters.
- Apply valid filters to the search state.
- Preserve unchanged filters.
- Return a clear state for incomplete or invalid input.

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

- Filter application exists in `src/lib/domain/search/`.
- The chat schema and clarification result contract enforce status-dependent payloads; the revision guard applies to all valid statuses.
- Focused schema and domain tests cover clarification payloads, normalization, revision handling and state preservation.
- Year-range validation is implemented in `SearchFiltersSchema`. Added schema tests for supported and reversed ranges, and domain tests for atomic rejection, joint bound updates and bound removal.
- Automated validation for these corrections has not been run: tests, coverage, lint and typecheck remain pending in a repository checkout.
- The remote code search was incomplete; a complete caller audit remains unverified.
- Entity-query transport, entity resolution and the WP 010 clarification workflow are not implemented by these corrections. Overall WP 008 completion is not asserted.
