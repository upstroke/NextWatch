# 004 — Search state, filter catalog and patches

## Specification

### Goal

Establish the authoritative, model-free search state for NextWatch. Define a versioned filter catalog, a pure reducer, typed patches and a URL adapter so manual filters, prepared suggestions and the later LLM parser use the same deterministic rules.

### Scope

- `SearchMode`: `trending`, `title-search`, `entity-resolution`, `discover`, `provider-lookup`.
- `SearchState`: mode, revision, filters, title query, entity resolution and provider lookup state.
- Pure reducer for validated state transitions.
- Versioned filter catalog.
- Typed search patches.
- URL serialization and deserialization.
- Media type compatibility rules.
- Session-scoped return values for deactivated filters.

### Filter catalog

The filter catalog is the versioned source of truth for supported filters. It defines field name, allowed operations, value type and range, applicable media types, UI metadata, TMDb mapping and compatibility rules.

Initial filters:

- `mediaType`: `movie`, `tv`, `all`
- `genreIds`: maximum 3 IDs
- `keywordIds`: maximum 5 IDs
- `personIds`: maximum 3 IDs
- `minRating`: 0 to 10
- `yearFrom` and `yearTo`: 1900 to 2100
- `sortBy`: `popularity.desc` or `vote_average.desc`

### Typed patches

Use a discriminated union rather than a free-form field/value pair:

```ts
type SearchPatch =
  | { type: 'mode'; value: SearchMode }
  | { type: 'filter'; field: FilterField; operation: FilterOperation; value: unknown }
  | { type: 'title-query'; value: string }
  | { type: 'entity-selection'; kind: EntityKind; id: number }
  | { type: 'provider-lookup'; mediaType: MediaType; id: number; region: string };
```

The reducer validates the patch, checks the revision, applies deterministic consequences and returns a new immutable state.

### Media type rules

| Transition | Rule |
| --- | --- |
| `movie` to `tv` | Deactivate and remember Movie runtime filters; never convert runtime to episode duration. |
| `tv` to `movie` | Deactivate TV-specific filters and restore remembered Movie values where applicable. |
| `movie` or `tv` to `all` | Use separate Movie and TV queries; media-specific filters apply only to their respective branch. |
| Genre, provider or date filters | Validate meaning and availability per media type; do not blindly reuse IDs. |

### URL state

The URL contains active, shareable search criteria only. It does not contain chat messages, raw user input, model output, loading state, run IDs or pagination cursors.

Example:

```text
/?mode=discover&type=movie&people=287&genres=28&yearFrom=2020
```

### Architecture

- `src/lib/schemas/search.ts`: search modes, state, revision and patches.
- `src/lib/schemas/entity-resolution.ts`: entity candidates, selection and pending filters.
- `src/lib/search/filter-catalog.ts`: versioned filter definitions.
- `src/lib/search/reducer.ts`: pure state transitions.
- `src/lib/search/url-state.ts`: URL serialization and normalization.

### Tests

Add unit tests for:

- Valid and invalid Search states.
- Every supported patch type.
- Revision conflicts.
- Filter operations.
- Media type transitions.
- Return values for deactivated filters.
- URL round trips.
- Invalid or unknown URL parameters.
- Preservation of unrelated filters.

### Acceptance criteria

- The reducer is pure and does not call TMDb.
- Only valid patches can change the search state.
- Every effective change increments the revision.
- Media type changes apply deterministic compatibility rules.
- Active search criteria can be restored from a URL.
- Chat messages, model output and execution state remain outside the URL.
- The same patch produces the same state transition regardless of whether it originates from a pill, prepared suggestion or future LLM intent.

### Out of scope

- Filter pill UI
- Result grid UI
- Detail page UI
- LLM or Ollama integration
- TMDb requests from the reducer
- Persistent search history

## Execution status

### Status

Planned.

### Next steps

1. Define SearchMode, SearchState, revision and typed patches.
2. Define the initial filter catalog.
3. Implement the pure reducer and tests.
4. Implement URL serialization and tests.
5. Add a Search Session composable after the core contracts are stable.
