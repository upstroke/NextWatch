import { normalizeTrendingResponse } from '../../src/lib/schemas/tmdb-trending';

export type TmdbRequest = (
  url: string,
  options: {
    headers: { Authorization: string; Accept: string };
    query: { language: string };
    timeout: number;
    retry: false;
  }
) => Promise<unknown>;

export class TmdbSpikeError extends Error {
  constructor(
    public readonly code: 'MISSING_TOKEN' | 'INVALID_BASE_URL' | 'UPSTREAM_FAILED' | 'INVALID_RESPONSE'
  ) {
    super(code);
    this.name = 'TmdbSpikeError';
  }
}

export async function fetchWeeklyTrending(
  config: { apiReadAccessToken: string; baseUrl: string },
  request: TmdbRequest
) {
  const token = config.apiReadAccessToken.trim();
  if (!token) {
    throw new TmdbSpikeError('MISSING_TOKEN');
  }

  // Do not send the credential to arbitrary hosts or redirect targets.
  if (config.baseUrl.replace(/\/$/, '') !== 'https://api.themoviedb.org/3') {
    throw new TmdbSpikeError('INVALID_BASE_URL');
  }

  let raw: unknown;
  try {
    raw = await request('https://api.themoviedb.org/3/trending/all/week', {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      query: { language: 'de-DE' },
      timeout: 10000,
      retry: false
    });
  } catch {
    // Never propagate upstream errors that may contain request credentials.
    throw new TmdbSpikeError('UPSTREAM_FAILED');
  }

  try {
    return normalizeTrendingResponse(raw);
  } catch {
    throw new TmdbSpikeError('INVALID_RESPONSE');
  }
}
