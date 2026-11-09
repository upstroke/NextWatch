import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { H3Event } from 'h3';
import { createNuxtHandlerMocks } from '@test-mocks/nuxt-handler';
import {
  searchMovieCandidateFixture,
  searchTvCandidateFixture,
} from '@tests/fixtures/tmdb/search-candidates';
import {
  emptySearchMultiRawFixture,
  searchMultiRawFixture,
} from '@tests/fixtures/tmdb/search-multi.raw';

let mocks: ReturnType<typeof createNuxtHandlerMocks>;
let handler: (event: H3Event) => Promise<unknown>;

beforeEach(async () => {
  mocks = createNuxtHandlerMocks();
  mocks.install();
  handler = (
    await import('@server/api/tmdb/search/multi.get')
  ).default as (event: H3Event) => Promise<unknown>;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function createEvent() {
  return { node: { res: { statusCode: 200 } } } as unknown as H3Event;
}

describe('Multi Search route handler', () => {
  // Statement coverage: validates the query and returns normalized multi candidates
  it('returns normalized multi candidates', async () => {
    mocks.queryMock.mockReturnValue({ query: 'synthetic' });
    mocks.fetchMock.mockResolvedValue(searchMultiRawFixture);

    const event = createEvent();
    const result = await handler(event);

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({
      mediaType: 'movie',
      ...searchMovieCandidateFixture,
    });
    expect(result[1]).toEqual({
      mediaType: 'tv',
      ...searchTvCandidateFixture,
    });
    expect(result[2]).toEqual({
      mediaType: 'person',
      id: 301,
      name: 'Synthetic Person',
      profilePath: '/person.jpg',
      knownFor: [
        {
          id: 101,
          mediaType: 'movie',
          title: 'Synthetic Movie',
        },
      ],
    });
    expect(event.node.res.statusCode).toBe(200);
    expect(mocks.headerMock).toHaveBeenCalledExactlyOnceWith(
      event,
      'Cache-Control',
      'no-store',
    );
    expect(mocks.fetchMock).toHaveBeenCalledExactlyOnceWith(
      'https://api.themoviedb.org/3/search/multi',
      expect.objectContaining({ query: { query: 'synthetic' } }),
    );
  });

  // Statement coverage: preserves a valid empty result set
  it('preserves a valid empty result set', async () => {
    mocks.queryMock.mockReturnValue({ query: 'unknown' });
    mocks.fetchMock.mockResolvedValue(emptySearchMultiRawFixture);

    const event = createEvent();
    const result = await handler(event);

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

    const event = createEvent();
    const result = await handler(event);

    expect(mocks.headerMock).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      statusCode: 400,
      statusMessage: 'Invalid search query',
    });
    expect(event.node.res.statusCode).toBe(400);
    expect(mocks.runtimeConfigMock).not.toHaveBeenCalled();
    expect(mocks.fetchMock).not.toHaveBeenCalled();
  });

  // Branch coverage: translates upstream rejection through the real error factory
  it('rejects upstream failures with a controlled 502', async () => {
    mocks.queryMock.mockReturnValue({ query: 'synthetic' });
    mocks.fetchMock.mockRejectedValue(new Error('synthetic-upstream-secret'));

    const event = createEvent();

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 502,
      statusMessage: 'TMDb request or response invalid',
    });
    expect(event.node.res.statusCode).toBe(502);
    expect(mocks.fetchMock).toHaveBeenCalledTimes(1);
  });

  // Branch coverage: translates response validation failures to a controlled 502
  it('rejects malformed upstream responses with a controlled 502', async () => {
    mocks.queryMock.mockReturnValue({ query: 'synthetic' });
    mocks.fetchMock.mockResolvedValue({ results: [{ id: 'invalid' }] });

    const event = createEvent();

    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 502,
      statusMessage: 'TMDb request or response invalid',
    });
    expect(event.node.res.statusCode).toBe(502);
    expect(mocks.fetchMock).toHaveBeenCalledTimes(1);
  });
});
