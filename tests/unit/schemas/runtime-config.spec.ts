import { describe, expect, it } from 'vitest';
import { TmdbRuntimeConfigSchema } from '@lib/schemas/runtime-config';

describe('TMDb runtime config schema', () => {
  // Statement coverage: accepts a complete runtime configuration
  it('accepts a complete runtime configuration', () => {
    const config = TmdbRuntimeConfigSchema.parse({
      apiReadAccessToken: 'synthetic-token',
      baseUrl: 'https://api.themoviedb.org/3',
      defaultLocale: 'de',
    });

    expect(config).toEqual({
      apiReadAccessToken: 'synthetic-token',
      baseUrl: 'https://api.themoviedb.org/3',
      defaultLocale: 'de',
    });
  });

  // Statement coverage: defaults the application locale to English
  it('defaults the application locale to English', () => {
    const config = TmdbRuntimeConfigSchema.parse({
      apiReadAccessToken: 'synthetic-token',
      baseUrl: 'https://api.themoviedb.org/3',
    });

    expect(config.defaultLocale).toBe('en');
  });
});
