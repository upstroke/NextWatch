# Risk register

## Status

Completed.

## Purpose

This concept documents the most important risks for NextWatch.

It records risks that could repeat the mistakes of the discarded multi-step search orchestration approach.

## Risk 1: Unsupported assumptions

Claiming implementation details without reading the actual code can lead to wrong decisions.

Mitigation: verify before claiming.

## Risk 2: Parallel orchestration

Creating multiple orchestration paths can lose alignment with the overall concept.

Mitigation: preserve the overall concept.

## Risk 3: Premature abstraction

Introducing abstractions before the underlying flow is verified can create unnecessary complexity.

Mitigation: avoid premature abstraction.

## Risk 4: Insufficient test coverage

Insufficient test coverage can hide regressions and behavior changes.

Mitigation: keep tests behavior-focused and maintain at least 80% statement coverage.

## Risk 5: Missing documentation

Missing documentation can cause repeated mistakes and loss of context.

Mitigation: document decisions, discarded approaches and open questions.

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
- `docs/concepts/023-decision-log.md`
