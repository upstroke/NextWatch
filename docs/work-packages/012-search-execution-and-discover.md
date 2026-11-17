# Search execution and discover

## Specification

### Purpose and dependencies

Implement the execution stage of the [product and search flow](000-product-and-search-flow.md): derive valid Movie/TV requests from one confirmed general search draft and return a common result representation. One application search may require multiple provider calls.

Reuse [WP 009](009-search-state-and-filter-catalog.md) state/transitions, [WP 010](010-clarification-and-guardrails.md) guardrails and [WP 011](011-llm-parser-contract.md) parser application contracts. [WP 014](014-entity-resolution.md) supplies trusted person/keyword identities before live unresolved-entity integration. Order remains WP 011 → WP 014 → WP 012. Synthetic resolved inputs may support isolated adapter tests, not a claim of complete live search.

### Scope

- Validate execution readiness against the complete current draft, not merely the technical active-filter projection. Open required identities or unsupported work must not silently disappear.
- Require final review and explicit search confirmation. A domain mode of `discover`, media change, completed lookup or last clarification answer is not search authorization.
- Derive technical Movie and TV reference objects from the same confirmed draft. They describe validated target shapes, not additional editable or independently persisted search states.
- Support Movie, TV and both. For both, invoke the relevant paths independently and in parallel where dependencies allow; the browser calls our API, not TMDb.
- Return results associated with the executed source revision/snapshot. Reject obsolete responses; keep previous visible results distinct from edited criteria.

### Technical request mapping

- Inspect existing contracts before defining common fields and media-specific extensions. Share fields only when meaning and validation agree. Zod contracts define data shapes; derive TypeScript types rather than duplicating them.
- Publish and test a field mapping from each supported domain criterion to the existing service contract and provider parameters. Include media routing, people, genres, keywords, minimum rating, year bounds and supported sorting. Provider capability does not automatically expand product scope.
- Reuse `deriveActiveSearchFilters()` in `src/lib/domain/search/derive-active-search-filters.ts` for technical projection. Person IDs come from accepted `state.people`; pending requests and inactive genres are not active provider filters. Projection alone proves neither readiness nor complete mapping.
- Inspect `SearchState.filters`, `ActiveSearchFilters` and service `DiscoverFilters` in `src/lib/schemas/discover.ts` as distinct boundaries. Keep useful validation differences; consolidate redundancy only with all affected callers/tests accounted for.
- Explicitly map domain `minYear`/`maxYear` to service `yearFrom`/`yearTo`, then the appropriate media-specific date semantics. Preserve absent and open bounds. Do not pass objects through schemas that silently discard unmatched criteria.
- Use existing genre compatibility/inactive-return rules. Do not equate different Movie/TV genres without an approved mapping.
- Media changes update the shared draft through domain rules; derive the new technical request rather than synchronize two stored objects. Accepted identities remain available.

### Scope of Movie and TV execution

| Confirmed selection | Server-side path |
| --- | --- |
| Movie | Movie Discover with supported filters and required person-role validation |
| TV without people | TV Discover with supported filters |
| TV with people | Focused TV-person credits helper plus all supported additional criteria |
| Both | The relevant Movie and TV paths from the same confirmed draft |

- Verify the concrete provider contracts before implementing each path. Document authoritative sources and verification date; do not encode changeable provider limits as product constants.
- The previously identified unconditional `with_cast` mapping in `server/services/tmdb/discover-params.ts` must be rechecked and guarded or specialized before live TV-person use. No unsupported TV cast parameter may masquerade as a valid person search.
- Movie cast filtering does not by itself establish qualifying acting participation or exclude appearances as oneself.
- For TV, retrieve per-person TV credits, identify qualifying acting participation, deduplicate series IDs and intersect across every required person. Shared series participation does not require the same episode.
- Exclude crew-only work and appearances as oneself, including talk-show/documentary appearances. Do not exclude a whole title merely by genre. Define a tested insufficient-role-information policy; character-name heuristics or episode counts alone must not be presented as reliable role classification.
- TV credits and intermediate ID sets are execution data, not permanently appended draft criteria. Keep identity resolution in WP 014.
- Apply every supported additional criterion. Where credits lack required information, use targeted detail/provider enrichment or verified Discover comparison. Do not guess, drop filters or weaken AND to OR. Define explicit unsupported/incomplete outcomes for combinations not fully implemented.
- Provider availability work must distinguish region and streaming versus rental/purchase where supported; this does not introduce a new user filter without an agreed product contract.

### Common results, pagination and completeness

- Normalize Movie/TV results for presentation while retaining media type and provider ID. Use their combination as result identity; unify title/date fields without overwriting their media meaning.
- Define sorting and pagination before implementing combined results. Preserve unshown loaded items; do not lose or duplicate results through naive truncation and page increments.
- A common sort of loaded items is not automatically a globally ordered result stream across all unseen provider pages. Define and report the supported guarantee.
- Provider totals before a person intersection or other additional filtering are not automatically totals of the final matching result set.
- Define bounded request budgets, concurrency, timeouts, rate-limit handling and technical-error behavior. A local processing budget is not a provider result limit.
- Expose partial failure and incomplete retrieval/classification/filtering/enrichment explicitly. Neither is a verified empty result or permission to claim all matches.
- All results means accessible matching titles recorded by the provider, not guaranteed real-world completeness or one unbounded response. Absence of a documented credits maximum is not a completeness guarantee.

### Implementation approach and cleanup

Prefer explicit request mappers and focused server-side execution functions. Keep pure domain decisions separate from injected transport. No general matcher, mutable duplicate search state, framework, store or registry is required by this specification.

Before implementation, inventory affected contracts, services, callers, tests and documentation. Classify them as keep, adapt, merge or remove. Remove obsolete structures and their implementation-specific tests together while preserving required behavior coverage. Obtain approval for concrete runtime/schema/test changes.

### Out of scope

- Entity identity resolution/candidate selection: WP 014.
- Parser/model execution: WP 011.
- UI rendering, permanent storage, automatic recovery and title-disambiguation implementation.
- Direct TMDb calls or credentials in browser code.

### Inputs and outputs

Inputs: validated current draft, trusted resolved identities, relevant catalogs, explicit execution confirmation and injected provider dependencies.

Outputs: validated technical requests and normalized results with source association, execution/error status, pagination information and honest completeness guarantees. The final response contract remains implementation-design work.

### Implementation tasks and acceptance criteria

- Define the field mapping and minimal Movie/TV request contracts without dropping supported criteria.
- Test year-name/date mapping, open bounds, media routing, genre compatibility, accepted-person projection and exclusion of pending/inactive values.
- Test readiness and explicit confirmation; unresolved criteria must block the complete search.
- Test Movie/TV/both execution, person AND semantics, role eligibility, deduplication, TV intersections and additional criteria with injected transports.
- Test Movie → TV → Movie wish preservation and that switching alone performs no search or redundant identity lookup.
- Test stale results, combined result identity, pagination retention, technical/partial failures and incomplete-versus-empty outcomes.
- Verify provider assumptions against authoritative documentation during implementation. Update affected code, callers, schemas, tests and documentation together.
- Run tests, coverage, ESLint and typecheck for implementation changes; report actual results rather than inferred success.

## Execution status

- 2026-11-17: Specification aligned with one confirmed general draft, derived Movie/TV reference objects and focused server-side TV-person execution.
- WP 009 and WP 010 are completed. WP 011 and WP 014 integration precede complete live execution; this document does not reopen their accepted foundation or certify unimplemented behavior.
- Concrete provider-contract verification, field mapping, result/pagination contracts, role eligibility and file-level cleanup inventory remain pending.
- Documentation only. No runtime code, schemas or tests changed; no tests, coverage, ESLint or typecheck run.
