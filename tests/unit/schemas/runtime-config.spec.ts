import { describe, expect, it } from 'vitest';
import { TmdbRuntimeConfigSchema } from '@lib/schemas/runtime-config';

describe('TMDb runtime config schema', () => {
  // Statement coverage: accepts a complete runtime configuration
  it('accepts a complete runtime configuration', () => {
    const config = TmdbRuntimeConfigSchema.parse({
      apiReadAccessToken: 'synthetic-token',
      baseUrl: 'https://api.themoviedb.org/3',
    });

    expect(config).toEqual({
      apiReadAccessToken: 'synthetic-token',
      baseUrl: 'https://api.themoviedb.org/3',
    });
  });

  // Branch coverage: rejects a missing access token
  it('rejects a missing access token', () => {
    expect(() =>
      TmdbRuntimeConfigSchema.parse({
        baseUrl: 'https://api.themoviedb.org/3',
      }),
    ).toThrow();
  });

  // Branch coverage: rejects a missing base URL
  it('rejects a missing base URL', () => {
    expect(() =>
      TmdbRuntimeConfigSchema.parse({
        apiReadAccessToken: 'synthetic-token',
      }),
    ).toThrow();
  });
});
