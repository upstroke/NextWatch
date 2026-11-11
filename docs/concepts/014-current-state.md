# Current state

## Status

Completed.

## Purpose

This concept documents the current project state for NextWatch.

It records completed foundations, existing capabilities, open questions and the transition to Search Flow Restart.

## Completed foundations

The following foundations are completed:

- Service boundaries.
- TMDb Discover foundation.
- TMDb detail data contract.
- Language-aware TMDb transport.
- TMDb search and provider contracts.
- Testing standards.
- UI foundation.

## Existing capabilities

The existing `main` state provides:

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

## Current focus

The current focus is Search Flow Restart.

The previous multi-step search orchestration approach was discarded.

The new approach builds on the original `main` state and the `NextWatch_Studio_Konzept_v1.9.pdf` concept.

## Out of scope

- Automatic activation of additional capabilities without separate verification.
- Premature architectural consolidation.
- Claims about unverified implementation details.

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
- `docs/concepts/015-next-actions.md`
