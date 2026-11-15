# Person search contract

## Status

Product and state-design decisions approved by the user on 2026-11-15. This document records requirements, not implemented capabilities. Work-package specifications and implementation must be aligned with this contract in subsequent changes; no work package is completed by this document.

## Product semantics

- Support person-based searches for movies and TV series.
- Only acting roles qualify. Exclude crew work and appearances as oneself, including such appearances in talk shows and documentaries. Do not exclude a whole title solely because of its genre; the participation must qualify as an acting role.
- A cast credit alone must not be assumed to prove an acting role. The execution implementation must establish a tested classification policy and explicitly handle insufficient role information without claiming complete verified results.
- Multiple people joined by AND must all participate in the same movie or series. Shared participation in a series does not require a shared episode.
- A search must not silently drop an unresolved person, relax AND to OR, or remove another requested criterion to obtain results.
- Without a specified media type, search both movies and series. Separate source execution and result presentation must preserve the media type of each title.
- All results means accessible matching titles recorded by the data source, not a guarantee of every real-world credit or a requirement to display everything in one response.

## Domain-state requirements: WP 009

- Represent accepted people as ID/name records. Derive technical person-ID filters from these records rather than maintain two independently editable sources of truth. Review and migrate the existing filter contract and all callers together.
- Give each pending person request a stable internal reference, independent of its name and list position. Preserve the existing domain limits; define enforcement across accepted people and pending additions without bypassing the limit.
- Distinguish adding a person from replacing an accepted person. A pending replacement references its target. Keep the previous accepted person until replacement is accepted; never treat old and replacement people as an implicit AND condition.
- Accepting a resolution atomically removes its pending request and adds or replaces the accepted ID/name record. The same accepted person ID must not occur twice. Duplicate resolution must not silently change AND semantics or leave an obsolete pending request.
- Pending-query add/change/remove operations and effective accepted-person transitions update revision exactly once. Invalid and ineffective changes preserve the original state and revision.
- Loading candidates and displaying clarification do not themselves change criteria or revision. Bind asynchronous results and selections to their pending request and the revision on which they were based; reject stale application.
- Candidate lists belong to resolution/clarification state, not active filters. Keep candidate identity, source request and revision association explicit. WP 009 defines the integration contract, not candidate retrieval or the full clarification workflow.
- Preserve active filters and unrelated pending requests. Derive trending/discover mode consistently from effective criteria. Discover mode denotes an individual criteria-based search, not a guarantee of using a particular TMDb endpoint.
- Do not execute the new complete search while required people remain unresolved. Existing results may remain visible only as results of the previous accepted search, not as results of the unresolved request. Execution and presentation of this rule belong to later packages.
- Pure state transitions may consume validated resolution outcomes but must not perform provider lookups, extract names from natural language or orchestrate network requests.

## Clarification: WP 010

- Ask for selection when person identity is ambiguous. Preserve independently resolved people and unrelated criteria.
- Identify candidates by ID and display name; use available known movie/series titles with media type as distinguishing information. No profile image is required.
- Do not resolve ambiguity merely by choosing the highest-ranked or most popular result. Candidate titles are selection aids, not a complete filmography.
- A no-match outcome requests correction or explicit removal of the person criterion; it must not silently omit that person.
- Define candidate count, missing-title fallback and safe handling of selections bound to obsolete requests before implementing the interaction.

## Extraction: WP 011

- Extract one or multiple person names, requested media type and the common-participation requirement into the WP 009 state-application contract.
- Do not invent IDs or let the model select provider identities.

## Entity resolution: dedicated work package required

- Create and explicitly assign a dedicated entity-resolution work package before implementing provider lookups. Its number and dependency placement must be coordinated with the existing package sequence. It is a prerequisite for live person-based search execution.
- Own server-side person lookup, candidate ID/name mapping, distinguishing title enrichment, explicit unique/ambiguous/no-match outcomes and validation of provider responses.
- Coordinate safe selected-candidate acceptance with WP 010 and the pure WP 009 transition. Do not accept arbitrary model-generated IDs.
- Explicitly assign keyword resolution as well; it must not remain implicitly delegated to the parser. Do not assume person-specific selection semantics automatically apply to keywords.

## Search execution: extend WP 012

- Extend the current Discover-only scope to cover movie and credits-based TV execution without moving execution into WP 009.
- For movies, evaluate cast-filter execution and enforce the acting-only requirement. Do not assume a provider cast filter excludes appearances as oneself.
- For TV, plan per-person TV-credit retrieval, qualifying-role filtering, series-ID deduplication and intersection for multiple required people. Verify provider contracts before implementation.
- Additional supported criteria must be applied without silently dropping them. Define supported filters, required detail/provider enrichment and region-aware availability semantics.
- Specify ordering, result pagination, request budgets, bounded concurrency, rate-limit handling, technical failures and result completeness. A local processing cap is not a provider result limit.
- Do not interpret an undocumented credits maximum as a guarantee of unlimited or complete data. Record verified endpoint behavior and source references during provider-contract implementation rather than hard-code changing API limits as product rules.
- If role classification, filtering or enrichment is incomplete, report that explicitly. Never present partial processing as all results or a verified no-match result.

## Delivery sequence

1. Record these approved decisions.
2. Align WP 009 and cross-reference this contract from the affected packages; create the dedicated resolution assignment. Keep specification changes distinct from execution-status claims.
3. Review the affected schemas, domain functions and all callers, then migrate the WP 009 data contract with unit tests.
4. Implement pending-query operations and controlled accepted-person transitions with revision, preservation, deduplication and replacement tests.
5. Validate locally and document actual results, distinguishing user-reported validation from assistant-executed checks.
6. Implement clarification, extraction, provider resolution and search execution only in their assigned packages and dependency order.

## Execution status

- Requirements approved; implementation not completed.
- This documentation change does not modify schemas, domain code, UI or provider integrations.
- No tests, coverage, lint or typecheck have been run for this documentation step.
