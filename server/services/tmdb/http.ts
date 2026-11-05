import { TmdbError } from './errors';

export type TmdbRequest = (
  url: string,
  options: {
    headers: { Authorization: string; Accept: string };
    query: Record<string, string>;
    timeout: number;
    retry: false;
  }
) => Promise<unknown>;

export type TmdbConfig = { apiReadAccessToken: string; baseUrl: string };

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_TIMEOUT_MS = 10000;

function assertConfiguration(config: TmdbConfig) {
  const token = config.apiReadAccessToken.trim();
  if (!token) throw new TmdbError('MISSING_TOKEN');
  if (config.baseUrl.replace(/\/$/, '') !== TMDB_BASE_URL) {
    throw new TmdbError('INVALID_BASE_URL');
  }
}

function assertDiscoverPath(path: string) {
  if (!path.startsWith('/') || /[?#\s\u0000-\u001f]/.test(path)) {
    throw new TmdbError('INVALID_BASE_URL');
  }
}

/** Request adapter must reject redirects; credentials must never follow them. */
export function createTmdbHttpClient(config: TmdbConfig, request: TmdbRequest) {
  return {
    async get(path: string, query: Record<string, string> = {}): Promise<unknown> {
      assertConfiguration(config);
      assertDiscoverPath(path);

      try {
        return await request(`${TMDB_BASE_URL}${path}`, {
          headers: {
            Authorization: `Bearer ${config.apiReadAccessToken.trim()}`,
            Accept: 'application/json'
          },
          query,
          timeout: TMDB_TIMEOUT_MS,
          retry: false
        });
      } catch {
        throw new TmdbError('UPSTREAM_FAILED');
      }
    },

    async getWeeklyTrending(): Promise<unknown> {
      return this.get('/trending/all/week', { language: 'de-DE' });
    }
  };
}

export type TmdbHttpClient = ReturnType<typeof createTmdbHttpClient>;
