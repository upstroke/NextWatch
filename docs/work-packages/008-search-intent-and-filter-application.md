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

## Execution status

- Filter application exists in `src/lib/domain/search/`.
- This correction tightens the chat schema and clarification result contract and applies the revision guard to all valid statuses.
- Added focused schema tests for status-dependent payloads and clarification normalization, and domain tests for revision handling and state preservation.
- Automated validation for this correction has not been run: tests, coverage, lint and typecheck remain pending in a repository checkout.
- The remote code search was incomplete; a complete caller audit remains unverified.
- This correction does not implement entity-query transport, entity resolution, the WP 010 clarification workflow or year-range validation. Overall WP 008 completion is not asserted.
