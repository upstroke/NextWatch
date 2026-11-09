import { describe, expect, it } from 'vitest';
import {
  AppLocaleSchema,
  TmdbContentLanguageSchema,
  resolveTmdbContentLanguage,
} from '@lib/schemas/locale';

describe('application locale schema', () => {
  // Statement coverage: accepts both supported application locales
  it.each(['en', 'de'] as const)('accepts %s', (locale) => {
    expect(AppLocaleSchema.parse(locale)).toBe(locale);
  });

  // Branch coverage: rejects unsupported, malformed and missing locales
  it.each(['fr', 'en-US', 'EN', '', ' en ', null, undefined, 1])(
    'rejects invalid locale %s',
    (locale) => {
      expect(AppLocaleSchema.safeParse(locale).success).toBe(false);
    },
  );
});

describe('TMDb content language schema', () => {
  // Statement coverage: accepts supported content languages
  it.each(['en-US', 'de-DE'] as const)('accepts %s', (language) => {
    expect(TmdbContentLanguageSchema.parse(language)).toBe(language);
  });

  // Branch coverage: rejects unsupported, malformed and missing content languages
  it.each(['fr-FR', 'en', 'de', '', null, undefined, 1])(
    'rejects invalid content language %s',
    (language) => {
      expect(TmdbContentLanguageSchema.safeParse(language).success).toBe(false);
    },
  );
});

describe('locale to TMDb content language mapping', () => {
  // Statement coverage: maps each application locale to a valid content language
  it.each([
    ['en', 'en-US'],
    ['de', 'de-DE'],
  ] as const)('maps %s to %s', (locale, expected) => {
    const language = resolveTmdbContentLanguage(AppLocaleSchema.parse(locale));

    expect(language).toBe(expected);
    expect(TmdbContentLanguageSchema.parse(language)).toBe(expected);
  });
});
