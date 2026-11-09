import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { H3Event } from 'h3';
import { createNuxtHandlerMocks } from '@test-mocks/nuxt-handler';
import {
  searchPersonCandidateFixture,
  searchSecondPersonCandidateFixture,
} from '@tests/fixtures/tmdb/search-candidates';
import {
  emptySearchPersonRawFixture,
  searchPersonRawFixture,
} from '@tests/fixtures/tmdb/search-person.raw';

let mocks: ReturnType<typeof createNuxtHandlerMocks>;
let handler: (event: H3Event) => Promise<unknown>;

beforeEach(async () => {
  mocks = createNuxtHandlerMocks();
  mocks.install();
  handler = (
    await import('@server/api/tmdb/search/person.get')
  ).default as (event: H3Event) => Promise<unknown>;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function createEvent() {
  return { node: { res: { statusCode: 200 } } } as unknown as H3Event;
}

describe('Person Search route handler', () => {
  // Statement coverage: validates the query and returns normalized person candidates
  it('returns normalized person candidates', async () => {
    mocks.queryMock.mockReturnValue({ query: 'person' });
    mocks.fetchMock.mockResolvedValue(searchPersonRawFixture);

    const event = createEvent();
    const result = await handler(event);

    expect(result).toEqual([
      searchPersonCandidateFixture,
      searchSecondPersonCandidateFixture,
    ]);
    expect(event.node.res.statusCode).toBe(200);
    expect(mocks.headerMock).toHaveBeenCalledExactlyOnceWith(
      event,
      'Cache-Control',
      'no-store',
    );
    expect(mocks.fetchMock).toHaveBeenCalledExactlyOnceWith(
      'https://api.themoviedb.org/3/search/person',
      expect.objectContaining({ query: { query: 'person' } }),
    );
  });

  // Statement coverage: preserves a valid empty result set
  it('preserves a valid empty result set', async () => {
    mocks.queryMock.mockReturnValue({ query: 'unknown' });
    mocks.fetchMock.mockResolvedValue(emptySearchPersonRawFixture);

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
    mocks.queryMock.mockReturnValue({ query: 'person' });
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
    mocks.queryMock.mockReturnValue({ query: 'person' });
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
