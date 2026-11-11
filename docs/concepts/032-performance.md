# Performance

## Status

Completed.

## Purpose

This concept documents the performance foundations for NextWatch.

It defines rules for server-side TMDb calls, minimal payloads, deliberate caching and measured optimization.

## TMDb calls

TMDb calls are performed server-side.

Do not expose TMDb credentials in client-side code.

## Minimal payloads

Use only the data required by the current feature.

Do not add fields without a documented purpose.

## Caching

Caching is deliberate and limited.

Do not introduce caching without a documented reason.

## Optimization

Optimize only after measuring.

Do not make premature performance changes.

## Out of scope

- Automatic activation of additional performance capabilities without separate verification.
- Premature optimization.
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
- `docs/concepts/028-handoff.md`
- `docs/concepts/029-contribution-guide.md`
- `docs/concepts/030-code-of-conduct.md`
- `docs/concepts/031-security.md`
- `docs/concepts/033-accessibility.md`
