# Clarification and guardrails

## Purpose

This work package defines when clarification is required and which guardrails protect the search flow.

It describes how ambiguous or incomplete input is handled without silently changing the existing search state.

## Scope

- Define when clarification is required.
- Define clarification states.
- Define guardrails for invalid or incomplete input.
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

- Clarification states.
- Guardrail rules.
- Updated search state.
- Pending clarification requirements.

## Implementation tasks

- Define clarification states.
- Define guardrail rules.
- Define rules for preserving existing filters.
- Define rules for incomplete input.
- Define rules for invalid input.
- Prepare the search state for later work packages.

## Acceptance criteria

- Ambiguous input leads to clarification.
- Incomplete input does not silently change the search state.
- Invalid input does not silently change the search state.
- Existing filters are preserved.
- The search state can be used by later work packages.
