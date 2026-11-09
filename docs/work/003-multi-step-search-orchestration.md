# 003 — Multi-step search orchestration

## Specification

### Goal

Implement controlled, bounded search flows that combine TMDb Search, entity selection and Discover or Watch Provider requests. The application orchestrates these steps deterministically; the later LLM parser may only propose a validated transition.

### Scope

- Title Search using Movie, TV and Multi Search.
- Person and Keyword entity resolution.
- Selection of a resolved entity.
- Preservation and application of pending Discover filters.
- Watch Provider lookup for a selected Movie or TV entry.
- Explicit region handling for provider availability.
- Revision-based protection against stale responses and outdated selections.
- Cancellation and stale-response handling for multi-step flows.

### Search flows

#### Person plus Discover

```text
"Brad Pitt Actionfilme ab 2020"
-> /search/person?query=Brad Pitt
-> select person
-> /discover/movie?with_cast=<id>&with_genres=28&primary_release_date.gte=2020-01-01
```

#### Keyword plus Discover

```text
"Zeitreise, aber nur Filme"
-> /search/keyword?query=Zeitreise
-> select keyword
-> /discover/movie?with_keywords=<id>
```

#### Title plus Watch Providers

```text
"Wer streamt Matrix?"
-> /search/multi?query=Matrix
-> select title
-> /movie/<id>/watch/providers?region=DE
```

### Ambiguity rules

A bare term such as `Zeitreise` is ambiguous. The application may offer title, keyword and person candidates rather than silently choosing one interpretation.

When multiple plausible candidates exist, the search state remains unchanged until the user selects an option. A unique and confident candidate may proceed automatically, but the resulting search string must transparently identify the selected entity.

### Orchestration rules

- Each step has an explicit trigger.
- Entity IDs originate only from a preceding TMDb Search response.
- Pending filters survive entity resolution and are applied only after selection.
- No automatic repair, retry or unbounded search chain is allowed.
- A new user action may cancel or supersede an active flow.
- Late responses are ignored when their revision no longer matches the current search state.

### Architecture

- `server/services/tmdb/entity-resolution.ts` resolves people and keywords.
- `server/services/tmdb/search.ts` performs Search requests.
- `server/services/tmdb/discover.ts` performs Discover requests.
- `server/services/tmdb/providers.ts` performs Watch Provider requests.
- `src/lib/search/reducer.ts` owns deterministic state transitions.
- `src/lib/search/url-state.ts` owns the shareable URL representation.

### Tests

Add unit and integration tests for:

- Unique person resolution.
- Ambiguous person resolution.
- Unique keyword resolution.
- Ambiguous keyword resolution.
- Pending filter preservation.
- Entity selection.
- Invalid or unknown entity IDs.
- Title-to-provider lookup.
- Region handling.
- Revision conflicts.
- Cancellation and stale-response handling.

### Acceptance criteria

- A person can be resolved and used as a Discover filter only after selection.
- A keyword can be resolved and used as a Discover filter only after selection.
- Pending filters survive entity resolution.
- A title can be resolved and used for a regional provider lookup.
- Ambiguous entities produce a defined clarification flow.
- Invalid IDs, missing regions and technical failures remain distinguishable.
- Late responses cannot mutate an outdated search state.

### Out of scope

- Filter pills and result grid UI
- Detail page UI
- LLM or Ollama integration
- Automatic similar-title search
- Provider filtering in Discover
- Persistent search history

## Execution status

### Status

Planned.

### Next steps

1. Implement person and keyword resolution services.
2. Implement title and provider lookup services.
3. Define revision-aware orchestration boundaries.
4. Add integration tests for each supported flow.
5. Add manual live verification for person, keyword, title and provider flows.
