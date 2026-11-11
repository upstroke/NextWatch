# Implementation guardrails

## Status

Completed.

## Purpose

This concept documents implementation guardrails for NextWatch.

It defines rules to prevent repeating the mistakes of the discarded multi-step search orchestration approach.

## Guardrail 1: Inventory first

Complete the inventory before making architecture decisions.

Do not propose new endpoints, deletions or consolidation before the inventory is complete.

## Guardrail 2: Avoid premature abstraction

Do not introduce multiple orchestration files or abstractions before the underlying flow is verified.

## Guardrail 3: Use existing foundation first

Build on the existing `main` state before introducing new architecture.

## Guardrail 4: Separate entity lookup from Discover

Person and keyword are entity lookup steps.

They are not separate Discover endpoints.

`append_to_response` belongs exclusively to the detail view, not to search.

## Guardrail 5: Keep tests behavior-focused

Tests should verify behavior, not artificially cover branches.

The project does not target 100% coverage.

A minimum of 80% statement coverage is sufficient.

## Guardrail 6: Document decisions

Document decisions, discarded approaches and open questions.

This prevents repeated mistakes and preserves context for future work.

## Guardrail 7: Verify before claiming

Do not claim implementation details without reading the actual code.

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
- `docs/concepts/019-definition-of-done.md`
