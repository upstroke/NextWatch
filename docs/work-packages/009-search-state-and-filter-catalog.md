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

- Person-state requirements are specified here; [WP 010](010-clarification-and-guardrails.md), [WP 011](011-llm-parser-contract.md), [WP 012](012-search-execution-and-discover.md) and [WP 014](014-entity-resolution.md) specify their respective responsibilities. The specification extensions approved on 2026-11-15 are requirements, not claims of implemented behavior.
- WP 008 validates and atomically applies structured filter changes. It does not extract or store unresolved entity queries.
- WP 009 owns pending-query state, accepted-person representation and pure controlled transitions. It does not interpret natural language or perform TMDb lookups.
- [WP 010](010-clarification-and-guardrails.md) owns clarification and selection workflow contracts; candidate lists are not active filters.
- [WP 011](011-llm-parser-contract.md) owns extraction and must integrate with the WP 009 state model.
- [WP 014](014-entity-resolution.md) owns actual server-side person and keyword resolution. Resolution is not assigned to WP 011.
- [WP 012](012-search-execution-and-discover.md) owns search execution, including credits-based TV execution.
- Pending queries are not resolved IDs and must not be silently applied as active ID filters.

### Person criteria and accepted-person state

- Support person criteria for movies and TV series. Only acting roles qualify; crew work and appearances as oneself do not. WP 012 must verify participation semantics, not assume cast membership alone proves an acting role.
- Multiple people joined by AND must participate in the same title. For TV this means the same series, not necessarily the same episode. Without an explicit media type, both movies and series are eligible.
- Represent accepted people as ID/name records and derive technical person-ID filters from this single source of truth. Migrate the existing filter contract and all callers together; do not maintain independently editable ID and name lists.
- Give pending person requests stable internal references independent of the query name and list position. Renaming a request or reordering the list must not change its identity or redirect a resolution result to another request.
- Distinguish additions from replacements; a replacement references its accepted target, which remains accepted until atomic replacement. Never apply the old person and the pending replacement as an implicit AND condition.
- Preserve active filters, accepted people and unrelated pending person/keyword requests across every pending-query or resolution transition, except for the explicitly targeted change.
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
- Pending-person references remain stable across renaming and list reordering. Replacement candidates are not added as an implicit AND condition alongside their accepted target.
- Pending-person references and replacement targets are stable; controlled acceptance is atomic, revision-guarded, deduplicated and limit-checked, preserving unrelated filters and pending requests.
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

WP 009 is completed by explicit user acceptance on 2026-11-15. The user accepted closure with the documented limited review scope despite the outstanding complete repository-wide reference inventory. That inventory remains an open, non-blocking follow-up; it is not claimed as completed or proven unnecessary. The Specification is unchanged. This is work-package acceptance, not an exhaustive audit, a merge or confirmation of complete live person-search functionality.

### Historical implementation milestones

- Initial state contract: `src/lib/schemas/search-state.ts` introduced mode, revision, filters and pending queries. The user reported tests green; coverage, lint and typecheck were not separately confirmed at that stage.
- Filter catalog: `src/lib/domain/search/filter-catalog.ts` reuses schemas and domain limits for the technical filter fields. `extraction.ts` derives field classifications from this catalog. Commit `75ac43c` named catalog types for readability. Tests cover completeness, operations, schema reuse, unknown/prototype fields and the person-change boundary.
- Commit `b944c1ee37432e042bbd297bac24788214847701` extended the existing `applyIntent` to the complete SearchState rather than add a duplicate acceptance layer. The reused WP 008 filter application, atomic rejection, one revision increment per effective acceptance and state-preserving non-applied outcomes remain the architectural basis. The user reported tests, coverage, lint and typecheck green at that stage; this was not assistant-executed validation.
- Commit `cfec84e3f24dd9cb9f8b59baedfc0972d1e80ad7` added `createInitialSearchState()` and two independence/default tests. The user reported successful local validation, not an assistant-run test-first cycle.
- Commit `efeb58a` recorded the approved person-search requirements. The subsequent scope alignment assigned provider resolution to WP 014 and execution to WP 012; the temporary separate requirements document was later consolidated into the work packages.
- Commit `6e67d6d` introduced accepted ID/name records and `SearchState.people`; `b273b5e` migrated schema tests. Legacy stored `filters.personIds` was rejected rather than silently discarded or enriched with invented names.
- Commit `e031361` migrated intent application to stored-filter validation and preserved accepted people. Commit `f1f7221` migrated initialization and the four affected domain test files, and added technical filter projection with four tests. These were incremental commits requested by the user, including temporarily incompatible schema-only stages.
- Commit `83c4311` documented that migration. Subsequent read-only review found further existing structured-pending, person-acceptance, ID-set and genre-compatibility implementation; the old descriptions of these as absent were no longer accurate.
- Commit `26aefe9` consolidated requirements into the work packages and recorded the user's then-available test report. Commit `7d64270` aligned follow-up packages with the inspected domain interfaces and execution boundaries.

### Current state and pending-query implementation

Reviewed at code snapshot `26aefe9` and the documentation successor `7d64270`:

- `src/lib/schemas/search-state.ts` stores accepted people as unique ID/name records; technical person IDs remain derived. Names and pending query text are trimmed; legacy stored person-ID lists and bare pending strings are not the current contract.
- `PendingPersonQuerySchema` uses application-owned `ref`, query text and explicit add/replace context; replacement includes `targetPersonId`. `PendingKeywordQuerySchema` uses reference and query text. Pending references are unique across entity kinds.
- Shared person capacity counts accepted people plus pending additions; replacements target existing people and do not reserve another accepted-person slot. Replacement targets must exist and have at most one pending replacement. Active keyword IDs and pending keyword additions share the existing keyword limit.
- `src/lib/schemas/search-transition.ts` defines `PendingQueryCommandSchema` and `PersonAcceptanceSchema`. Person acceptance carries a request reference, source revision and ID/name record. Structural validation is not evidence of provider provenance or candidate membership.
- `applyPendingQueryCommand()` in `src/lib/domain/search/pending-operations.ts` already implements add/change/remove for both pending kinds. Changes address stable references; normalized ineffective changes preserve revision. Invalid, stale, occupied or wrong-kind references are rejected without mutation.
- `acceptResolvedPerson()` already applies a trusted resolution outcome atomically. It validates reference/revision association, removes the matching request and adds or replaces the person while preserving unrelated criteria. Duplicate additions remove the pending request without duplicating identity. Replacement A to already accepted B removes A and leaves B once. Existing accepted names are retained for existing identities.
- Both transition paths validate the resulting complete state, derive mode and advance revision exactly once for effective acceptance. They perform no lookup, extraction, network orchestration or search.
- `src/lib/domain/search/get-search-mode.ts` derives trending/discover from effective filters, accepted people and pending requests. Initial defaults alone produce trending. Discover mode does not authorize execution.

### Filter semantics and inactive genre values

- `src/lib/schemas/search.ts` normalizes genre/keyword ID sets before enforcing their unique-count limits and retains first-occurrence order. `applyIntent()` compares effective ID sets rather than treating repetition or reordering alone as changed criteria. Unchanged sets keep their stored order when another criterion changes.
- `src/lib/domain/search/genre-compatibility.ts` reconstructs the complete genre wish, partitions known compatible/incompatible IDs for media changes and remembers inactive values with positions. Shared IDs are retained; no substitute genre ID is invented.
- Media changes with desired genres require complete application-supplied Movie/TV catalogs. Missing, malformed and non-covering catalogs yield distinct rejections rather than fabricated incompatibility. `src/lib/schemas/genre-catalogs.ts` validates structure; the supplying boundary must establish actual retrieval/completeness.
- Returning to a compatible media type restores remembered values. Explicit replace/remove operations address the complete wish so discarded inactive values do not reappear. Active and inactive values share a unique bounded genre wish.
- `applyIntent()` validates the resulting complete state, preserving shared pending limits, accepted people and unrelated requests. It returns optional media-change facts for later consumers, not translated messages or executed searches. Chat intents still cannot edit accepted people or technical person IDs.
- `deriveActiveSearchFilters()` creates independent technical filter data from accepted state, omitting pending requests and inactive genre metadata. It neither resolves entities nor checks execution readiness, provider compatibility or the full domain-to-Discover field mapping.

### Review evidence and acceptance mapping

- State representation and legacy rejection: `tests/unit/schemas/search-state.spec.ts` covers defaults, referenced-query normalization, ID/name preservation, limits, duplicate identities, equal names with distinct IDs, blank labels, year constraints and rejected legacy ID storage.
- Pending preservation, stable reference changes, mode/revision and controlled person replacement: `tests/unit/domain/search/pending-operations.spec.ts` covers additions/changes/removals for both entity kinds, ineffective changes, stale outcomes, wrong-kind/occupied references, shared limits, invalid targets, atomic acceptance, duplicate IDs and mutation isolation.
- ID-set validation/equality: `tests/unit/domain/search/id-set-semantics.spec.ts` covers normalization before limits, ineffective reordered sets, effective changes and stored-order preservation.
- Media changes and inactive values: `tests/unit/domain/search/genre-compatibility.spec.ts` covers shared genres, deactivation/restoration with positions, explicit removal/replacement, missing/invalid/non-covering catalogs, per-media scopes and complete-wish limits.
- Intent application and state preservation: `tests/unit/domain/search/apply-intent.spec.ts` covers atomic acceptance/rejection, deep preservation of people/pending records, people-only discover mode, pending criteria, combined keyword capacity and ineffective outcomes.
- Clarification/error separation and stale statuses: `tests/unit/domain/search/clarification.spec.ts`. Technical catalog versus chat authorization: `tests/unit/domain/search/filter-catalog.spec.ts`. Independent defaults and technical projections: `create-initial-search-state.spec.ts` and `derive-active-search-filters.spec.ts`.
- The inspected code/test paths support the domain acceptance areas above. The read-only review has not identified a proven functional correction to make within that inspected scope; no speculative production changes or duplicate implementations were introduced. This is not proof that every repository file or every possible edge case has been reviewed.

### Caller and execution-boundary review

- The checked domain producers/consumers use `people` and referenced pending records, not a separately stored `SearchState.filters.personIds`. `app/app.vue` is a rendering shell and does not consume search state.
- Checked Movie/TV Discover routes in `server/api/tmdb/discover/` parse `DiscoverQuerySchema` and `DiscoverFiltersSchema` and call the existing Discover service. They do not deserialize the WP 009 domain SearchState.
- Checked `server/services/tmdb/discover.ts`, `discover-params.ts`, `search.ts`, `detail.ts` and `watch-providers.ts` use their service-specific filters, query text or entity IDs, not the migrated stored state. Numeric person-ID filters in Discover contracts are valid technical inputs, not duplicate person-name storage to remove.
- Domain years use `minYear`/`maxYear`; the existing service contract uses `yearFrom`/`yearTo`. The explicit adapter and readiness check are assigned to WP 012.
- The existing Discover parameter builder emits `with_cast` for nonempty person IDs without a media-type guard. This is not verified TV person support; WP 012 explicitly owns guarding/specializing execution and the separate credits path before integration.
- The follow-up read-only review at `d4e6f48` additionally inspected all five Search routes, Movie/TV detail and watch-provider routes, Trending, the detail/discover/search/trending mappers, HTTP transport, server helpers, technical Discover tests, Search service/mapper tests, candidate fixtures, schema exports and Search/Discover HTTP test definitions. No obsolete stored-person-state caller was found in those checked paths.
- This remains a scoped inspection, not an exhaustive repository-wide reference inventory. Not every other schema, test, fixture or configuration file was read end-to-end. The index-based searches returned incomplete results and were not used as proof of absence. The user explicitly accepted this limitation for closure.

### Validation report

- On 2026-11-15 the user reported all tests green and subsequently explicitly confirmed coverage, lint and typecheck for the implementation completed so far. These are user-reported successful local checks, not assistant-executed validation.
- No exact numeric coverage value, command output, precise local HEAD or local working-tree cleanliness was supplied or independently verified. The report must not be represented as a certified CI result or a successful assistant-run test-first red/green cycle.
- The assistant performed read-only repository/code/test review and did not run tests, coverage, lint or typecheck. No application code is changed by this acceptance documentation.

### Closure decision and non-blocking follow-up

- On 2026-11-15 the user explicitly requested that WP 009 be marked completed even though a complete reference inventory is still outstanding. This is final user acceptance of the work package with the documented review limitation; it supersedes the prior open-for-inventory status.
- The complete repository-wide caller/reference inventory remains an open follow-up, not a completed check. Any later concrete compatibility finding must be tracked and validated separately; closure does not establish that all possible references or defects have been ruled out.
- Accepted domain scope includes the implemented state contract, catalog, pending operations, controlled person acceptance, mode/revision rules, ID-set semantics and inactive genre handling described above. No implementation is claimed for the excluded provider or UI workflows.
- WP 010 owns the complete clarification workflow and candidate selection interaction. WP 011 owns parser extraction and its validated application adapter. WP 014 owns identity lookup/provenance/candidate validation and resolution coordination. A controlled keyword-resolution acceptance integration remains explicitly to be designed before its implementation; this is not claimed as an existing person-acceptance feature.
- WP 012 owns domain-to-service adaptation, readiness, provider execution, Movie/TV person routing, acting-role eligibility and result completeness. Store/UI work, provider calls and full asynchronous orchestration remain outside WP 009.
- This closure changes documentation only. It neither merges the branch nor starts another work package or deploys anything.
