import { describe, expect, it, vi } from 'vitest';
import { createTmdbHttpClient } from '@server/services/tmdb/http';
import { createTrendingService } from '@server/services/tmdb/trending';
import { mapTrendingResponse } from '@server/services/tmdb/mappers';
import { createTmdbError, toTmdbHttpError } from '@server/services/tmdb/errors';
import { TmdbTrendingResponseSchema } from '@lib/schemas/tmdb-trending';
import { weeklyTrendingFixture } from '@tests/fixtures/tmdb/trending.raw';

const config = {
  apiReadAccessToken: 'synthetic-test-token',
  baseUrl: 'https://api.themoviedb.org/3',
};

describe('TMDb layer boundaries', () => {
  // Branch coverage: leaves schema validation to the service rather than HTTP transport
  it('leaves schema validation to the service rather than HTTP transport', async () => {
    const malformed = { arbitrary: true };
    const request = vi.fn().mockResolvedValue(malformed);
    await expect(
      createTmdbHttpClient(config, request).getWeeklyTrending('en-US'),
    ).resolves.toBe(malformed);
  });

  // Statement coverage: passes each supported content language to the transport
  it.each(['en-US', 'de-DE'] as const)(
    'passes %s to the weekly trending transport',
    async (language) => {
      const request = vi.fn().mockResolvedValue({ arbitrary: true });
      await createTmdbHttpClient(config, request).getWeeklyTrending(language);

      expect(request).toHaveBeenCalledWith(
        'https://api.themoviedb.org/3/trending/all/week',
        expect.objectContaining({
          query: { language },
        }),
      );
    },
  );

  // Statement coverage: maps validated movie and TV fields without mutating input
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

  // Statement coverage: orchestrates validation and mapping with an injected client
  it.each(['en-US', 'de-DE'] as const)(
    'orchestrates validation and mapping for %s',
    async (language) => {
      const http = {
        getWeeklyTrending: vi.fn().mockResolvedValue(weeklyTrendingFixture),
      };
      const service = createTrendingService(http);

      expect((await service.getWeeklyTrending(language)).results).toHaveLength(2);
      expect(http.getWeeklyTrending).toHaveBeenCalledWith(language);
      expect(http.getWeeklyTrending).toHaveBeenCalledTimes(1);
    },
  );

  // Branch coverage: rejects malformed data instead of representing it as no results
  it('rejects malformed data instead of representing it as no results', async () => {
    const http = { getWeeklyTrending: vi.fn().mockResolvedValue({ results: [] }) };
    await expect(
      createTrendingService(http).getWeeklyTrending('en-US'),
    ).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
    });
  });

  // Branch coverage: preserves transport errors rather than reclassifying them as schema failures
  it('preserves transport errors rather than reclassifying them as schema failures', async () => {
    const failure = createTmdbError('UPSTREAM_FAILED');
    const http = { getWeeklyTrending: vi.fn().mockRejectedValue(failure) };
    await expect(
      createTrendingService(http).getWeeklyTrending('de-DE'),
    ).rejects.toBe(failure);
  });

  // Branch coverage: maps configuration error %s to 503
  it.each(['MISSING_TOKEN', 'INVALID_BASE_URL'] as const)(
    'maps configuration error %s to 503',
    (code) => {
      expect(toTmdbHttpError(createTmdbError(code))).toEqual({
        statusCode: 503,
        statusMessage: 'TMDb configuration unavailable',
      });
    },
  );

  // Statement coverage: maps service error %s to a sanitized 502
  it.each(['UPSTREAM_FAILED', 'INVALID_RESPONSE'] as const)(
    'maps service error %s to a sanitized 502',
    (code) => {
      expect(toTmdbHttpError(createTmdbError(code))).toEqual({
        statusCode: 502,
        statusMessage: 'TMDb request or response invalid',
      });
    },
  );

  // Branch coverage: does not expose arbitrary error messages
  it('does not expose arbitrary error messages', () => {
    expect(JSON.stringify(toTmdbHttpError(new Error('synthetic-secret')))).not.toContain(
      'synthetic-secret',
    );
  });
});
