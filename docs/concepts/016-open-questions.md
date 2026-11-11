# Open questions

## Status

Completed.

## Purpose

This concept documents the open questions for NextWatch.

It records unresolved questions about the search chain, detail data, tests and TV Discover.

## Search chain

- How should person search connect to Discover?
- How should ambiguity for multiple persons be clarified?
- Should a central search endpoint connect both steps?

## Detail data

- What is the actual scope of `append_to_response`?
- Which detail fields are required for the first usable detail view?

## Tests

- What is the current test coverage of the existing search chain?
- Which tests are missing for the existing chain?

## TV Discover

- What is the current implementation of the TV Discover handler?
- Does it follow the same validation and error behavior as Movie Discover?

## Movie and TV detail

- What is the current implementation of the Movie detail handler?
- What is the current implementation of the TV detail handler?
- What is the current implementation of `server/services/tmdb/detail.ts`?

## Rule

Do not answer these questions without reading the actual code.

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
- `docs/concepts/014-current-state.md`
- `docs/concepts/015-next-actions.md`
- `docs/concepts/017-task-003a-search-flow-restart.md`
