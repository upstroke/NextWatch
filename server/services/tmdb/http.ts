import { TmdbError } from './errors';

export type TmdbRequest = (
  url: string,
  options: {
    headers: { Authorization: string; Accept: string };
    query: { language: string };
    timeout: number;
    retry: false;
  }
) => Promise<unknown>;

export type TmdbConfig = { apiReadAccessToken: string; baseUrl: string };

/** Request adapter must reject redirects; credentials must never follow them. */
export function createTmdbHttpClient(config: TmdbConfig, request: TmdbRequest) {
  return {
    async getWeeklyTrending(): Promise<unknown> {
      const token = config.apiReadAccessToken.trim();
      if (!token) throw new TmdbError('MISSING_TOKEN');
      if (config.baseUrl.replace(/\/$/, '') !== 'https://api.themoviedb.org/3') {
        throw new TmdbError('INVALID_BASE_URL');
      }

      try {
        return await request('https://api.themoviedb.org/3/trending/all/week', {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
          query: { language: 'de-DE' },
          timeout: 10000,
          retry: false
        });
      } catch {
        throw new TmdbError('UPSTREAM_FAILED');
      }
    }
  };
}

export type TmdbHttpClient = ReturnType<typeof createTmdbHttpClient>;
