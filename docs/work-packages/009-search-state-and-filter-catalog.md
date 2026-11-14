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
- Prepare the search state for entity resolution and Discover execution.

### Work-package boundaries

- WP 008 validates and atomically applies structured filter changes. It does not extract or store unresolved entity queries.
- WP 009 owns the state representation and preservation of pending person and keyword queries. It does not interpret natural language or perform TMDb lookups.
- WP 011 defines parser fields and the extraction contract for entity queries. Its parser output must integrate with the state representation defined in WP 009 rather than introduce a competing state model.
- Pending queries are not resolved IDs and must not be silently applied as active ID filters.
- Actual person and keyword resolution remains outside this work package and still needs an explicit implementation assignment. This clarification does not assign resolution to WP 011.

### Person filter semantics for movie searches

- A request such as "I am looking for a Sci-Fi movie with Brad Pitt" means a movie in the science-fiction genre featuring Brad Pitt as a cast member, not a movie involving him in any arbitrary production role.
- The person criterion needs the TMDb `personId` obtained by resolving the name. The product contract does not introduce separate cast, crew or general-participation role fields for this requirement.
- Before resolution, preserve "Brad Pitt" as a pending person query, separately from active resolved ID filters. Never guess the ID or treat the name as an ID.
- The intended later flow is: movie criterion + science-fiction genre + pending person query -> person lookup -> resolved `personId` -> Movie Discover filtered by that cast ID and genre. This describes the required behavior, not functionality implemented by WP 009.
- Name extraction belongs to WP 011. Person resolution and Discover execution remain outside WP 009. This movie example does not establish TV person-filter support or expand the scope to crew searches.

### Search mode

- On the initial page visit without search criteria, the mode is `trending`.
- Once a valid search is initiated, the mode is `discover`; Trending is not used to execute an individual search.
- Removing all individual search criteria returns the mode to `trending`.
- Invalid requests and ineffective changes do not change the search mode.
- These rules define state transitions only. They do not authorize Discover execution or page-initialization UI work in WP 009.

### Revision and stale responses

- The revision identifies the current accepted domain search state.
- Increase the revision when an actual domain search-state change is accepted, including adding, changing or removing a pending person or keyword query.
- Typing in an input draft does not change domain search state or its revision; only acceptance into that state counts.
- Invalid and ineffective changes preserve the existing search state and revision.
- Responses based on an outdated revision must not be applied to the current state.
- Example: Sci-Fi filters are at revision 4. Accepting the pending query "Brad Pitt" creates revision 5. Replacing it with "Tom Cruise" creates revision 6. A late response for the Brad Pitt query at revision 5 must not overwrite revision 6.
- This specifies the revision contract for later asynchronous consumers; it does not implement person lookups or network orchestration in WP 009.

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
- Entity resolution.
- Discover execution.
- Result presentation.
- Automatic error recovery.
- Full LLM implementation.

### Inputs

- User request.
- Existing search state.
- Filter catalog.
- Validation schemas.

### Outputs

- Search state structure, including pending entity queries.
- Filter catalog.
- Filter validation rules.
- Filter combination rules.

### Implementation tasks

- Define the search state structure.
- Define the representation and preservation rules for pending person and keyword queries.
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
- Initial entry without criteria uses Trending, a valid search uses Discover, and removing all individual search criteria returns to Trending.
- Accepted domain-state changes, including pending-query changes, increase the revision; input drafts, invalid requests and ineffective changes do not.
- Outdated responses cannot overwrite the current search state.
- Semantic clarification preserves search criteria and revision; technical failures remain distinguishable errors.
- Ineffective changes return an unchanged outcome without requesting another search or claiming new search results.
- The filter catalog is clearly defined.
- Filters can be validated.
- Filters can be combined.
- Existing filters are preserved.
- The search state can be used by later work packages.

## Execution status

- Planned; these documentation changes do not start WP 009 implementation.
- Entity-query state representation and preservation are explicitly assigned here; parser fields and extraction remain in WP 011.
- Movie person-filter semantics are explicitly documented: a resolved person ID identifies the requested cast member; no additional role taxonomy is required.
- User-approved mode, revision, clarification/error and ineffective-change feedback rules are documented above.
- No concrete entity-query schema or runtime behavior is introduced by these documentation changes.
