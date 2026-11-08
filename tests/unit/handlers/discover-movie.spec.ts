import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { H3Event } from 'h3';
import { createNuxtHandlerMocks } from '@test-mocks/nuxt-handler';

let mocks: ReturnType<typeof createNuxtHandlerMocks>;
let handler: typeof import('@server/api/tmdb/discover/movie.get').default;

beforeEach(async () => {
  mocks = createNuxtHandlerMocks();
  mocks.install();
  handler = (await import('@server/api/tmdb/discover/movie.get')).default;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function invokeHandler() {
  const event = { node: { res: { statusCode: 200 } } } as unknown as H3Event;
  const result = await handler(event);
  expect(mocks.queryMock).toHaveBeenCalledExactlyOnceWith(event);
  expect(mocks.headerMock).toHaveBeenCalledExactlyOnceWith(event, 'Cache-Control', 'no-store');
  return { event, result };
}

describe('Movie Discover route handler', () => {
  // Statement coverage: validates query input and executes real parameter mapping and normalization
  it('requests Movie Discover with validated filters and returns normalized data', async () => {
    mocks.queryMock.mockReturnValue({
      genreIds: '28,878',
      minRating: '7',
      yearFrom: '2020',
      yearTo: '2024',
      sortBy: 'vote_average.desc',
    });
    mocks.fetchMock.mockResolvedValue({
      page: 1,
      total_pages: 2,
      total_results: 25,
      results: [
        {
          id: 101,
          overview: 'Synthetic movie overview',
          poster_path: '/movie.jpg',
          backdrop_path: '/movie-backdrop.jpg',
          vote_average: 7.5,
          title: 'Synthetic Movie',
          release_date: '2024-05-01',
        },
      ],
    });

    const { event, result } = await invokeHandler();

    expect(result).toEqual({
      page: 1,
      totalPages: 2,
      totalResults: 25,
      results: [
        {
          id: 101,
          mediaType: 'movie',
          overview: 'Synthetic movie overview',
          posterPath: '/movie.jpg',
          backdropPath: '/movie-backdrop.jpg',
          voteAverage: 7.5,
          title: 'Synthetic Movie',
          releaseDate: '2024-05-01',
        },
      ],
    });
    expect(event.node.res.statusCode).toBe(200);
    expect(mocks.runtimeConfigMock).toHaveBeenCalledExactlyOnceWith(event);
    expect(mocks.fetchMock).toHaveBeenCalledExactlyOnceWith(
      'https://api.themoviedb.org/3/discover/movie',
      {
        headers: {
          Authorization: 'Bearer synthetic-test-token',
          Accept: 'application/json',
        },
        query: {
          with_genres: '28,878',
          'vote_average.gte': '7',
          'primary_release_date.gte': '2020-01-01',
          'primary_release_date.lte': '2024-12-31',
          sort_by: 'vote_average.desc',
        },
        timeout: 10000,
        retry: false,
        redirect: 'error',
      },
    );
  });

  // Statement coverage: accepts default filters and preserves valid empty results
  it('accepts an empty query and preserves a valid empty page', async () => {
    mocks.fetchMock.mockResolvedValue({
      page: 1,
      total_pages: 0,
      total_results: 0,
      results: [],
    });

    const { event, result } = await invokeHandler();

    expect(result).toEqual({ page: 1, totalPages: 0, totalResults: 0, results: [] });
    expect(event.node.res.statusCode).toBe(200);
    expect(mocks.fetchMock).toHaveBeenCalledExactlyOnceWith(
      'https://api.themoviedb.org/3/discover/movie',
      expect.objectContaining({ query: { sort_by: 'popularity.desc' } }),
    );
  });

  // Branch coverage: returns INVALID_QUERY before accessing configuration or transport
  it('returns a controlled 400 for an invalid query', async () => {
    mocks.queryMock.mockReturnValue({ minRating: 'not-a-number' });

    const { event, result } = await invokeHandler();

    expect(result).toEqual({ statusCode: 400, statusMessage: 'Invalid Discover query' });
    expect(event.node.res.statusCode).toBe(400);
    expect(mocks.runtimeConfigMock).not.toHaveBeenCalled();
    expect(mocks.fetchMock).not.toHaveBeenCalled();
  });

  // Branch coverage: rejects a reversed year range after successful query parsing
  it('returns a controlled 400 for invalid domain filters', async () => {
    mocks.queryMock.mockReturnValue({ yearFrom: '2024', yearTo: '2020' });

    const { event, result } = await invokeHandler();

    expect(result).toEqual({ statusCode: 400, statusMessage: 'Invalid Discover filters' });
    expect(event.node.res.statusCode).toBe(400);
    expect(mocks.runtimeConfigMock).not.toHaveBeenCalled();
    expect(mocks.fetchMock).not.toHaveBeenCalled();
  });

  // Branch coverage: maps transport configuration errors without sending credentials
  it.each([
    { apiReadAccessToken: ' ', baseUrl: 'https://api.themoviedb.org/3' },
    { apiReadAccessToken: 'synthetic-test-token', baseUrl: 'https://example.com/3' },
  ])('returns a controlled 503 for invalid transport configuration: %o', async (tmdb) => {
    mocks.runtimeConfigMock.mockReturnValue({ tmdb });

    const { event, result } = await invokeHandler();

    expect(result).toEqual({
      statusCode: 503,
      statusMessage: 'TMDb configuration unavailable',
    });
    expect(event.node.res.statusCode).toBe(503);
    expect(mocks.fetchMock).not.toHaveBeenCalled();
  });

  // Branch coverage: translates upstream rejection through the real error factory and HTTP adapter
  it('returns a sanitized 502 when the upstream request fails', async () => {
    mocks.fetchMock.mockRejectedValue(new Error('synthetic-upstream-secret'));

    const { event, result } = await invokeHandler();

    expect(result).toEqual({
      statusCode: 502,
      statusMessage: 'TMDb request or response invalid',
    });
    expect(event.node.res.statusCode).toBe(502);
    expect(mocks.fetchMock).toHaveBeenCalledTimes(1);
  });

  // Branch coverage: translates real response validation failures to a controlled 502
  it('returns a controlled 502 for malformed upstream data', async () => {
    mocks.fetchMock.mockResolvedValue({ results: [{ id: 'invalid' }] });

    const { event, result } = await invokeHandler();

    expect(result).toEqual({
      statusCode: 502,
      statusMessage: 'TMDb request or response invalid',
    });
    expect(event.node.res.statusCode).toBe(502);
    expect(mocks.fetchMock).toHaveBeenCalledTimes(1);
  });
});
