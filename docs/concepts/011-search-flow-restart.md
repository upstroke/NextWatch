# Search flow restart

## Status

Completed.

## Purpose

This concept documents the decision to restart the search flow.

It records why the previous multi-step search orchestration approach was discarded and defines the new approach based on the original `main` state and the `NextWatch_Studio_Konzept_v1.9.pdf` concept.

## Previous approach

The previous branch `feat/003-multi-step-search-orchestration` introduced several parallel orchestration approaches:

- `search-orchestration.ts`
- `person-discover-orchestration.ts`
- `keyword-discover-orchestration.ts`
- `title-provider-orchestration.ts`
- `search-disambiguation.ts`
- `pending-filters.ts`

This approach lost sight of the overall concept and created multiple parallel orchestration paths.

## Decision

The branch `feat/003-multi-step-search-orchestration` is discarded.

It is not blindly deleted; it is treated as a discarded working state.

A new task is created: `tasks/003a-search-flow-restart.md`.

A possible new branch is `feat/004-search-flow-restart`.

## New approach

The new approach builds on the original `main` state and the `NextWatch_Studio_Konzept_v1.9.pdf` concept.

The search flow for `Actionfilm mit Brad Pitt, 2000–2025` follows this sequence:

1. Parse filters and person query.
2. Validate and apply changes.
3. Resolve a person to a `personId` or clarify ambiguity.
4. Combine the person ID with genre and year range.
5. Use the existing Movie Discover function to return results.

## Entity lookup

Person and keyword are entity lookup steps.

They are not separate Discover endpoints.

`append_to_response` belongs exclusively to the detail view, not to search.

## Existing foundation

The existing `main` state already provides:

- Person search candidates.
- Person ID as a Discover filter.
- Genre, year and rating combination.
- Movie Discover via HTTP.
- TV Discover endpoint.
- Keyword search candidates.
- Keyword ID as a Discover filter.

## Open questions

The following questions remain open:

- Connection between person search and Discover.
- Clarification flow for multiple persons.
- Central search endpoint that connects both steps.
- `append_to_response` scope.
- Test coverage of the existing chain.
- TV Discover handler.
- Movie and TV detail handlers.

## Out of scope

- Premature architectural consolidation.
- Claims about unverified implementation details.
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
- `docs/concepts/012-lessons-learned.md`
