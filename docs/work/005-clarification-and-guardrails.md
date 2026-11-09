# 005 — Clarification and guardrails

## Specification

### Goal

Extend the clarification and guardrail layer based on the real TMDb search capabilities and multi-step flows. Ensure that ambiguous, unsupported or unsafe requests cannot silently mutate the search state or trigger an unintended TMDb request.

### Scope

- Structured clarification reasons.
- Structured clarification options with deterministic actions.
- Guardrails for search modes, entity IDs, filter values and media type compatibility.
- Validation of LLM intents before any state change.
- Protection against prompt injection and unsafe model output.
- Local parser evaluation cases.

### Clarification reasons

| Reason | Example |
| --- | --- |
| `ambiguous-entity` | "Zeitreise" could be a title, keyword or person. |
| `ambiguous-title` | Multiple plausible titles match "Matrix". |
| `ambiguous-person` | Multiple people match "Chris Evans". |
| `ambiguous-keyword` | Multiple keywords match "Zeitreise". |
| `missing-region` | "Wer streamt Matrix?" requires a region. |
| `missing-media-type` | "Ab 2020" does not specify Movie, TV or both. |
| `unsupported-intent` | A requested capability is not supported. |
| `conflicting-filters` | A requested change conflicts with active filters. |

### Structured options

A clarification option is not a free-text instruction. It contains an ID, a localized label and a deterministic action:

```ts
type ClarificationOption = {
  id: string;
  label: string;
  action: SearchPatch;
};
```

Examples:

- "Search as keyword" applies `mode: entity-resolution`.
- "Select this person" applies `entity-selection`.
- "Use Germany" applies `provider-lookup` with `region: 'DE'`.
- "Search movies and TV shows" applies `mediaType: 'all'`.

### Guardrails

- Media type must be `movie`, `tv` or `all`.
- Filter values must remain within catalog-defined ranges.
- Maximum 3 genres and 5 keywords per request.
- Person IDs are limited by the filter catalog.
- Keyword and person IDs must originate from a preceding TMDb Search response.
- Unknown or invalid IDs are rejected.
- Invalid JSON, unknown fields and unsupported operations do not trigger a search.
- TMDb failures, timeouts and cancellations produce defined UI states.
- The search state changes only through validated and authorized patches.

### Architecture

- `src/lib/schemas/chat.ts`: typed intents, clarification reasons and options.
- `src/lib/schemas/guards.ts`: guardrail results and error shapes.
- `src/lib/search/reducer.ts`: deterministic state transitions.
- `server/services/tmdb/entity-resolution.ts`: entity candidate source.
- Local parser evaluations validate behavior against synthetic cases.

### Tests

Add tests for:

- Valid clarification reasons and options.
- Invalid clarification options.
- Ambiguous entity resolution.
- Missing region and missing media type.
- Unsupported intents.
- Conflicting filters.
- Invalid entity IDs.
- Revision conflicts.
- Prompt-injection-like model output.
- Parser evaluation cases with expected state transitions.

### Acceptance criteria

- Ambiguous requests leave the current search unchanged.
- Clarification options can trigger only validated deterministic actions.
- Invalid entity IDs cannot enter a Discover request.
- Unsupported requests do not invent replacement filters.
- Technical failures remain distinguishable from empty results.
- Local parser evaluations document correct changes, unwanted side effects, clarifications and unsupported cases.

### Out of scope

- Chat UI
- LLM or Ollama integration
- Automatic repair or retry loops
- Persistent conversation history
- External evaluation platforms

## Execution status

### Status

Planned.

### Next steps

1. Define clarification reasons and structured options.
2. Define guardrail result and error schemas.
3. Replace generic FilterChange schemas with typed patches.
4. Add guardrail validation for modes, IDs, filters and media types.
5. Add local parser evaluation fixtures and reporting.
