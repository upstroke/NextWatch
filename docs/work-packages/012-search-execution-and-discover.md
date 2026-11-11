# Search execution and discover

## Purpose

This work package defines how a validated search state is turned into a Discover request and executed.

It describes how filters and resolved entities are combined into a Discover query.

## Scope

- Define how a validated search state is converted into Discover parameters.
- Define how filters are combined.
- Define how resolved entities are used.
- Define how Discover requests are executed.
- Define how results are returned for further processing.

## Out of scope

- Entity resolution.
- Result presentation.
- Automatic error recovery.
- Full LLM implementation.

## Inputs

- Validated search state.
- Resolved entity IDs.
- Filter catalog.
- Discover contracts.

## Outputs

- Discover request parameters.
- Discover results.
- Execution status.

## Implementation tasks

- Convert a validated search state into Discover parameters.
- Combine filters.
- Use resolved entity IDs.
- Execute Discover requests.
- Return results for further processing.

## Acceptance criteria

- A validated search state can be converted into Discover parameters.
- Filters are combined correctly.
- Resolved entity IDs are used correctly.
- Discover requests can be executed.
- Results can be returned for further processing.
