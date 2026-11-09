import { z } from 'zod';

export const AppLocaleSchema = z.enum(['en', 'de']);
export const TmdbContentLanguageSchema = z.enum(['en-US', 'de-DE']);

export type AppLocale = z.infer<typeof AppLocaleSchema>;
export type TmdbContentLanguage = z.infer<typeof TmdbContentLanguageSchema>;

export const localeToTmdbLanguage = {
  en: 'en-US',
  de: 'de-DE',
} as const satisfies Record<AppLocale, TmdbContentLanguage>;

/**
 * Resolves the TMDb content language for a validated application locale.
 *
 * @param locale - The validated application locale.
 * @returns The corresponding TMDb content language.
 */
export function resolveTmdbContentLanguage(locale: AppLocale): TmdbContentLanguage {
  return localeToTmdbLanguage[locale];
}
