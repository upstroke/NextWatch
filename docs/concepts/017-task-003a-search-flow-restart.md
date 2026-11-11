# Task 003a: Search flow restart

## Status

Completed.

## Purpose

This concept documents Task 003a as a concrete work order.

It defines the goal, scope, acceptance criteria and out-of-scope areas for Search Flow Restart.

## Goal

Rebuild the search flow on the original `main` state and the `NextWatch_Studio_Konzept_v1.9.pdf` concept.

The previous multi-step search orchestration approach is discarded.

## Scope

1. Complete the inventory of the existing `main` state.
2. Review the remaining handlers and services.
3. Review the related tests.
4. Create a complete table of existing, partial, missing and contradictory capabilities.
5. Define the search chain based on the inventory.
6. Implement the search chain only after the inventory is complete.

## Acceptance criteria

- The inventory is complete.
- The search chain is defined based on the inventory.
- Person and keyword remain entity lookup steps.
- `append_to_response` remains exclusive to the detail view.
- No new endpoints, deletions or consolidation are proposed before the inventory is complete.
- Architecture decisions are made only after the inventory is complete.

## Out of scope

- Detail page UI.
- Routing or navigation.
- Filter pills.
- URL state.
- Infinite scroll.
- Backdrops.
- Mixed Movie/TV result lists.
- LLM or Ollama integration.
- Automatic activation of additional capabilities without separate verification.

## Related documentation

- `docs/concepts/003-service-boundaries.md`
- `docs/concepts/004-tmdb-discover-foundation.md`
- `docs/concepts/005-tmdb-detail-data-contract.md`
- `docs/concepts/006-language-aware-tmdb-transport.md`
- `docs/concepts/007-tmdb-search-and-provider-contracts.md`
- `docs/concepts/008-testing-standards.md`
- `docs/concepts/009-ui-foundation.md`
- `docs/concepts/010-roadmap.md`
- `docs/concepts/011-search-flow-restart.md`
- `docs/concepts/012-lessons-learned.md`
- `docs/concepts/013-documentation-standards.md`
- `docs/concepts/014-current-state.md`
- `docs/concepts/015-next-actions.md`
- `docs/concepts/016-open-questions.md`
- `docs/concepts/018-implementation-guardrails.md`
