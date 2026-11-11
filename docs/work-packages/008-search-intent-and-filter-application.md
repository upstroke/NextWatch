# Search intent and filter application

## Purpose

This work package defines how a user request becomes a validated search state.

It describes how filters and entity queries are extracted, validated and applied before search execution.

## Scope

- Extract filters and entity queries from a user request.
- Validate extracted values.
- Apply valid filters to the search state.
- Preserve existing filters when new input is incomplete or invalid.
- Prepare a search state that can later be used for entity resolution and Discover execution.

## Out of scope

- Entity resolution.
- Discover execution.
- Result presentation.
- Automatic error recovery.
- Full LLM implementation.

## Inputs

- User request.
- Existing search state.
- Filter catalog.
- Validation schemas.

## Outputs

- Updated search state.
- Validation result.
- Pending clarification requirements.

## Implementation tasks

- Define the search intent input contract.
- Define filter extraction rules.
- Validate extracted filters.
- Apply valid filters to the search state.
- Preserve unchanged filters.
- Return a clear state for incomplete or invalid input.

## Acceptance criteria

- A valid request updates the search state.
- Invalid values do not silently replace existing filters.
- Incomplete input does not start Discover execution.
- The resulting state can be used by later work packages.
