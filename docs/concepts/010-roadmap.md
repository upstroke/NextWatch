# Roadmap

## Status

Completed.

## Purpose

This concept documents the current roadmap for NextWatch.

It records completed foundations and intentionally open follow-up work.

## Completed foundations

The following foundations are completed:

- Service boundaries.
- TMDb Discover foundation.
- TMDb detail data contract.
- Language-aware TMDb transport.
- TMDb search and provider contracts.
- Testing standards.
- UI foundation.

## Current focus

The current focus is Search Flow Restart.

The previous multi-step search orchestration approach was discarded.

The new approach builds on the original `main` state and the `NextWatch_Studio_Konzept_v1.9.pdf` concept.

## Search flow restart

The search flow restart follows this sequence:

1. Parse filters and person query.
2. Validate and apply changes.
3. Resolve a person to a `personId` or clarify ambiguity.
4. Combine the person ID with genre and year range.
5. Use the existing Movie Discover function to return results.

Person and keyword are entity lookup steps, not separate Discover endpoints.

`append_to_response` belongs exclusively to the detail view, not to search.

## Open follow-up work

The following work remains open:

- Search Flow Restart.
- Detail page UI.
- Routing and navigation.
- Filter pills.
- URL state.
- Infinite scroll.
- Backdrops.
- Mixed Movie/TV result lists.
- LLM or Ollama integration.

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
- `docs/concepts/011-search-flow-restart.md`
