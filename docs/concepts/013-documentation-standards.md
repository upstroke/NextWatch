# Documentation standards

## Status

Completed.

## Purpose

This concept documents the documentation standards for NextWatch.

It defines the documentation structure, concept format, task format and rule against unsupported claims.

## Documentation structure

Documentation is organized as follows:

- `docs/concepts/`
- `docs/tasks/`
- `docs/testing.md`

Concept documents describe established decisions and foundations.

Task documents describe actionable work.

## Concept format

Concept documents use the following structure:

- Status
- Purpose
- Scope
- Architecture
- Error behavior
- Testing
- Out of scope
- Related documentation

## Task format

Task documents use the following structure:

- Status
- Goal
- Scope
- Acceptance criteria
- Out of scope
- Related documentation

## Rule against unsupported claims

Do not claim implementation details without reading the actual code.

Earlier claims about `append_to_response`, error handling and architecture were not supported by verified code.

## Documentation discipline

Document decisions, discarded approaches and open questions.

This prevents repeated mistakes and preserves context for future work.

## Out of scope

- Automatic activation of additional documentation capabilities without separate verification.
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
- `docs/concepts/014-current-state.md`
