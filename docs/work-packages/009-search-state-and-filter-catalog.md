# Search state and filter catalog

## Specification

### Purpose

This work package defines the search state and the filter catalog used by the search flow.

It describes how filters and pending entity queries are represented and preserved across search steps, and how filters are validated and combined.

### Scope

- Define the search state structure.
- Define the filter catalog.
- Define filter validation rules.
- Define how filters are combined.
- Define how existing filters are preserved.
- Define how pending person and keyword queries are represented and preserved in the search state, separately from resolved TMDb IDs.
- Prepare the search state for entity resolution and search execution.

### Work-package boundaries

- The approved [person search contract](../person-search-contract.md) supplies the person-state and product requirements. The specification extensions below were approved on 2026-11-15; they are not claims of implemented behavior.
- WP 008 validates and atomically applies structured filter changes. It does not extract or store unresolved entity queries.
- WP 009 owns pending-query state, accepted-person representation and pure controlled transitions. It does not interpret natural language or perform TMDb lookups.
- [WP 010](010-clarification-and-guardrails.md) owns clarification and selection workflow contracts; candidate lists are not active filters.
- [WP 011](011-llm-parser-contract.md) owns extraction and must integrate with the WP 009 state model.
- [WP 014](014-entity-resolution.md) owns actual server-side person and keyword resolution. Resolution is not assigned to WP 011.
- [WP 012](012-search-execution-and-discover.md) owns search execution, including credits-based TV execution.
- Pending queries are not resolved IDs and must not be silently applied as active ID filters.

### Person criteria and accepted-person state

- Support person criteria for movies and TV series according to the person search contract. Only acting roles qualify; crew work and appearances as oneself do not. WP 012 must verify participation semantics, not assume cast membership alone proves an acting role.
- Multiple people joined by AND must participate in the same title. For TV this means the same series, not necessarily the same episode. Without an explicit media type, both movies and series are eligible.
- Represent accepted people as ID/name records and derive technical person-ID filters from this single source of truth. Migrate the existing filter contract and all callers together; do not maintain independently editable ID and name lists.
- Give pending person requests stable internal references. Distinguish additions from replacements; a replacement references its accepted target, which remains accepted until atomic replacement.
- Preserve the existing person and keyword limits. Define enforcement across accepted people and pending additions, including replacement and duplicate cases, before implementation.
- Accepting a validated resolution atomically removes the matching pending request and adds or replaces the accepted person. Deduplicate by person ID; do not leave obsolete pending requests or silently alter the requested AND meaning.
- Match resolution acceptance to the pending reference and source revision. Reject stale results and preserve unrelated criteria. Person-ID changes from chat intents remain prohibited.
- WP 009 consumes validated resolution outcomes through a controlled transition; it neither looks up identities nor retrieves titles. Candidate lists remain in resolution/clarification state with explicit request and revision association.
- A request such as a science-fiction movie featuring Brad Pitt preserves the unresolved name until resolution and later uses the accepted identity as an acting-participation criterion. This describes required behavior, not a completed search feature.

### Search mode

- On the initial page visit without search criteria, the mode is `trending`.
- Once a valid search is initiated, the mode is `discover`; Trending is not used to execute an individual search.
- Removing all individual search criteria returns the mode to `trending`.
- Invalid requests and ineffective changes do not change the search mode.
- `discover` denotes criteria-based search, not a guarantee of calling one particular provider endpoint.
- Required unresolved people block execution of the new complete search. WP 012 enforces execution readiness; previous results must not be presented as results of that unresolved request.
- These rules define state transitions and contracts only. They do not authorize search execution or page-initialization UI work in WP 009.

### Revision and stale responses

- The revision identifies the current accepted domain search state.
- Increase the revision when an actual domain search-state change is accepted, including adding, changing or removing a pending person or keyword query.
- An effective controlled resolution acceptance increments revision exactly once, including atomic pending removal and accepted-person addition or replacement.
- Typing in an input draft, retrieving candidates and displaying clarification do not change criteria or revision.
- Invalid and ineffective changes preserve the existing search state and revision.
- Responses and selections based on an outdated revision must not be applied to the current state.
- Example: Sci-Fi filters are at revision 4. Accepting the pending query "Brad Pitt" creates revision 5. Replacing it with "Tom Cruise" creates revision 6. A late response for the Brad Pitt query at revision 5 must not overwrite revision 6.
- This specifies the contract for asynchronous consumers; it does not implement lookups or network orchestration in WP 009.

### Clarification and error outcomes

- A semantically invalid, contradictory or insufficiently clear search request preserves the existing search criteria and their revision and produces `needs_clarification` with an appropriate question.
- Distinguish preserved search criteria from clarification status: the application may report a pending clarification without modifying those criteria or their revision.
- Technical failures and malformed model responses remain error outcomes; do not present them as semantic clarification requests.
- These rules specify the required outcome. The complete clarification workflow, question catalog and guardrail behavior remain in WP 010; model integration is not implemented here.

### Ineffective changes and feedback

- When no effective change is accepted, preserve the search state and revision and do not request a new search.
- Provide a feedback outcome meaning: "Your search criteria are unchanged. The existing results remain."
- Do not report "No new movies or TV shows found" when no search was performed.
- A message meaning "No further movies or TV shows found" is reserved for an actual checked search or pagination result.
- WP 009 defines the domain outcome only; translated UI messages, rendering, search execution and pagination remain outside this work package.

### Out of scope

- Natural-language extraction and the entity-query parser contract (WP 011).
- Provider entity resolution (WP 014).
- Search execution, including Discover and credits retrieval (WP 012).
- Result presentation.
- Automatic error recovery.
- Full LLM implementation.

### Inputs

- User request.
- Existing search state.
- Filter catalog.
- Validation schemas.
- Validated resolution outcomes for controlled domain acceptance.

### Outputs

- Search state structure, including pending entity queries and accepted-person records.
- Filter catalog.
- Filter validation rules.
- Filter combination rules.
- Pure controlled state-transition outcomes.

### Implementation tasks

- Define the search state structure.
- Define the representation and preservation rules for pending person and keyword queries.
- Migrate accepted-person state, derived technical IDs and affected callers together.
- Implement pending-query add/change/remove and controlled person acceptance/replacement with stable references, deduplication and limit enforcement.
- Define search-mode transitions and revision updates according to the rules above.
- Define domain outcomes for clarification, errors and ineffective changes without implementing their UI or the full clarification workflow.
- Define the filter catalog.
- Define filter validation rules.
- Define filter combination rules.
- Define rules for preserving existing filters.
- Prepare the search state for later work packages.

### Acceptance criteria

- The search state is clearly defined.
- Pending person and keyword queries can be represented and preserved without being treated as resolved IDs or replacing existing active filters.
- Accepted people retain ID and display name with one source of truth for derived technical filters.
- Pending-person references and replacement targets are stable; controlled acceptance is atomic, revision-guarded, deduplicated and limit-checked.
- Initial entry without criteria uses Trending, a valid search uses Discover, and removing all individual search criteria returns to Trending.
- Accepted domain-state changes, including pending-query changes, increase the revision; input drafts, candidate retrieval, clarification display, invalid requests and ineffective changes do not.
- Outdated responses cannot overwrite the current search state.
- Semantic clarification preserves search criteria and revision; technical failures remain distinguishable errors.
- Ineffective changes return an unchanged outcome without requesting another search or claiming new search results.
- The filter catalog is clearly defined.
- Filters can be validated.
- Filters can be combined.
- Existing filters are preserved.
- The search state can be used by later work packages.

## Execution status

WP 009 remains in progress. The completed work is recorded below in implementation order; the remaining scope is listed separately.

### Step 1: Search-state contract

- Defined `src/lib/schemas/search-state.ts`: explicit mode, revision, active filters with resolved `personIds`, and separate pending person/keyword queries. Pending queries use the existing five-person and three-keyword limits.
- The user reported all tests green after step 1. This was a user report, not assistant-executed validation; coverage, lint and typecheck were not separately confirmed at that point.

### Step 2: Filter catalog

- Added a versioned, typed catalog in `src/lib/domain/search/filter-catalog.ts` for all eight active filter fields. Definitions reuse existing value schemas and list limits; whole-object year validation remains in the active-filter schema.
- `extraction.ts` derives its legacy field types from `SearchFilters` and its runtime field classification from the catalog instead of maintaining separate field-name arrays.
- Added `tests/unit/domain/search/filter-catalog.spec.ts` for completeness, shared schema references, allowed operations, unknown/prototype fields and the person-application boundary.
- Commit `75ac43c` improves readability by naming the local catalog types rather than nesting the full type in `satisfies`.

### Step 3: Apply chat intents to the complete search state

- Implemented in commit `b944c1ee37432e042bbd297bac24788214847701` (`feat(search): apply chat intents to complete search state`).
- Decision: extend the existing `applyIntent` rather than add an outer state function duplicating intent acceptance decisions. Intent validation, revision checking and atomic acceptance already belonged to this function. The existing individual-filter application logic remains reused in `extraction.ts`.
- `applyIntent(state, intent)` now accepts `SearchState` instead of separate filters and revision. An applied outcome returns the complete new state under `state`; non-applied outcomes leave the caller's original state authoritative.
- Effective accepted filter changes increment revision exactly once. Invalid, stale, clarification, unsupported, error-status and ineffective intents preserve the original state, mode and revision.
- Effective changes derive the mode from the resulting active filters and preserved pending queries. Default `mediaType: 'all'` and `sortBy: 'popularity.desc'` alone are not individual criteria. Non-default media type or sorting, optional scalar criteria, nonempty active ID lists or pending queries keep `discover`; removing the final criterion returns to `trending`.
- Existing resolved `personIds` and pending person/keyword queries are preserved. Catalog support does not authorize person-ID changes from chat intents: these remain rejected. This step neither extracts pending queries nor performs entity resolution or accepts resolution results.
- Updated `tests/unit/domain/search/apply-intent.spec.ts`, `clarification.spec.ts`, `year-range.spec.ts` and `filter-catalog.spec.ts` for the new state contract, preservation, atomic rejection, mode transitions, revision updates and the chat person-ID boundary.
- After being asked to run tests, coverage, lint and typecheck, the user reported "alles grün" for this commit. This is user-reported successful validation, not assistant-executed validation. No numeric coverage result or successful assistant-run test-first red/green cycle is claimed.

### Step 4: Initial search state

- Implemented in commit `cfec84e3f24dd9cb9f8b59baedfc0972d1e80ad7` (`feat(search): create initial search state`).
- Added `createInitialSearchState()` in `src/lib/domain/search/create-initial-search-state.ts`. It takes no parameters and returns a fresh `SearchState` with `mode: 'trending'`, revision `0`, default media scope and sorting, empty genre/keyword/person ID lists and empty pending person/keyword queries. Optional rating and year criteria are absent.
- Each call creates independent state, filter and pending-query objects and arrays. The function performs no network requests, UI/store integration or restoration of existing search criteria.
- Added `tests/unit/domain/search/create-initial-search-state.spec.ts` with two unit tests covering the initial values and independence between calls, including mutation isolation.
- The user reported "alles grün" after this commit. This is user-reported successful validation, not assistant-executed validation; no numeric coverage result or assistant-run test-first red/green cycle is claimed.

### Approved scope alignment: 2026-11-15

- Recorded the approved person-search contract in commit `efeb58a`. This documentation alignment assigns provider resolution to WP 014 and execution to WP 012.
- Extended the specification for accepted ID/name records, stable pending references, replacements and controlled acceptance. These extensions are not implemented by steps 1-4; their historical descriptions remain unchanged.
- No application code was changed and no tests, coverage, lint or typecheck were run for this documentation alignment.

### Step 5: Accepted-person state migration and technical filter projection

- Commit `6e67d6d` added `AcceptedPersonSchema` and `SearchState.people` in `src/lib/schemas/search-state.ts`. Accepted people carry a positive integer ID and trimmed nonempty display name; the existing person limit and unique-ID rule are enforced. Different IDs may share a name. This validates structure, not provider identity or acting participation.
- Stored `SearchState.filters` now uses `SearchFiltersSchema` without `personIds`. Legacy `filters.personIds` payloads are rejected rather than silently discarded or enriched with invented names. `ActiveSearchFiltersSchema` remains the technical filter contract, not an independently stored person-ID list.
- Commit `b273b5e` migrated `tests/unit/schemas/search-state.spec.ts` for defaults, identity/name preservation, trimming, person limits, duplicate IDs, equal names with distinct IDs, blank names and legacy-payload rejection; pending-query and year-range checks remain covered by test definitions.
- Commit `e031361` migrated `src/lib/domain/search/apply-intent.ts` to stored-filter validation. Accepted people participate in mode decisions and retain IDs/names. Applied outcomes copy the people list and its records; non-applied outcomes preserve the original state. Chat intents still cannot change people or derived person IDs, and no resolution is performed.
- Commit `f1f7221` migrated `src/lib/domain/search/create-initial-search-state.ts` to `people: []` and updated the four domain test files `create-initial-search-state.spec.ts`, `apply-intent.spec.ts`, `clarification.spec.ts` and `filter-catalog.spec.ts` under `tests/unit/domain/search/`. Tests include people-only discover mode, identity/name preservation, mutation isolation and atomic rejection of chat changes to `people` or `personIds`.
- The same commit added `src/lib/domain/search/derive-active-search-filters.ts`. `deriveActiveSearchFilters(state)` projects a previously validated state into technical filters, deriving person IDs only from accepted people and copying all ID arrays. It preserves existing list order, applies no pending queries, performs no network requests and neither checks execution readiness nor authorizes a search.
- Added four tests in `tests/unit/domain/search/derive-active-search-filters.spec.ts` for initial projection, populated projection, pending-only exclusion and independent objects/arrays with mutation isolation. Compatibility with the technical filter schema is asserted; no provider mediatype compatibility is implied.
- Commits were made incrementally at the user's request, including temporarily incompatible schema-only stages. The targeted Search-domain caller review and listed migrations do not establish a complete repository-wide caller inventory.
- Validation pending: tests, coverage, lint and typecheck were not executed by the assistant for these migration commits, and no user-reported validation result has been received for the final state through `f1f7221`. No green test run, numeric coverage result or executed test-first red/green cycle is claimed.

### Remaining work and boundaries

- Complete the repository-wide caller/reference review and validate the migrated state through `f1f7221`; address any concrete compatibility findings. The listed state, intent, initialization and test migrations are committed but not yet validated.
- Pending queries still use string lists. Stable pending references, add/change/remove operations, replacement targets, combined accepted/pending limit enforcement and controlled resolution acceptance/replacement with revision effects remain open.
- Accepted-person duplicate IDs are rejected structurally; transition-level deduplication during resolution acceptance is not implemented yet.
- ID-set normalization, mediatype compatibility and inactive return-value rules remain open; current list-order equality semantics are retained until explicitly changed and tested. Catalog entries establish neither ID provenance nor provider execution capabilities or genre-ID compatibility.
- Provider person and keyword resolution is assigned to WP 014, not implemented in WP 009.
- Store/UI integration, entity-query extraction (WP 011), network orchestration, search execution (WP 012) and the complete clarification workflow (WP 010) remain outside this implementation step.
- WP 009 is not complete.
