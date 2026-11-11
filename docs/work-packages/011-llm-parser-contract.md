# LLM parser contract

## Purpose

This work package defines the contract for LLM-assisted extraction of filters and entity queries.

It describes which data the parser must return so the application can validate and apply it.

## Scope

- Define the parser input contract.
- Define the parser output contract.
- Define filter extraction fields.
- Define entity query fields.
- Define validation boundaries.
- Prepare parsed data for search state application.

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

- Parser input contract.
- Parser output contract.
- Extracted filters.
- Extracted entity queries.

## Implementation tasks

- Define the parser input contract.
- Define the parser output contract.
- Define filter extraction fields.
- Define entity query fields.
- Define validation boundaries.
- Prepare parsed data for search state application.

## Acceptance criteria

- The parser input is clearly defined.
- The parser output is clearly defined.
- Filters can be extracted.
- Entity queries can be extracted.
- Parsed data can be validated.
- Parsed data can be applied to the search state.
