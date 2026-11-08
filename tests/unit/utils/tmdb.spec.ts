import { describe, expect, it, vi } from 'vitest';
import { fetchWeeklyTrending, createTmdbSpikeError } from '@server/utils/tmdb';
import { weeklyTrendingFixture } from '@tests/fixtures/tmdb/trending.raw';

const config = {
  apiReadAccessToken: 'synthetic-test-token',
  baseUrl: 'https://api.themoviedb.org/3',
};

describe('TMDb trending connection spike', () => {
  // Statement coverage: requests weekly trends with server-side authorization and bounded execution
  it('requests weekly trends with server-side authorization and bounded execution', async () => {
    const request = vi.fn().mockResolvedValue(weeklyTrendingFixture);
    const result = await fetchWeeklyTrending(config, request);

    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith('https://api.themoviedb.org/3/trending/all/week', {
      headers: {
        Authorization: 'Bearer synthetic-test-token',
        Accept: 'application/json',
      },
      query: { language: 'de-DE' },
      timeout: 10000,
      retry: false,
    });
    expect(result.totalResults).toBe(2);
    expect(result.totalPages).toBe(1);
    expect(result.results[0]).toMatchObject({
      mediaType: 'movie',
      title: 'Synthetic Film',
      backdropPath: '/synthetic-film.jpg',
    });
    expect(result.results[1]).toMatchObject({
      mediaType: 'tv',
      name: 'Synthetic Series',
      firstAirDate: '2026-02-01',
    });
    expect(JSON.stringify(result)).not.toContain(config.apiReadAccessToken);
  });

  // Branch coverage: rejects a missing token without contacting TMDb
  it('rejects a missing token without contacting TMDb', async () => {
    const request = vi.fn();
    await expect(
      fetchWeeklyTrending({ ...config, apiReadAccessToken: ' ' }, request),
    ).rejects.toMatchObject({ code: 'MISSING_TOKEN' });
    expect(request).not.toHaveBeenCalled();
  });

  // Branch coverage: rejects an unexpected host before sending credentials
  it('rejects an unexpected host before sending credentials', async () => {
    const request = vi.fn();
    await expect(
      fetchWeeklyTrending({ ...config, baseUrl: 'https://example.com/3' }, request),
    ).rejects.toMatchObject({ code: 'INVALID_BASE_URL' });
    expect(request).not.toHaveBeenCalled();
  });

  // Branch coverage: sanitizes upstream errors without retrying
  it('sanitizes upstream errors without retrying', async () => {
    const request = vi.fn().mockRejectedValue(new Error(config.apiReadAccessToken));
    await expect(fetchWeeklyTrending(config, request)).rejects.toEqual(
      createTmdbSpikeError('UPSTREAM_FAILED'),
    );
    expect(request).toHaveBeenCalledTimes(1);
  });

  // Branch coverage: rejects invalid response data
  it('rejects invalid response data', async () => {
    const request = vi.fn().mockResolvedValue({ results: [{ id: 'invalid' }] });
    await expect(fetchWeeklyTrending(config, request)).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
    });
  });

  // Branch coverage: rejects unsupported media types
  it('rejects unsupported media types', async () => {
    const request = vi.fn().mockResolvedValue({
      ...weeklyTrendingFixture,
      results: [{ ...weeklyTrendingFixture.results[0], media_type: 'person' }],
    });
    await expect(fetchWeeklyTrending(config, request)).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
    });
  });

  // Branch coverage: preserves a valid empty response
  it('preserves a valid empty response', async () => {
    const request = vi.fn().mockResolvedValue({
      page: 1,
      total_pages: 0,
      total_results: 0,
      results: [],
    });
    await expect(fetchWeeklyTrending(config, request)).resolves.toEqual({
      page: 1,
      totalPages: 0,
      totalResults: 0,
      results: [],
    });
  });
});
