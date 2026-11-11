# Decision log

## Status

Completed.

## Purpose

This concept documents the most important decisions for NextWatch.

It records decisions that shape the current architecture and workflow.

## Decision 1: Discard multi-step orchestration

The branch `feat/003-multi-step-search-orchestration` is discarded.

It is not blindly deleted; it is treated as a discarded working state.

## Decision 2: Restart on main

The search flow restart builds on the original `main` state and the `NextWatch_Studio_Konzept_v1.9.pdf` concept.

## Decision 3: Separate entity lookup from Discover

Person and keyword are entity lookup steps.

They are not separate Discover endpoints.

`append_to_response` belongs exclusively to the detail view, not to search.

## Decision 4: Inventory before architecture

Complete the inventory before making architecture decisions.

Do not propose new endpoints, deletions or consolidation before the inventory is complete.

## Decision 5: Behavior-focused tests

Tests should verify behavior, not artificially cover branches.

The project does not target 100% coverage.

A minimum of 80% statement coverage is sufficient.

## Decision 6: Document decisions

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
- `docs/concepts/024-glossary.md`
