import { describe, expect, it, vi } from 'vitest';
import { createTmdbHttpClient } from '../../server/services/tmdb/http';
import { createTrendingService } from '../../server/services/tmdb/trending';
import { mapTrendingResponse } from '../../server/services/tmdb/mappers';
import { TmdbError, toTmdbHttpError } from '../../server/services/tmdb/errors';
import { TmdbTrendingResponseSchema } from '../../src/lib/schemas/tmdb-trending';
import { weeklyTrendingFixture } from '../fixtures/tmdb/trending';

const config = {
  apiReadAccessToken: 'synthetic-test-token',
  baseUrl: 'https://api.themoviedb.org/3',
};

describe('TMDb layer boundaries', () => {
  it('leaves schema validation to the service rather than HTTP transport', async () => {
    const malformed = { arbitrary: true };
    const request = vi.fn().mockResolvedValue(malformed);
    await expect(createTmdbHttpClient(config, request).getWeeklyTrending()).resolves.toBe(
      malformed,
    );
  });

  it('maps validated movie and TV fields without mutating input', () => {
    const raw = TmdbTrendingResponseSchema.parse(weeklyTrendingFixture);
    const before = structuredClone(raw);
    const result = mapTrendingResponse(raw);
    expect(raw).toEqual(before);
    expect(result.results[0]).toMatchObject({ mediaType: 'movie', title: 'Synthetic Film' });
    expect(result.results[1]).toMatchObject({ mediaType: 'tv', name: 'Synthetic Series' });
    expect(result.results[0]).not.toHaveProperty('media_type');
    expect(result.totalPages).toBe(raw.total_pages);
  });

  it('orchestrates validation and mapping with an injected client', async () => {
    const http = { getWeeklyTrending: vi.fn().mockResolvedValue(weeklyTrendingFixture) };
    const service = createTrendingService(http);
    expect((await service.getWeeklyTrending()).results).toHaveLength(2);
    expect(http.getWeeklyTrending).toHaveBeenCalledTimes(1);
  });

  it('rejects malformed data instead of representing it as no results', async () => {
    const http = { getWeeklyTrending: vi.fn().mockResolvedValue({ results: [] }) };
    await expect(createTrendingService(http).getWeeklyTrending()).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
    });
  });

  it('preserves transport errors rather than reclassifying them as schema failures', async () => {
    const failure = new TmdbError('UPSTREAM_FAILED');
    const http = { getWeeklyTrending: vi.fn().mockRejectedValue(failure) };
    await expect(createTrendingService(http).getWeeklyTrending()).rejects.toBe(failure);
  });

  it.each(['MISSING_TOKEN', 'INVALID_BASE_URL'] as const)(
    'maps configuration error %s to 503',
    (code) => {
      expect(toTmdbHttpError(new TmdbError(code))).toEqual({
        statusCode: 503,
        statusMessage: 'TMDb configuration unavailable',
      });
    },
  );

  it.each(['UPSTREAM_FAILED', 'INVALID_RESPONSE'] as const)(
    'maps service error %s to a sanitized 502',
    (code) => {
      expect(toTmdbHttpError(new TmdbError(code))).toEqual({
        statusCode: 502,
        statusMessage: 'TMDb request or response invalid',
      });
    },
  );

  it('does not expose arbitrary error messages', () => {
    expect(JSON.stringify(toTmdbHttpError(new Error('synthetic-secret')))).not.toContain(
      'synthetic-secret',
    );
  });
});
