# 001g — Language-aware TMDb transport

## Specification

### Goal

Introduce a configurable application language for TMDb requests. The selected application locale controls both the UI language and the TMDb content language. English is the default locale; German is the first additional supported locale.

This work package removes the hardcoded German content language from the TMDb transport and establishes the language contract before additional Search, Discover and provider endpoints are implemented.

### Language coupling

The user selects one application language. That selection controls both the UI locale and the TMDb content language.

| Application locale | TMDb content language |
| ------------------ | --------------------- |
| `en`               | `en-US`               |
| `de`               | `de-DE`               |

There is intentionally no separate selection for UI language and TMDb search language.

### Default configuration

The default application locale is configured through:

```env
NUXT_APP_DEFAULT_LOCALE=en
```

A developer may change this value to:

```env
NUXT_APP_DEFAULT_LOCALE=de
```

The value is validated with Zod. An invalid value must not silently fall back; it must produce a defined configuration error.

### Scope

- Add `AppLocaleSchema` with `en` and `de`.
- Add `TmdbContentLanguageSchema` with `en-US` and `de-DE`.
- Add a central mapping from application locale to TMDb content language.
- Extend `TmdbRuntimeConfigSchema` with `defaultLocale`.
- Read the default locale from `NUXT_APP_DEFAULT_LOCALE`.
- Remove the hardcoded `de-DE` language from the TMDb HTTP transport.
- Parameterize `getWeeklyTrending(language)`.
- Update the Trending service to pass the resolved content language to the transport.
- Update affected unit and HTTP contract tests.

### Contracts

```ts
export const AppLocaleSchema = z.enum(['en', 'de']);

export const TmdbContentLanguageSchema = z.enum(['en-US', 'de-DE']);

export const localeToTmdbLanguage = {
  en: 'en-US',
  de: 'de-DE',
} as const;

export const TmdbRuntimeConfigSchema = z.object({
  apiReadAccessToken: z.string(),
  baseUrl: z.string(),
  defaultLocale: AppLocaleSchema.default('en'),
});
```

### Transport change

The TMDb HTTP client must no longer embed a language preference:

```ts
async getWeeklyTrending(
  language: TmdbContentLanguage,
): Promise<unknown> {
  return this.get('/trending/all/week', { language });
}
```

The Trending service receives the resolved TMDb content language and passes it to the transport:

```ts
async getWeeklyTrending(
  language: TmdbContentLanguage,
): Promise<TmdbPagedResponse> {
  const raw = await http.getWeeklyTrending(language);
  // validate and map the response
}
```

### Architecture

- `src/lib/schemas/locale.ts` contains the application locale, TMDb content language and mapping.
- `src/lib/schemas/runtime-config.ts` contains the validated runtime configuration.
- `server/services/tmdb/http.ts` remains language-neutral.
- `server/services/tmdb/trending.ts` receives and forwards the resolved content language.
- Server route handlers resolve the configured default locale until a later UI language switch is introduced.

### Tests

Add or update tests for:

- Valid default locale `en`.
- Valid default locale `de`.
- Invalid or missing locale configuration.
- Locale-to-TMDb-language mapping.
- `getWeeklyTrending('en-US')` sends `language=en-US`.
- `getWeeklyTrending('de-DE')` sends `language=de-DE`.
- Trending service forwards the resolved language.
- Existing transport mocks provide the updated method signature.

### Acceptance criteria

- The default locale is configurable through `NUXT_APP_DEFAULT_LOCALE`.
- The default locale is `en` when no valid override is configured.
- `en` maps to `en-US` and `de` maps to `de-DE`.
- The TMDb transport no longer hardcodes `de-DE`.
- The Trending service passes the resolved TMDb content language to the transport.
- Existing tests and mocks are updated consistently.
- `pnpm test`, `pnpm lint`, `pnpm typecheck` and `pnpm build` pass locally.

### Out of scope

- Language switcher UI
- `@nuxtjs/i18n` integration
- JSON locale files
- Translated UI text
- Browser language detection
- Language persistence in cookies or localStorage
- Search, Discover, Detail and Watch Provider endpoints
- Separate configuration for UI language and TMDb content language

## Execution status

### Status

Planned.

### Next steps

1. Add locale and TMDb content-language contracts.
2. Extend the runtime configuration schema and server configuration.
3. Parameterize the TMDb HTTP transport.
4. Update the Trending service and its tests.
5. Update existing transport mocks and route tests.
6. Run local validation and record results.
