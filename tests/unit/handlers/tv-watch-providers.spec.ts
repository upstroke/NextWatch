import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { H3Event } from 'h3';
import { createNuxtHandlerMocks } from '@test-mocks/nuxt-handler';
import { tvWatchProvidersRawFixture } from '@tests/fixtures/tmdb/tv-watch-providers.raw';

let mocks: ReturnType<typeof createNuxtHandlerMocks>;
let handler: (event: H3Event) => Promise<unknown>;

beforeEach(async () => {
  mocks = createNuxtHandlerMocks();
  mocks.install();
  handler = (
    await import('@server/api/tmdb/tv/[id]/watch-providers.get')
  ).default as (event: H3Event) => Promise<unknown>;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function invokeHandler(id = '201', region: unknown = 'DE') {
  const event = { node: { res: { statusCode: 200 } } } as unknown as H3Event;
  mocks.routerParamMock.mockReturnValue(id);
  mocks.queryMock.mockReturnValue({ region });

  const result = await handler(event);

  expect(mocks.routerParamMock).toHaveBeenCalledExactlyOnceWith(event, 'id');
  expect(mocks.queryMock).toHaveBeenCalledExactlyOnceWith(event);
  expect(mocks.headerMock).toHaveBeenCalledExactlyOnceWith(
    event,
    'Cache-Control',
    'no-store',
  );

  return { event, result };
}

describe('TV watch providers route handler', () => {
  // Statement coverage: normalizes the region and returns mapped availability
  it('normalizes the region and returns mapped availability', async () => {
    mocks.fetchMock.mockResolvedValue(tvWatchProvidersRawFixture);

    const { event, result } = await invokeHandler('201', 'de');

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
    expect(event.node.res.statusCode).toBe(200);
    expect(mocks.fetchMock).toHaveBeenCalledExactlyOnceWith(
      'https://api.themoviedb.org/3/tv/201/watch/providers',
      expect.objectContaining({ query: { region: 'DE' } }),
    );
  });

  // Branch coverage: rejects an invalid TV ID before configuration or transport
  it.each(['0', '-1', '1.5', 'abc'])('rejects an invalid TV ID: %s', async (id) => {
    const { result } = await invokeHandler(id);

    expect(result).toMatchObject({
      statusCode: 400,
      statusMessage: 'Invalid Discover query',
    });
    expect(mocks.runtimeConfigMock).not.toHaveBeenCalled();
    expect(mocks.fetchMock).not.toHaveBeenCalled();
  });

  // Branch coverage: rejects an invalid region before configuration or transport
  it.each([
    undefined,
    '',
    '   ',
    'D',
    'DEU',
    'D1',
    123,
  ])('rejects an invalid region: %o', async (region) => {
    const { result } = await invokeHandler('201', region);

    expect(result).toMatchObject({
      statusCode: 400,
      statusMessage: 'Invalid watch provider region',
    });
    expect(mocks.runtimeConfigMock).not.toHaveBeenCalled();
    expect(mocks.fetchMock).not.toHaveBeenCalled();
  });

  // Branch coverage: translates upstream rejection through the real error factory
  it('returns a sanitized 502 when the upstream request fails', async () => {
    mocks.fetchMock.mockRejectedValue(new Error('synthetic-upstream-secret'));

    await expect(invokeHandler()).rejects.toMatchObject({
      statusCode: 502,
      statusMessage: 'TMDb request or response invalid',
    });
    expect(mocks.fetchMock).toHaveBeenCalledTimes(1);
  });

  // Branch coverage: translates response validation failures to a controlled 502
  it('returns a controlled 502 for malformed upstream data', async () => {
    mocks.fetchMock.mockResolvedValue({ results: {} });

    await expect(invokeHandler()).rejects.toMatchObject({
      statusCode: 502,
      statusMessage: 'TMDb request or response invalid',
    });
    expect(mocks.fetchMock).toHaveBeenCalledTimes(1);
  });
});
