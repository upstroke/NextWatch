import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { H3Event } from 'h3';
import { createNuxtHandlerMocks } from '@test-mocks/nuxt-handler';
import { movieWatchProvidersRawFixture } from '@tests/fixtures/tmdb/movie-watch-providers.raw';

let mocks: ReturnType<typeof createNuxtHandlerMocks>;
let handler: (event: H3Event) => Promise<unknown>;

beforeEach(async () => {
  mocks = createNuxtHandlerMocks();
  mocks.install();
  handler = (
    await import('@server/api/tmdb/movie/[id]/watch-providers.get')
  ).default as (event: H3Event) => Promise<unknown>;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function invokeHandler(id = '101', region: unknown = 'DE') {
  const search = region === undefined ? '' : `?region=${encodeURIComponent(String(region))}`;
  const event = {
    context: {
      params: { id },
    },
    node: {
      req: {
        url: `/watch-providers${search}`,
      },
      res: {
        statusCode: 200,
        setHeader: vi.fn(),
      },
    },
  } as unknown as H3Event;

  const result = await handler(event);

  expect(event.node.res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');

  return { event, result };
}

describe('Movie watch providers route handler', () => {
  // Statement coverage: normalizes the region and returns mapped availability
  it('normalizes the region and returns mapped availability', async () => {
    mocks.fetchMock.mockResolvedValue(movieWatchProvidersRawFixture);

    const { event, result } = await invokeHandler('101', 'de');

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
    expect(event.node.res.statusCode).toBe(200);
    expect(mocks.fetchMock).toHaveBeenCalledExactlyOnceWith(
      'https://api.themoviedb.org/3/movie/101/watch/providers',
      expect.objectContaining({ query: { region: 'DE' } }),
    );
  });

  // Branch coverage: rejects an invalid Movie ID before configuration or transport
  it.each(['0', '-1', '1.5', 'abc'])('rejects an invalid Movie ID: %s', async (id) => {
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
    const { result } = await invokeHandler('101', region);

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
