# Search execution and discover

## Specification

### Purpose

Turn validated criteria into provider searches and return results with explicit execution and completeness status. Follow the approved [person search contract](../person-search-contract.md). Criteria-based search is not restricted to a single Discover endpoint.

### Dependencies

- WP 009 supplies state, accepted-person records, derived technical IDs and controlled transitions.
- WP 010 supplies clarification guardrails; WP 011 supplies extraction contracts.
- [WP 014](014-entity-resolution.md) supplies person and keyword resolution. Despite its higher number, WP 014 is a prerequisite for live unresolved-entity integration in WP 012. Existing package numbers are retained; dependency order takes precedence over numeric order.
- Discover-only execution can be developed independently with validated synthetic resolved inputs; do not claim complete live person search before resolution integration.

### Scope

- Convert validated filters and accepted identities into supported execution plans.
- Block the new complete search while required people remain unresolved; do not silently run a subset or relax AND to OR.
- Support movies and series, and both when media type is unspecified. Preserve media type in results.
- For movies, evaluate cast-filter Discover execution with AND semantics and additional qualifying-role validation as required. Do not assume a cast filter alone excludes appearances as oneself.
- For TV, verify and implement a credits-based path using per-person TV credits, qualifying acting roles, deduplicated series IDs and intersection across required people. Same-series participation does not require the same episode.
- Apply only supported additional criteria, without silently dropping genre, rating, year or provider requirements. Define the supported combinations and explicit unsupported outcomes.
- Define detail/provider enrichment, region-aware streaming versus rental/purchase semantics and bounded server-side orchestration.
- Define sorting, result pagination, request budgets, concurrency, rate-limit handling, technical failures and completeness. Verify endpoint contracts and pagination behavior before implementation.
- Only acting roles qualify. Exclude crew and appearances as oneself; define a tested policy for insufficient role information. Do not classify solely by title genre or assume an unverified character-name heuristic is complete.
- All results means accessible matching titles recorded by the provider, not guaranteed real-world completeness or one unbounded response.
- Incomplete role classification, filtering, retrieval or enrichment must yield explicit incomplete/error information, never a verified empty result or a claim of all results.
- A local processing budget is not a provider result limit. Absence of a documented credits maximum is not a completeness guarantee.
- Return results tied to the source revision. Do not apply outdated responses; prior visible results are not results of a pending new request.

### Out of scope

- Entity resolution and candidate enrichment for identity selection (WP 014).
- Clarification interaction (WP 010), result rendering, automatic error recovery and full LLM implementation.

### Inputs and outputs

Inputs: validated WP 009 search state, resolved identities, filter catalog and verified provider contracts. Outputs: execution plan, provider parameters, matching movie/series results, source revision, execution status and completeness information.

### Implementation tasks and acceptance criteria

- Map validated state to movie and TV execution paths without losing criteria.
- Use validated resolved IDs and retain ID/name associations for meaningful state.
- Enforce shared acting participation for all requested people.
- Test unresolved blocking, role exclusions, intersection/deduplication, additional filters, stale responses, bounded work and incomplete-versus-empty outcomes.
- Keep domain decisions pure where possible and inject server-side transports; never expose credentials or call TMDb directly from browser code.
- Return results for later presentation with honest completeness and error status.

## Execution status

- Scope expanded on 2026-11-15 from Discover-only execution to include the approved person-search requirements and credits-based TV planning.
- Live resolution dependency explicitly assigned to WP 014; no provider execution is implemented by this documentation change.
- No tests, coverage, lint or typecheck were run for this update.
