import { describe, expect, it, vi } from 'vitest';
import { createWatchProviderService } from '@server/services/tmdb/watch-providers';
import { createTmdbError } from '@server/services/tmdb/errors';
import {
  movieWatchProvidersRawFixture as movieRaw,
  emptyMovieWatchProvidersRawFixture as emptyMovieRaw,
} from '@tests/fixtures/tmdb/movie-watch-providers.raw';
import {
  tvWatchProvidersRawFixture as tvRaw,
  emptyTvWatchProvidersRawFixture as emptyTvRaw,
} from '@tests/fixtures/tmdb/tv-watch-providers.raw';

describe('Watch provider service', () => {
  // Statement coverage: maps Movie provider categories for the requested region
  it('maps Movie provider categories for the requested region', async () => {
    const http = { get: vi.fn().mockResolvedValue(movieRaw), getWeeklyTrending: vi.fn() };
    const result = await createWatchProviderService(http).getMovieWatchProviders(101, 'DE');

    expect(http.get).toHaveBeenCalledWith('/movie/101/watch/providers', { region: 'DE' });
    expect(result).toEqual({
      mediaId: 101,
      region: 'DE',
      stream: [
        {
          id: 8,
          name: 'Synthetic Streaming',
          logoPath: '/streaming.jpg',
          displayPriority: 1,
        },
      ],
      rent: [
        {
          id: 2,
          name: 'Synthetic Rental',
          logoPath: '/rental.jpg',
          displayPriority: 2,
        },
      ],
      buy: [
        {
          id: 3,
          name: 'Synthetic Purchase',
          logoPath: '/purchase.jpg',
          displayPriority: 3,
        },
      ],
    });
  });

  // Statement coverage: maps TV provider categories for the requested region
  it('maps TV provider categories for the requested region', async () => {
    const http = { get: vi.fn().mockResolvedValue(tvRaw), getWeeklyTrending: vi.fn() };
    const result = await createWatchProviderService(http).getTvWatchProviders(201, 'DE');

    expect(http.get).toHaveBeenCalledWith('/tv/201/watch/providers', { region: 'DE' });
    expect(result).toEqual({
      mediaId: 201,
      region: 'DE',
      stream: [
        {
          id: 8,
          name: 'Synthetic Streaming',
          logoPath: '/streaming.jpg',
          displayPriority: 1,
        },
      ],
      rent: [],
      buy: [],
    });
  });

  // Branch coverage: returns empty availability when the region is absent
  it('returns empty availability when the region is absent', async () => {
    const http = { get: vi.fn().mockResolvedValue(emptyMovieRaw), getWeeklyTrending: vi.fn() };
    const result = await createWatchProviderService(http).getMovieWatchProviders(101, 'DE');

    expect(result).toEqual({
      mediaId: 101,
      region: 'DE',
      stream: [],
      rent: [],
      buy: [],
    });
  });

  // Branch coverage: returns empty TV availability when the region is absent
  it('returns empty TV availability when the region is absent', async () => {
    const http = { get: vi.fn().mockResolvedValue(emptyTvRaw), getWeeklyTrending: vi.fn() };
    const result = await createWatchProviderService(http).getTvWatchProviders(201, 'DE');

    expect(result).toEqual({
      mediaId: 201,
      region: 'DE',
      stream: [],
      rent: [],
      buy: [],
    });
  });

  // Branch coverage: rejects malformed Movie provider data as INVALID_RESPONSE
  it('rejects malformed Movie provider data as INVALID_RESPONSE', async () => {
    const http = { get: vi.fn().mockResolvedValue({}), getWeeklyTrending: vi.fn() };

    await expect(
      createWatchProviderService(http).getMovieWatchProviders(101, 'DE'),
    ).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });

  // Branch coverage: rejects malformed TV provider data as INVALID_RESPONSE
  it('rejects malformed TV provider data as INVALID_RESPONSE', async () => {
    const http = { get: vi.fn().mockResolvedValue({}), getWeeklyTrending: vi.fn() };

    await expect(
      createWatchProviderService(http).getTvWatchProviders(201, 'DE'),
    ).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });

  // Branch coverage: preserves transport errors instead of reclassifying them
  it('preserves transport errors instead of reclassifying them', async () => {
    const failure = createTmdbError('UPSTREAM_FAILED');
    const http = { get: vi.fn().mockRejectedValue(failure), getWeeklyTrending: vi.fn() };

    await expect(createWatchProviderService(http).getMovieWatchProviders(101, 'DE')).rejects.toBe(
      failure,
    );
    await expect(createWatchProviderService(http).getTvWatchProviders(201, 'DE')).rejects.toBe(
      failure,
    );
  });
});
