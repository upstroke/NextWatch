# Glossary

## Status

Completed.

## Purpose

This concept documents the central terms used in NextWatch documentation.

It provides a shared vocabulary for architecture, search and testing.

## Entity lookup

Entity lookup is the process of resolving a search term to a specific entity ID.

Person and keyword are entity lookup steps.

They are not separate Discover endpoints.

## Discover

Discover is the process of retrieving Movie or TV results using filters.

Discover filters include genre, person, keyword, rating and year range.

## Disambiguation

Disambiguation is the process of clarifying ambiguity when multiple candidates match a search term.

## Pending filters

Pending filters are filters that are not yet applied to the current search state.

## Append to response

`append_to_response` is a TMDb parameter that adds related data to a detail response.

It belongs exclusively to the detail view, not to search.

## Search flow restart

Search Flow Restart is the decision to rebuild the search flow on the original `main` state and the `NextWatch_Studio_Konzept_v1.9.pdf` concept.

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
- `docs/concepts/025-references.md`
