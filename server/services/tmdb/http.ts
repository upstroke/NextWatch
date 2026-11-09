import type { TmdbRuntimeConfig } from '@lib/schemas/runtime-config';
import type { TmdbContentLanguage } from '@lib/schemas/locale';
import { createTmdbError } from './errors';

export type TmdbRequest = (
  url: string,
  options: {
    headers: { Authorization: string; Accept: string };
    query: Record<string, string>;
    timeout: number;
    retry: false;
  },
) => Promise<unknown>;

export type TmdbConfig = TmdbRuntimeConfig;

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_TIMEOUT_MS = 10000;

function assertConfiguration(config: TmdbConfig) {
  const token = config.apiReadAccessToken.trim();
  if (!token) throw createTmdbError('MISSING_TOKEN');
  if (config.baseUrl.replace(/\/$/, '') !== TMDB_BASE_URL) {
    throw createTmdbError('INVALID_BASE_URL');
  }
}

function assertDiscoverPath(path: string) {
  const hasControlCharacter = [...path].some((character) => {
    const code = character.charCodeAt(0);
    return code <= 0x1f || code === 0x7f;
  });

  if (
    !path.startsWith('/') ||
    path.includes('?') ||
    path.includes('#') ||
    /\s/.test(path) ||
    hasControlCharacter
  ) {
    throw createTmdbError('INVALID_BASE_URL');
  }
}

/** Request adapter must reject redirects; credentials must never follow them. */
export function createTmdbHttpClient(config: TmdbConfig, request: TmdbRequest) {
  return {
    /**
     * Performs an authenticated GET request against the configured TMDb API.
     *
     * Validates the runtime configuration and request path before dispatching
     * the request. Transport failures are classified as `UPSTREAM_FAILED`.
     *
     * @param path - The TMDb API path, beginning with a slash.
     * @param query - Optional query parameters to append to the request.
     * @returns The unvalidated raw response body.
     */
    async get(path: string, query: Record<string, string> = {}): Promise<unknown> {
      assertConfiguration(config);
      assertDiscoverPath(path);

      try {
        return await request(`${TMDB_BASE_URL}${path}`, {
          headers: {
            Authorization: `Bearer ${config.apiReadAccessToken.trim()}`,
            Accept: 'application/json',
          },
          query,
          timeout: TMDB_TIMEOUT_MS,
          retry: false,
        });
      } catch {
        throw createTmdbError('UPSTREAM_FAILED');
      }
    },

    /**
     * Retrieves the weekly trending media from TMDb in the requested content language.
     *
     * @param language - The validated TMDb content language.
     * @returns The unvalidated raw trending response body.
     */
    async getWeeklyTrending(language: TmdbContentLanguage): Promise<unknown> {
      return this.get('/trending/all/week', { language });
    },
  };
}

export type TmdbHttpClient = ReturnType<typeof createTmdbHttpClient>;
