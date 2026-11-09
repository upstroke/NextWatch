import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { H3Event } from 'h3';
import { createNuxtHandlerMocks } from '@test-mocks/nuxt-handler';
import {
  searchSecondTvCandidateFixture,
  searchTvCandidateFixture,
} from '@tests/fixtures/tmdb/search-candidates';
import {
  emptySearchTvRawFixture,
  searchTvRawFixture,
} from '@tests/fixtures/tmdb/search-tv.raw';

let mocks: ReturnType<typeof createNuxtHandlerMocks>;
let handler: (event: H3Event) => Promise<unknown>;

beforeEach(async () => {
  mocks = createNuxtHandlerMocks();
  mocks.install();
  handler = (
    await import('@server/api/tmdb/search/tv.get')
  ).default as (event: H3Event) => Promise<unknown>;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function invokeHandler() {
  const event = { node: { res: { statusCode: 200 } } } as unknown as H3Event;
  const result = await handler(event);

  expect(mocks.queryMock).toHaveBeenCalledExactlyOnceWith(event);
  expect(mocks.headerMock).toHaveBeenCalledExactlyOnceWith(
    event,
    'Cache-Control',
    'no-store',
  );

  return { event, result };
}

describe('TV Search route handler', () => {
  // Statement coverage: validates the query and returns normalized tv candidates
  it('returns normalized tv candidates', async () => {
    mocks.queryMock.mockReturnValue({ query: 'series' });
    mocks.fetchMock.mockResolvedValue(searchTvRawFixture);

    const { event, result } = await invokeHandler();

    expect(result).toEqual([
      searchTvCandidateFixture,
      searchSecondTvCandidateFixture,
    ]);
    expect(event.node.res.statusCode).toBe(200);
    expect(mocks.fetchMock).toHaveBeenCalledExactlyOnceWith(
      'https://api.themoviedb.org/3/search/tv',
      expect.objectContaining({ query: { query: 'series' } }),
    );
  });

  // Statement coverage: preserves a valid empty result set
  it('preserves a valid empty result set', async () => {
    mocks.queryMock.mockReturnValue({ query: 'unknown' });
    mocks.fetchMock.mockResolvedValue(emptySearchTvRawFixture);

    const { event, result } = await invokeHandler();

    expect(result).toEqual([]);
    expect(event.node.res.statusCode).toBe(200);
  });

  // Branch coverage: returns a controlled 400 before configuration or transport
  it.each([
    {},
    { query: '' },
    { query: '   ' },
    { query: 123 },
  ])('returns a controlled 400 for an invalid query: %o', async (query) => {
    mocks.queryMock.mockReturnValue(query);

    const { event, result } = await invokeHandler();

    expect(result).toEqual({
      statusCode: 400,
      statusMessage: 'Invalid search query',
    });
    expect(event.node.res.statusCode).toBe(400);
    expect(mocks.runtimeConfigMock).not.toHaveBeenCalled();
    expect(mocks.fetchMock).not.toHaveBeenCalled();
  });

  // Branch coverage: translates upstream rejection through the real error factory
  it('returns a sanitized 502 when the upstream request fails', async () => {
    mocks.queryMock.mockReturnValue({ query: 'series' });
    mocks.fetchMock.mockRejectedValue(new Error('synthetic-upstream-secret'));

    const { event, result } = await invokeHandler();

    expect(result).toEqual({
      statusCode: 502,
      statusMessage: 'TMDb request or response invalid',
    });
    expect(event.node.res.statusCode).toBe(502);
    expect(mocks.fetchMock).toHaveBeenCalledTimes(1);
  });

  // Branch coverage: translates response validation failures to a controlled 502
  it('returns a controlled 502 for malformed upstream data', async () => {
    mocks.queryMock.mockReturnValue({ query: 'series' });
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
