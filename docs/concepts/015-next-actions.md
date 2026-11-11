# Next actions

## Status

Completed.

## Purpose

This concept documents the immediate next actions for NextWatch.

It defines the order of work before making further architecture decisions.

## Immediate next actions

1. Complete the inventory of the existing `main` state.
2. Review the remaining handlers and services.
3. Review the related tests.
4. Create a complete table of existing, partial, missing and contradictory capabilities.
5. Use the inventory as the basis for `tasks/003a-search-flow-restart.md`.
6. Make architecture decisions only after the inventory is complete.

## Files to review

The following files remain to be reviewed:

- `server/api/tmdb/search/keyword.get.ts`
- `server/api/tmdb/discover/tv.get.ts`
- `server/api/tmdb/movie/[id].get.ts`
- `server/api/tmdb/movie/[id]/`
- `server/api/tmdb/tv/[id].get.ts`
- `server/api/tmdb/tv/[id]/`
- `server/services/tmdb/detail.ts`
- Related tests in `tests/`

## Rule

Do not propose new endpoints, deletions or consolidation before the inventory is complete.

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
- `docs/concepts/016-open-questions.md`
