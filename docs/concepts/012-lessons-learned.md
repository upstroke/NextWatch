# Lessons learned

## Status

Completed.

## Purpose

This concept documents the most important lessons learned from the discarded multi-step search orchestration approach.

It defines rules for future work to avoid repeating the same mistakes.

## Lesson 1: Verify before claiming

Do not claim implementation details without reading the actual code.

Earlier claims about `append_to_response`, error handling and architecture were not supported by verified code.

## Lesson 2: Preserve the overall concept

Do not lose sight of the overall concept while implementing individual features.

The previous branch created multiple parallel orchestration paths and lost alignment with the original concept.

## Lesson 3: Avoid premature abstraction

Do not introduce multiple orchestration files or abstractions before the underlying flow is verified.

The previous approach created several parallel orchestration files:

- `search-orchestration.ts`
- `person-discover-orchestration.ts`
- `keyword-discover-orchestration.ts`
- `title-provider-orchestration.ts`
- `search-disambiguation.ts`
- `pending-filters.ts`

## Lesson 4: Use existing foundation first

Build on the existing `main` state before introducing new architecture.

The existing foundation already provides person search, Discover filters, Movie Discover, TV Discover, keyword search and provider lookup.

## Lesson 5: Separate entity lookup from Discover

Person and keyword are entity lookup steps.

They are not separate Discover endpoints.

`append_to_response` belongs exclusively to the detail view, not to search.

## Lesson 6: Keep tests behavior-focused

Tests should verify behavior, not artificially cover branches.

The project does not target 100% coverage.

A minimum of 80% statement coverage is sufficient.

## Lesson 7: Document decisions

Document decisions, discarded approaches and open questions.

This prevents repeated mistakes and preserves context for future work.

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
- `docs/concepts/013-documentation-standards.md`
