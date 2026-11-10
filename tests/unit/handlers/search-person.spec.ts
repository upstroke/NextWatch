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
  handler = (await import('@server/api/tmdb/search/person.get')).default as (
    event: H3Event,
  ) => Promise<unknown>;
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

describe('Person Search route handler', () => {
  // Statement coverage: validates the query and returns normalized person candidates
  it('returns normalized person candidates', async () => {
    mocks.queryMock.mockReturnValue({ query: 'person' });
    mocks.fetchMock.mockResolvedValue(searchPersonRawFixture);

    const { event, result } = await invokeHandler();

    expect(result).toEqual([searchPersonCandidateFixture, searchSecondPersonCandidateFixture]);
    expect(event.node.res.statusCode).toBe(200);
    expect(mocks.fetchMock).toHaveBeenCalledExactlyOnceWith(
      'https://api.themoviedb.org/3/search/person',
      expect.objectContaining({ query: { query: 'person' } }),
    );
  });

  // Statement coverage: preserves a valid empty result set
  it('preserves a valid empty result set', async () => {
    mocks.queryMock.mockReturnValue({ query: 'unknown' });
    mocks.fetchMock.mockResolvedValue(emptySearchPersonRawFixture);

    const { event, result } = await invokeHandler();

    expect(result).toEqual([]);
    expect(event.node.res.statusCode).toBe(200);
  });

  // Branch coverage: returns a controlled 400 before configuration or transport
  it('returns a controlled 400 for an invalid query', async () => {
    mocks.queryMock.mockReturnValue({});

    const { result } = await invokeHandler();

    expect(result).toMatchObject({
      statusCode: 400,
      statusMessage: 'Invalid search query',
    });
    expect(mocks.runtimeConfigMock).not.toHaveBeenCalled();
    expect(mocks.fetchMock).not.toHaveBeenCalled();
  });

  // Branch coverage: translates upstream rejection through the real error factory
  it('returns a sanitized 502 when the upstream request fails', async () => {
    mocks.queryMock.mockReturnValue({ query: 'person' });
    mocks.fetchMock.mockRejectedValue(new Error('synthetic-upstream-secret'));

    await expect(invokeHandler()).rejects.toMatchObject({
      statusCode: 502,
      statusMessage: 'TMDb request or response invalid',
    });
    expect(mocks.fetchMock).toHaveBeenCalledTimes(1);
  });

  // Branch coverage: translates response validation failures to a controlled 502
  it('returns a controlled 502 for malformed upstream data', async () => {
    mocks.queryMock.mockReturnValue({ query: 'person' });
    mocks.fetchMock.mockResolvedValue({ results: [{ id: 'invalid' }] });

    await expect(invokeHandler()).rejects.toMatchObject({
      statusCode: 502,
      statusMessage: 'TMDb request or response invalid',
    });
    expect(mocks.fetchMock).toHaveBeenCalledTimes(1);
  });
});
