# Search state and filter catalog

## Specification

### Purpose and boundaries

Define the general search state, catalog, validation and pure transitions used by the [product and search flow](000-product-and-search-flow.md). Reuse this state for Movie, TV and both; do not maintain parallel editable searches.

WP 008 applies structured filter changes. WP 009 owns accepted people, pending requests, mode, revision and compatibility. [WP 010](010-clarification-and-guardrails.md) owns clarification contracts, [WP 011](011-llm-parser-contract.md) parser extraction/application, [WP 014](014-entity-resolution.md) trusted identity resolution and [WP 012](012-search-execution-and-discover.md) confirmed search execution. No provider lookup or natural-language interpretation occurs here.

### Person criteria and pending requests

- Support person wishes for Movie/TV. Multiple people joined by AND must have qualifying acting participation in the same title; for TV the same series suffices, not the same episode. Crew-only work and appearances as oneself do not qualify. WP 012 verifies final participation; accepted identity alone does not prove it. Without explicit media type, both media are eligible for a new search.
- Store accepted people as unique ID/name records in `people`; derive technical person IDs. Reject independently stored duplicate ID/name collections and legacy bare pending strings.
- Pending person/keyword queries are not accepted IDs. Give each an application-owned stable reference independent of query text and list position; references are unique across entity kinds.
- Person requests distinguish addition from replacement. A replacement targets an accepted person who remains until atomic acceptance; never interpret the pending replacement and source as an implicit AND.
- Preserve unrelated filters, accepted people, pending requests and inactive wishes through every targeted change.
- Enforce existing limits across accepted people and pending additions. Replacements target existing accepted entries; active keywords and pending keyword additions share capacity. Do not silently invent a different capacity policy.
- Controlled person acceptance matches reference and source revision, atomically removes the pending request and adds/replaces the accepted person. Deduplicate by ID, not name. An addition resolving to an accepted ID closes its pending request. Replacement A to accepted B removes A and retains B once, retaining an existing accepted name.
- Structural parsing does not establish provider provenance or offered-set membership. WP 014 supplies trusted input; chat filter intents cannot set accepted people/person IDs.
- Candidate lists remain outside active criteria and retain request/revision association.

### Mode, revision and failures

- Initial entry without individual criteria uses `trending`; effective criteria or pending wishes derive `discover`. Removing all individual criteria returns to Trending. Invalid/ineffective changes preserve mode.
- `discover` denotes criteria-based search, not one specific endpoint or permission to execute. Required unresolved wishes block the new complete search in WP 012. Previous results must not be presented as results of an edited/unresolved draft.
- Effective accepted state changes, including pending add/change/remove and atomic resolution acceptance, advance revision exactly once. Typing, retrieving candidates and showing questions do not. Invalid and normalized ineffective changes preserve state/revision.
- Reject responses or selections from an obsolete revision; do not rebase them by rewriting source revisions.
- Semantic conflict/ambiguity preserves accepted criteria and produces clarification information. Keep malformed model data and technical failures distinct from semantic questions.
- An ineffective change reports unchanged criteria and existing results, not a newly executed empty search. Further-result messages require actual retrieval. UI messages and execution remain outside WP 009.

### Genre and filter behavior

- Reuse existing field schemas/catalog and limits. Normalize genre/keyword ID sets before unique-count limits and compare effective sets rather than repetition/order alone. Keep stored order when sets are unchanged.
- Media changes use complete application-supplied Movie/TV genre catalogs. Missing, malformed or non-covering catalogs reject distinctly; no fabricated incompatibility or substitute IDs.
- Preserve incompatible genres as inactive positional return values and restore them when compatible again. Active and inactive genres form one bounded unique wish. Explicit removal/replacement addresses the complete wish so discarded values do not return.
- Apply resulting-state validation and preserve unrelated people/pending requests. Media feedback facts are not translated messages, provider calls or automatic search triggers.

### Existing contracts and acceptance coverage

- `src/lib/schemas/search-state.ts`: state, accepted people, referenced pending records and shared capacity.
- `src/lib/schemas/search-transition.ts`: controlled pending commands and person acceptance.
- `src/lib/domain/search/pending-operations.ts`: `applyPendingQueryCommand()` and `acceptResolvedPerson()`.
- `applyIntent()`: validated filter changes on the complete state with existing genre compatibility.
- `createInitialSearchState()`, `get-search-mode.ts` and `deriveActiveSearchFilters()` supply initialization, derived mode and technical projection. Projection omits pending/inactive data and is not readiness, resolution or a complete Discover adapter.
- Preserve coverage for stable references, mutation isolation, atomic/rejected transitions, replacement/duplicates, shared capacity, mode/revision/no-ops, stale inputs, genre restoration/removal and people/pending preservation. Existing unit suites are under `tests/unit/schemas` and `tests/unit/domain/search`.
- Keep source state, technical projection and service contracts distinct. Domain years are `minYear`/`maxYear`; service years are `yearFrom`/`yearTo`. WP 012 owns explicit adaptation and the known unguarded Movie/TV cast mapping follow-up.

### Out of scope

Provider lookup/provenance, candidate retrieval, parser/model integration, credits retrieval, search execution/readiness, pagination, UI/store wiring and automatic recovery. A controlled keyword-resolution acceptance integration remains to be designed with WP 014; person acceptance does not automatically supply it.

## Execution status

- Completed by explicit user acceptance on 2026-11-15 and merged through PR #11 at `61928e6fa9a4daeb7dbcdd44de34a04152d0715b`. WP 010 is also completed; the next implementation package is WP 011.
- The user accepted WP 009 with a complete repository-wide reference inventory still outstanding as a non-blocking follow-up. Successful validation and this documentation cleanup do not complete that inventory or prove absence of every caller issue.
- Existing implementation/review evidence covers state, catalog, pending operations, controlled person acceptance, mode/revision, effective ID-set semantics and inactive genres. This is not live person search or exhaustive repository verification.
- On 2026-11-17 the user confirmed all previously outstanding pre-WP-011 validation successful, including tests, coverage, ESLint and typecheck. This supersedes historical pending-check wording. No new exact coverage percentage or assistant-run command output is claimed.
- 2026-11-17: Historical handoff and repetitive milestone descriptions consolidated; current responsibilities and accepted behavior retained. No branch handoff instructions remain.
- Documentation only. No runtime code, schemas or tests changed and no validation commands run for this update.
