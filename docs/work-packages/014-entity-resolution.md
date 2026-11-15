# Person and keyword entity resolution

## Specification

### Purpose

Resolve unresolved person names and keyword terms to validated TMDb identities without confusing identity lookup with movie/series search. Use the [WP 009 state contract](009-search-state-and-filter-catalog.md) and [WP 010 clarification contract](010-clarification-and-guardrails.md); [WP 012](012-search-execution-and-discover.md) owns final title execution and participation eligibility.

### Ownership and dependencies

- This package explicitly owns server-side person and keyword resolution previously left unassigned.
- WP 009 owns the domain state and pure acceptance transitions. WP 010 owns clarification and selection workflow. WP 011 owns text extraction. WP 012 owns movie/series execution and acting-role eligibility.
- Implement after the required WP 009 state contracts and WP 010/011 interface contracts are available, and before live unresolved-entity integration in WP 012. The numeric identifier does not imply execution after WP 012; retain existing package numbers.
- Contracts may be developed with synthetic fixtures, without prematurely implementing later UI or execution work.

### Scope

- Search people and keywords through injected server-side TMDb transports. Reuse existing search contracts where suitable; verify concrete gaps before adding adapters.
- Validate provider responses and map person candidates to provider ID and display name. Carry stable pending-request reference and source revision throughout resolution.
- Define explicit unique, ambiguous and no-match outcomes. A successful response with no match differs from technical failure, malformed response and incomplete candidate retrieval.
- Define a conservative, tested uniqueness policy before implementation. Do not treat rank/popularity or a truncated first page as proof of identity.
- Provide available known movie/series titles with media type as person-selection aids; no profile image is required. These titles are not a complete filmography or final results.
- Pass ambiguous/no-match outcomes to WP 010. Preserve unrelated accepted people and criteria; never drop unresolved conditions to enable execution.
- Validate user selection against the offered candidate set and its request/revision association. Do not accept arbitrary model-generated or stale IDs.
- Produce validated acceptance input for the pure WP 009 transition. That transition owns atomic pending removal, accepted-person addition/replacement, deduplication, limits and revision increment.
- Define keyword candidate mapping, ambiguity/no-match policy and validated ID acceptance explicitly. Reuse WP 009 pending/active keyword state and limits; do not guess IDs or automatically copy person-specific selection rules. Specify any necessary keyword acceptance-transition extension in WP 009 before integration.
- Define bounded candidate retrieval/enrichment, timeouts, rate-limit handling and incomplete outcomes. Do not hide truncation as no match or unique match.

### Integration with existing WP 009 code

- Reuse structured `PendingPersonQuerySchema`, `PendingKeywordQuerySchema` and accepted-person records from `src/lib/schemas/search-state.ts`; do not recreate pending state as unreferenced strings.
- `PersonAcceptanceSchema` in `src/lib/schemas/search-transition.ts` already defines `ref`, `sourceRevision` and an ID/name `person`. Produce that input only after provider identity and candidate membership are established. Structural parsing alone is not provenance validation.
- Reuse `acceptResolvedPerson()` from `src/lib/domain/search/pending-operations.ts`. Do not duplicate its stale-revision guard, matching-request lookup, atomic pending removal, addition/replacement, existing-name retention or ID deduplication.
- Existing acceptance treats an addition resolving to an accepted ID as effective pending removal. Replacing A with already accepted B removes A and retains B once. Respect these domain decisions rather than introducing a second conflicting policy.
- Reuse `applyPendingQueryCommand()` for pending-request corrections/removals. Candidate retrieval and selection workflow must not increment criteria revision merely by showing a question.
- Bind each lookup to its request and revision. If another accepted transition makes the result stale, do not bypass the revision guard or merely relabel the result with a newer revision; define safe re-resolution/revalidation coordination.
- Keyword lookup remains assigned here, but a controlled keyword-resolution acceptance operation has not been verified in the inspected WP 009 code. Before implementation, specify the missing integration contract and obtain approval for any required domain extension; do not apply keyword IDs through an unguarded side channel.

### Out of scope

- Natural-language extraction (WP 011).
- UI rendering and the complete clarification interaction (WP 010).
- Filmography execution, TV-credit intersection, provider filtering and acting-role classification for final results (WP 012).
- Direct mutation of active filters, automatic search relaxation and full LLM implementation.

### Inputs

- Validated pending person/keyword request with stable reference and source revision.
- Explicit person addition/replacement context from WP 009.
- Validated selection context when clarification was necessary.
- Injected server-side provider dependencies.

### Outputs

- Validated unique, ambiguous or no-match person/keyword outcomes.
- Person candidate IDs, names and available distinguishing movie/series titles.
- Validated identity-acceptance inputs bound to the original request and revision.
- Explicit technical-error or incomplete-resolution status.

### Implementation tasks and acceptance criteria

- Review existing provider search schemas, services and fixtures before adding code.
- Define and test response mapping, uniqueness policy and complete-versus-incomplete candidate handling.
- Support independent resolution of multiple names without changing the requested AND condition.
- Test ambiguous/no-match behavior, candidate membership, stale selection and request association.
- Test person replacement integration and keyword acceptance against WP 009 without duplicating its domain decisions.
- Test coordination of multiple resolution results against the existing global revision guard; never apply stale identities by rewriting their source revision.
- Keep lookup and candidate enrichment server-side, credential-safe and transport-injected.
- Test with synthetic fixtures and mocked external boundaries; report actual validation separately from plans.

## Execution status

- Assigned on 2026-11-15 as the dedicated owner for person and keyword resolution.
- Replaced the separate requirements-document reference with direct state, clarification and execution links.
- Read-only review at `26aefe9` found existing pure person acceptance and pending operations; this package must integrate them rather than implement a competing state machine. This finding does not establish provider resolution or full WP 009 completion.
- Planned, not implemented. This package does not authorize starting resolution code while WP 009 remains the active implementation package.
- Uniqueness rules, candidate bounds, missing-title fallback, keyword acceptance integration, multi-result coordination and concrete provider-contract gaps remain implementation-design tasks.
- No tests, coverage, lint or typecheck were run for this documentation step.
