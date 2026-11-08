import { vi } from 'vitest';
import { createError, defineEventHandler } from 'h3';

/** Create isolated test doubles for Nuxt handler boundaries; install explicitly per test. */
export function createNuxtHandlerMocks() {
  const fetchMock = vi.fn();
  const runtimeConfigMock = vi.fn().mockReturnValue({
    tmdb: {
      apiReadAccessToken: 'synthetic-test-token',
      baseUrl: 'https://api.themoviedb.org/3',
    },
  });
  const queryMock = vi.fn().mockReturnValue({});
  const headerMock = vi.fn();

  function install() {
    vi.stubGlobal('defineEventHandler', defineEventHandler);
    vi.stubGlobal('createError', createError);
    vi.stubGlobal('setResponseHeader', headerMock);
    vi.stubGlobal('getQuery', queryMock);
    vi.stubGlobal('useRuntimeConfig', runtimeConfigMock);
    vi.stubGlobal('$fetch', fetchMock);
  }

  return { fetchMock, runtimeConfigMock, queryMock, headerMock, install };
}
