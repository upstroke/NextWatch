# Review checklist

## Status

Completed.

## Purpose

This concept documents the review checklist for NextWatch tasks.

It defines the checks before a task is considered complete.

## Review checklist

- Is the inventory complete?
- Is the implementation based on the inventory?
- Do tests verify behavior, not artificially cover branches?
- Does documentation record decisions, discarded approaches and open questions?
- Has the user approved the implementation?

## Coverage rule

The project does not target 100% coverage.

A minimum of 80% statement coverage is sufficient.

## Documentation rule

Document decisions, discarded approaches and open questions.

This prevents repeated mistakes and preserves context for future work.

## Approval rule

Every GitHub write action requires explicit user approval.

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
- `docs/concepts/021-future-work.md`
