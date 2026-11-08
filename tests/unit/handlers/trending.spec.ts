import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { H3Event } from 'h3';
import { createNuxtHandlerMocks } from '@test-mocks/nuxt-handler';
import { weeklyTrendingFixture } from '@tests/fixtures/tmdb/trending.raw';

let mocks: ReturnType<typeof createNuxtHandlerMocks>;
let handler: typeof import('@server/api/tmdb/trending.get').default;

beforeEach(async () => {
  mocks = createNuxtHandlerMocks();
  mocks.install();
  handler = (await import('@server/api/tmdb/trending.get')).default;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Trending route handler', () => {
  // Statement coverage: executes the handler, transport adapter, validation and mapping
  it('returns normalized trends and requests no-store caching', async () => {
    const event = {} as H3Event;
    mocks.fetchMock.mockResolvedValue(weeklyTrendingFixture);

    const result = await handler(event);

    expect(result).toEqual({
      page: 1,
      totalPages: 1,
      totalResults: 2,
      results: [
        {
          id: 101,
          mediaType: 'movie',
          title: 'Synthetic Film',
          overview: 'A fictional fixture for tests.',
          posterPath: null,
          backdropPath: '/synthetic-film.jpg',
          voteAverage: 7.5,
          releaseDate: '2026-01-01',
        },
        {
          id: 202,
          mediaType: 'tv',
          name: 'Synthetic Series',
          overview: 'A fictional series fixture.',
          posterPath: null,
          backdropPath: null,
          voteAverage: 8,
          firstAirDate: '2026-02-01',
        },
      ],
    });
    expect(mocks.runtimeConfigMock).toHaveBeenCalledExactlyOnceWith(event);
    expect(mocks.headerMock).toHaveBeenCalledExactlyOnceWith(event, 'Cache-Control', 'no-store');
    expect(mocks.fetchMock).toHaveBeenCalledExactlyOnceWith(
      'https://api.themoviedb.org/3/trending/all/week',
      {
        headers: {
          Authorization: 'Bearer synthetic-test-token',
          Accept: 'application/json',
        },
        query: { language: 'de-DE' },
        timeout: 10000,
        retry: false,
        redirect: 'error',
      },
    );
  });

  // Branch coverage: translates transport configuration failures without making a request
  it.each([
    { apiReadAccessToken: ' ', baseUrl: 'https://api.themoviedb.org/3' },
    { apiReadAccessToken: 'synthetic-test-token', baseUrl: 'https://example.com/3' },
  ])('rejects invalid transport configuration with a controlled 503: %o', async (tmdb) => {
    const event = {} as H3Event;
    mocks.runtimeConfigMock.mockReturnValue({ tmdb });

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 503,
      statusMessage: 'TMDb configuration unavailable',
    });
    expect(mocks.fetchMock).not.toHaveBeenCalled();
    expect(mocks.headerMock).toHaveBeenCalledExactlyOnceWith(event, 'Cache-Control', 'no-store');
  });

  // Branch coverage: translates rejected upstream requests through the real error factory
  it('translates upstream failures to a sanitized H3 502 error', async () => {
    const event = {} as H3Event;
    mocks.fetchMock.mockRejectedValue(new Error('synthetic-upstream-secret'));

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 502,
      statusMessage: 'TMDb request or response invalid',
    });
    expect(mocks.fetchMock).toHaveBeenCalledTimes(1);
    expect(mocks.headerMock).toHaveBeenCalledExactlyOnceWith(event, 'Cache-Control', 'no-store');
  });

  // Branch coverage: translates real response-schema failures to a controlled H3 error
  it('rejects malformed upstream responses with a controlled 502', async () => {
    const event = {} as H3Event;
    mocks.fetchMock.mockResolvedValue({ results: [{ id: 'invalid' }] });

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 502,
      statusMessage: 'TMDb request or response invalid',
    });
    expect(mocks.fetchMock).toHaveBeenCalledTimes(1);
    expect(mocks.headerMock).toHaveBeenCalledExactlyOnceWith(event, 'Cache-Control', 'no-store');
  });
});
