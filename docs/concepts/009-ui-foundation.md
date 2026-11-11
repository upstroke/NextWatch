# UI foundation

## Status

Completed.

## Purpose

This concept documents the established UI foundation for NextWatch.

It defines the existing UI stack, language handling, state management and intentionally excluded UI areas.

## UI stack

The application uses:

- Vue 3
- Nuxt 3
- Nuxt UI
- Tailwind CSS
- Pinia
- `@nuxtjs/i18n`

## Language handling

The application supports exactly two UI languages:

- `en`
- `de`

The UI language is the single source of truth for the TMDb content language.

No separate language-selection state is introduced for TMDb content.

## State management

Pinia is used for application state.

The following state areas are established:

- `useSearchStore`
- `useLanguageStore`
- `useThemeStore`

## Theme handling

The application supports light and dark mode.

Theme state is managed by `useThemeStore`.

## Intentionally excluded UI areas

The following UI areas are intentionally excluded:

- Detail page UI.
- Routing or navigation.
- Filter pills.
- URL state.
- Infinite scroll.
- Backdrops.
- Mixed Movie/TV result lists.
- LLM or Ollama integration.

## Out of scope

- Additional languages.
- Separate content-language selection.
- Region-specific content behavior.
- `append_to_response`.
- Credits, cast, crew, videos, images, recommendations, similar titles, reviews, keywords, translations, alternative titles, release dates, watch providers, regions or certification.
- Automatic activation of additional UI capabilities without separate verification.

## Related documentation

- `docs/concepts/003-service-boundaries.md`
- `docs/concepts/004-tmdb-discover-foundation.md`
- `docs/concepts/005-tmdb-detail-data-contract.md`
- `docs/concepts/006-language-aware-tmdb-transport.md`
- `docs/concepts/007-tmdb-search-and-provider-contracts.md`
- `docs/concepts/008-testing-standards.md`
