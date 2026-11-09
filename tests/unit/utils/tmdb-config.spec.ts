import { afterEach, describe, expect, it, vi } from 'vitest';
import type { H3Event } from 'h3';
import { ZodError } from 'zod';
import { getTmdbConfig } from '@server/utils/tmdb';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('TMDb runtime config adapter', () => {
  // Statement coverage: reads and validates TMDb configuration using the supplied event
  it('returns validated TMDb configuration and forwards the event', () => {
    const event = {} as H3Event;
    const tmdb = {
      apiReadAccessToken: 'synthetic-test-token',
      baseUrl: 'https://api.themoviedb.org/3',
      defaultLocale: 'en',
    };
    const useRuntimeConfig = vi.fn().mockReturnValue({ tmdb });
    vi.stubGlobal('useRuntimeConfig', useRuntimeConfig);

    const result = getTmdbConfig(event);

    expect(result).toEqual(tmdb);
    expect(useRuntimeConfig).toHaveBeenCalledExactlyOnceWith(event);
  });

  // Statement coverage: propagates real schema validation errors for invalid external config
  it.each([
    { label: 'missing TMDb configuration', config: {} },
    { label: 'null TMDb configuration', config: { tmdb: null } },
    { label: 'missing TMDb fields', config: { tmdb: {} } },
    {
      label: 'a non-string token',
      config: {
        tmdb: {
          apiReadAccessToken: 123,
          baseUrl: 'https://api.themoviedb.org/3',
          defaultLocale: 'en',
        },
      },
    },
    {
      label: 'a non-string base URL',
      config: {
        tmdb: {
          apiReadAccessToken: 'synthetic-test-token',
          baseUrl: 123,
          defaultLocale: 'en',
        },
      },
    },
  ])('rejects $label', ({ config }) => {
    const event = {} as H3Event;
    const useRuntimeConfig = vi.fn().mockReturnValue(config);
    vi.stubGlobal('useRuntimeConfig', useRuntimeConfig);

    expect(() => getTmdbConfig(event)).toThrow(ZodError);
    expect(useRuntimeConfig).toHaveBeenCalledExactlyOnceWith(event);
  });
});
