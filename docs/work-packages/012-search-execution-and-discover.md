# Search execution and discover

## Specification

### Purpose

Turn validated criteria into provider searches and return results with explicit execution and completeness status. Use the [WP 009 state contract](009-search-state-and-filter-catalog.md), [WP 010 clarification guardrails](010-clarification-and-guardrails.md) and [WP 014 resolved identities](014-entity-resolution.md). Criteria-based search is not restricted to a single Discover endpoint.

### Dependencies

- WP 009 supplies state, accepted-person records, derived technical IDs and controlled transitions.
- WP 010 supplies clarification guardrails; WP 011 supplies extraction contracts.
- [WP 014](014-entity-resolution.md) supplies person and keyword resolution. Despite its higher number, WP 014 is a prerequisite for live unresolved-entity integration in WP 012. Existing package numbers are retained; dependency order takes precedence over numeric order.
- Discover-only execution can be developed independently with validated synthetic resolved inputs; do not claim complete live person search before resolution integration.

### Scope

- Convert validated filters and accepted identities into supported execution plans.
- Block the new complete search while required people remain unresolved; do not silently run a subset or relax AND to OR.
- Support movies and series, and both when media type is unspecified. Preserve media type in results and the contract consumed by result presentation.
- For movies, evaluate cast-filter Discover execution with AND semantics and additional qualifying-role validation as required. Do not assume a cast filter alone excludes appearances as oneself.
- For TV, verify and implement a credits-based path using per-person TV credits, qualifying acting roles, deduplicated series IDs and intersection across required people. Same-series participation does not require the same episode.
- Apply only supported additional criteria, without silently dropping genre, rating, year or provider requirements. Define the supported combinations and explicit unsupported outcomes.
- Define detail/provider enrichment, region-aware streaming versus rental/purchase semantics and bounded server-side orchestration.
- Define sorting, result pagination, request budgets, concurrency, rate-limit handling, technical failures and completeness. Verify endpoint contracts and pagination behavior before implementation.
- Document concrete endpoint, pagination and provider-limit assumptions with authoritative source references and the verification date during implementation. Keep changeable API limits in provider/transport policy, not as fixed product rules.
- Only acting roles qualify. Exclude crew and appearances as oneself, including such appearances in talk shows or documentaries; define a tested policy for insufficient role information. Do not exclude an entire title solely because of its genre or assume an unverified character-name heuristic is complete.
- All results means accessible matching titles recorded by the provider, not guaranteed real-world completeness or one unbounded response.
- Incomplete role classification, filtering, retrieval or enrichment must yield explicit incomplete/error information, never a verified empty result or a claim of all results.
- A local processing budget is not a provider result limit. Absence of a documented credits maximum is not a completeness guarantee.
- Return results tied to the source revision. Do not apply outdated responses; prior visible results are not results of a pending new request.

### Existing boundaries and required execution adapter

- Reuse `deriveActiveSearchFilters()` in `src/lib/domain/search/derive-active-search-filters.ts` for technical ID projection. It derives person IDs from `state.people` and excludes pending queries and inactive genres. It is not an execution-readiness check, provider request or complete Discover adapter.
- Keep `SearchState.filters`, `ActiveSearchFilters` and `DiscoverFilters` distinct. Existing server services accept `DiscoverFilters` from `src/lib/schemas/discover.ts`, not stored search state. Technical `personIds` in that service contract are not legacy duplicate storage to remove.
- Implement and test an explicit mapping from domain `minYear`/`maxYear` to service `yearFrom`/`yearTo`, preserving absent/open bounds and all supported criteria. Route `mediaType` through execution planning; do not pass the projection blindly into a schema that can discard unmatched fields.
- Existing `server/services/tmdb/discover-params.ts` emits `with_cast` whenever its input has person IDs, without a media-type guard. Do not treat this as TV person support. Guard or specialize execution paths before live person integration and test that unsupported TV cast filtering is never silently sent as an equivalent search.
- Verify concrete provider behavior before implementing the TV credits path and acting-only eligibility. Movie cast filtering alone does not establish acting-only participation either.
- Reuse WP 009 genre compatibility and inactive-return handling. Inactive genres are retained wishes, not active provider filters; do not restore them by bypassing domain transitions. Complete catalog acquisition and network orchestration must remain outside the pure WP 009 functions.
- Define readiness for all required unresolved entity criteria, including keyword queries, before execution; pending requests must not disappear merely because the technical projection omits them.
- Preserve a source revision through all requests and enrichment. A domain mode of `discover` is not by itself permission to execute.

### Out of scope

- Entity resolution and candidate enrichment for identity selection (WP 014).
- Clarification interaction (WP 010), result rendering, automatic error recovery and full LLM implementation.

### Inputs and outputs

Inputs: validated WP 009 search state, resolved identities, filter catalog and verified provider contracts. Outputs: execution plan, provider parameters, matching movie/series results, source revision, execution status and completeness information.

### Implementation tasks and acceptance criteria

- Map validated state to movie and TV execution paths without losing criteria.
- Use validated resolved IDs and retain ID/name associations for meaningful state.
- Test the domain-to-service adapter for year-name translation, open bounds, supported filters, media routing and exclusion of pending/inactive values.
- Test Movie/TV person routing explicitly; no unsupported cast parameter may masquerade as a valid TV person condition.
- Enforce shared acting participation for all requested people.
- Test unresolved blocking, role exclusions, intersection/deduplication, additional filters, stale responses, bounded work and incomplete-versus-empty outcomes.
- Record source-backed provider assumptions and their verification date; distinguish provider behavior from local execution budgets.
- Keep domain decisions pure where possible and inject server-side transports; never expose credentials or call TMDb directly from browser code.
- Return results for later presentation with honest completeness and error status.

## Execution status

- Scope expanded on 2026-11-15 from Discover-only execution to include the approved person-search requirements and credits-based TV planning.
- Live resolution dependency explicitly assigned to WP 014; no provider execution is implemented by this documentation change.
- Replaced the separate requirements-document reference with direct WP links and clarified role eligibility, media-type preservation and source-backed API-limit policy.
- Read-only review at `26aefe9` identified the existing technical projection, distinct year-field contracts and unguarded cast-parameter mapping. This package explicitly owns their execution integration; the documentation does not fix or certify that code.
- These are execution-boundary tasks, not a transfer of unfinished WP 009 domain acceptance criteria. WP 009 still requires its own complete review and validation.
- No tests, coverage, lint or typecheck were run for this update.
