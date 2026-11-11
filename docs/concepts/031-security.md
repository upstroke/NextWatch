# Security

## Status

Completed.

## Purpose

This concept documents the security foundations for NextWatch.

It defines rules for secrets, TMDb configuration, error details and authentication boundaries.

## Secrets

Do not store secrets in the repository.

Use environment variables for secrets.

## TMDb configuration

TMDb configuration is read from environment variables.

Do not expose TMDb credentials in client-side code.

## Error details

Error responses do not expose stack traces, raw upstream errors, request headers or credentials.

## Authentication

Authentication is out of scope for the current foundation.

Do not introduce authentication without separate verification.

## Out of scope

- Authentication.
- Authorization.
- Rate limiting.
- Audit logging.
- Automatic activation of additional security capabilities without separate verification.

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
- `docs/concepts/032-performance.md`
