# Search state and filter catalog

## Purpose

This work package defines the search state and the filter catalog used by the search flow.

It describes how filters are represented, validated, combined and preserved across search steps.

## Scope

- Define the search state structure.
- Define the filter catalog.
- Define filter validation rules.
- Define how filters are combined.
- Define how existing filters are preserved.
- Prepare the search state for entity resolution and Discover execution.

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

- Search state structure.
- Filter catalog.
- Filter validation rules.
- Filter combination rules.

## Implementation tasks

- Define the search state structure.
- Define the filter catalog.
- Define filter validation rules.
- Define filter combination rules.
- Define rules for preserving existing filters.
- Prepare the search state for later work packages.

## Acceptance criteria

- The search state is clearly defined.
- The filter catalog is clearly defined.
- Filters can be validated.
- Filters can be combined.
- Existing filters are preserved.
- The search state can be used by later work packages.
