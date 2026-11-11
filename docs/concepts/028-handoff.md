# Handoff

## Status

Completed.

## Purpose

This concept documents the handoff state for NextWatch.

It records completed foundations, open questions, next steps and rules for future work.

## Completed foundations

The following foundations are completed:

- Service boundaries.
- TMDb Discover foundation.
- TMDb detail data contract.
- Language-aware TMDb transport.
- TMDb search and provider contracts.
- Testing standards.
- UI foundation.

## Open questions

The following questions remain open:

- Connection between person search and Discover.
- Clarification flow for multiple persons.
- Central search endpoint that connects both steps.
- `append_to_response` scope.
- Test coverage of the existing chain.
- TV Discover handler.
- Movie and TV detail handlers.

## Next steps

1. Complete the inventory of the existing `main` state.
2. Review the remaining handlers and services.
3. Review the related tests.
4. Create a complete table of existing, partial, missing and contradictory capabilities.
5. Use the inventory as the basis for `tasks/003a-search-flow-restart.md`.
6. Make architecture decisions only after the inventory is complete.

## Rules

- Verify before claiming.
- Preserve the overall concept.
- Avoid premature abstraction.
- Use the existing foundation first.
- Separate entity lookup from Discover.
- Keep tests behavior-focused.
- Document decisions.

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
- `docs/concepts/016-open-questions.md`
- `docs/concepts/017-task-003a-search-flow-restart.md`
- `docs/concepts/018-implementation-guardrails.md`
- `docs/concepts/019-definition-of-done.md`
- `docs/concepts/020-review-checklist.md`
- `docs/concepts/021-future-work.md`
- `docs/concepts/022-risk-register.md`
- `docs/concepts/023-decision-log.md`
- `docs/concepts/024-glossary.md`
- `docs/concepts/025-references.md`
- `docs/concepts/026-change-log.md`
- `docs/concepts/027-status.md`
- `docs/concepts/029-contribution-guide.md`
