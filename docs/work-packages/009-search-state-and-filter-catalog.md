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
- Define the filter catalog.
- Define filter validation rules.
- Define filter combination rules.
- Define rules for preserving existing filters.
- Prepare the search state for later work packages.

### Acceptance criteria

- The search state is clearly defined.
- Pending person and keyword queries can be represented and preserved without being treated as resolved IDs or replacing existing active filters.
- The filter catalog is clearly defined.
- Filters can be validated.
- Filters can be combined.
- Existing filters are preserved.
- The search state can be used by later work packages.

## Execution status

- Planned; this documentation change does not start WP 009 implementation.
- Entity-query state representation and preservation are explicitly assigned here; parser fields and extraction remain in WP 011.
- Movie person-filter semantics are explicitly documented: a resolved person ID identifies the requested cast member; no additional role taxonomy is required.
- No concrete entity-query schema or runtime behavior is introduced by this clarification.
