# Language-aware TMDb transport

## Status

Completed.

## Purpose

This concept documents the language-aware TMDb transport layer.

It establishes a single supported language scope, explicit language coupling and clear ownership of language handling across application, service and transport layers.

## Language scope

The application supports exactly two UI languages:

- `en`
- `de`

No additional language scope is introduced.

## Language coupling

The application UI language and the TMDb content language are coupled.

The UI language is the single source of truth for the TMDb content language.

| UI language | TMDb content language |
| ----------- | --------------------- |
| `en`        | `en-US`               |
| `de`        | `de-DE`               |

No separate language-selection state is introduced for TMDb content.

## Ownership

- `src/lib/i18n` owns UI language and locale state.
- `server/services/tmdb` owns TMDb-specific language mapping.
- `server/services/tmdb/http.ts` owns transport-level language handling.
- `server/api/tmdb` and UI components do not manually pass `language` parameters.

## Transport behavior

`server/services/tmdb/http.ts` is the single place that adds the TMDb `language` query parameter.

It reads the current UI language from `useRequestEvent()` and maps it to the corresponding TMDb language.

The mapping is:

- `en` maps to `en-US`
- `de` maps to `de-DE`

No fallback language is introduced.

## Architecture

- `src/lib/i18n` contains language and locale state.
- `server/services/tmdb/http.ts` contains TMDb-specific language mapping and transport concerns.
- `server/api/tmdb` remains a thin HTTP adapter layer.
- `server/services/tmdb` services receive an injected transport dependency.
- Services do not read H3 event context directly.

## Error behavior

- An unsupported language produces a defined error.
- Language mapping errors are not silently swallowed.
- Transport errors remain distinguishable from validation errors.

## Testing

- Unit tests cover language mapping, service orchestration and error isolation.
- HTTP contract tests cover invalid inputs and error behavior.
- Live TMDb verification remains a separate manual task.
- Tests do not claim coverage for successful live upstream responses, redirects, cancellation or pagination behavior.

## Out of scope

- Additional languages.
- Separate content-language selection.
- Region-specific content behavior.
- `append_to_response`.
- Detail page UI.
- Routing or navigation.
- Pinia or URL state.
- LLM or Ollama integration.
- Mixed Movie/TV result lists.
- Infinite scroll.
- Automatic activation of additional TMDb capabilities without separate verification.

## Related documentation

- ``
- ``
- ``
- ``
- `docs/testing.md`
