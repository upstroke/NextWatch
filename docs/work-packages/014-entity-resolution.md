# Person and keyword entity resolution

## Specification

### Purpose and dependencies

Provide focused server-side helpers that resolve pending names and terms for the general search draft defined by the [product and search flow](000-product-and-search-flow.md). Identity lookup answers who or which keyword is meant; it does not retrieve final movie/series results.

Reuse [WP 009](009-search-state-and-filter-catalog.md) state/acceptance and [WP 010](010-clarification-and-guardrails.md) clarification contracts. [WP 011](011-llm-parser-contract.md) supplies extraction/application contracts. Implement this package after WP 011 and before live unresolved-entity integration in [WP 012](012-search-execution-and-discover.md).

### Scope

- Resolve referenced pending person and keyword requests through injected server-side TMDb search dependencies. Reuse suitable provider contracts, services and fixtures before introducing adapters.
- Validate provider responses and retain pending-request reference, source revision and addition/replacement context. Schema validity alone does not prove identity provenance.
- Define unique, ambiguous, no-match, incomplete and technical-error outcomes. Do not treat popularity, result rank, one returned candidate or truncated retrieval as proof of uniqueness. Establish a conservative tested uniqueness policy.
- Supply person IDs, names and available distinguishing movie/series titles with media type for clarification. No profile image is required. These aids are not complete filmographies or search results.
- Pass ambiguity/no-match to existing clarification handling. Validate user selection against the offered candidates and current request association. Neither arbitrary model IDs nor stale selections may be accepted.
- Produce trusted acceptance input for controlled domain transitions. Preserve unrelated criteria and pending wishes; do not drop unresolved requirements to enable a search.
- Define keyword-specific candidate mapping and acceptance. Do not assume every person-selection rule applies to keywords.
- Bound retrieval/enrichment and define timeout, rate-limit and incomplete-result handling before implementation. Truncation is neither no match nor evidence of uniqueness.

### Integration with the general draft

- Reuse `PendingPersonQuerySchema`, `PendingKeywordQuerySchema` and accepted-person records in `src/lib/schemas/search-state.ts`; do not create another pending queue or independently stored person-ID list.
- `PersonAcceptanceSchema` in `src/lib/schemas/search-transition.ts` carries `ref`, `sourceRevision` and an ID/name `person`. Establish provider identity and candidate membership before producing this input.
- Reuse `acceptResolvedPerson()` in `src/lib/domain/search/pending-operations.ts` for controlled acceptance. It owns request matching, revision checks, atomic pending removal, addition/replacement, deduplication and capacity behavior.
- Preserve existing duplicate rules: an addition resolving to an accepted ID closes the pending request without another accepted entry; replacing A with accepted B removes A and retains B once.
- Reuse `applyPendingQueryCommand()` for supported corrections/removals. Showing candidates alone does not change criteria revision.
- Multiple lookups must respect the existing revision guard. Never make an obsolete result current by overwriting its source revision. Define safe current-state validation or renewed lookup where necessary.
- A controlled keyword-acceptance integration has not yet been established by this documentation step. Inspect the current implementation and obtain approval for any necessary domain extension; no unguarded keyword-ID side channel.
- Resolve an identity independently of Movie/TV execution. A media change alone must not require resolving an already accepted person again.

### Identity versus execution data

Accepted identity belongs in the existing draft. TV credits, qualified series-ID sets, intersections and provider enrichment belong to WP 012 execution, not to identity acceptance or permanent criteria storage.

Use small explicit helpers and the existing state boundaries. Any additional temporary selection context must have a demonstrated purpose; this package does not authorize a general store/registry or competing state machine.

### Inputs and outputs

Inputs: validated pending request, source association/revision, addition/replacement context, validated selection context where needed and injected provider dependencies.

Outputs: explicit resolution outcomes, candidate aids, trusted acceptance inputs or technical/incomplete status. The domain transition, not the transport helper, updates accepted criteria. Resolution does not authorize search execution.

### Out of scope

- Natural-language extraction: WP 011.
- UI rendering and a replacement clarification framework.
- TV-credit retrieval/intersection for final results, acting-role eligibility, Movie/TV filtering, pagination and search execution: WP 012.
- Automatic relaxation of wishes, direct browser calls and permanent conversation storage.

### Implementation tasks and acceptance criteria

- Inventory relevant search schemas, services, transports, acceptance functions, callers and fixtures; classify concrete reuse/change/removal needs.
- Define uniqueness, candidate retrieval bounds, missing-title behavior and keyword acceptance before implementation.
- Test response mapping, ambiguity/no-match versus failure/incompleteness, candidate membership, stale selection, source association and multiple-result coordination.
- Test duplicate/replacement integration using real existing domain transitions rather than duplicating their implementation. Preserve requested AND semantics for multiple people.
- Keep transport/enrichment server-side and credential-safe. Use synthetic fixtures and mocked external boundaries.
- Update affected code, callers, tests and documents together; run tests, coverage, ESLint and typecheck for implementation changes.

## Execution status

### Current status

- 2026-11-17: Specification aligned with the shared search draft; identity resolution explicitly distinguished from TV-person execution.
- Initial inventory and design started on 2026-11-17; no WP 014 runtime implementation has been introduced. WP 009 and WP 010 remain completed. The existing WP 011 proposal/application contracts support this inventory; WP 011 as a whole remains incomplete and has not been finally accepted. See its handoff and remaining-scope sections.
- Uniqueness, retrieval/enrichment bounds, keyword acceptance and multi-result coordination remain design/verification work. No concrete implementation or provider-interface change is approved by this status update.

### Initial inventory

- Inspected at commit `0f922ef`: this specification, `server/services/tmdb/search.ts` and `src/lib/domain/search/process-person-selection.ts`. This is a targeted initial inspection, not a complete inventory of schemas, mappers, callers, transports or tests.
- The existing search service already validates and maps person and keyword search responses. Reuse it where suitable rather than introducing a second provider search implementation.
- `processPersonSelection()` already connects offered-candidate validation to `acceptResolvedPerson()` and requires a trusted, synchronous identity validator. Its contract places live lookup in WP 014; structural validation of an acceptance object alone does not establish provider provenance.

### Verified integration gaps

- Search completeness is not exposed at the resolution boundary: in `server/services/tmdb/search.ts` at `0f922ef`, `searchPeople()` and `searchKeywords()` validate the provider response but return only mapped `response.results` arrays. Response-level pagination/completeness information is not passed to their callers.
- Consequently, those return values alone do not let a resolver determine whether further result pages exist. A single returned candidate must not be treated as proof of identity uniqueness; the conservative uniqueness policy remains to be defined and tested.
- WP 014 owns the decision on the smallest suitable interface extension or reuse, including affected callers and tests. The solution is not yet selected or implemented. This is an integration gap for identity resolution, not a claim that earlier green search-service checks failed. Candidate-retrieval completeness here is distinct from final movie/series result pagination in WP 012.

### Next design step and validation

- Complete the focused person-resolution inventory and propose a concrete file/test plan covering completeness information, conservative uniqueness, bounded retrieval and distinct ambiguous/no-match/incomplete/technical-error outcomes before implementation. Inspect keyword acceptance separately rather than copying person-selection rules.
- Documentation only: only Execution status is changed in this update; Specification remains unchanged. No runtime code, schemas or tests changed, and no tests, coverage, ESLint or typecheck were run by the assistant.
