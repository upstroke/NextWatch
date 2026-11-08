import { beforeEach, describe, expect, it, vi } from 'vitest';
import movieDetailHandler from '@server/api/tmdb/movie/[id].get';
import tvDetailHandler from '@server/api/tmdb/tv/[id].get';
import { createNuxtHandlerMocks } from '@test-mocks/nuxt-handler';
import {
  movieDetailRawFixture as movieRaw,
} from '@tests/fixtures/tmdb/detail-movie.raw';
import {
  tvDetailRawFixture as tvRaw,
} from '@tests/fixtures/tmdb/detail-tv.raw';

const mocks = createNuxtHandlerMocks();

vi.mock('h3', () => ({
  defineEventHandler: (handler: unknown) => handler,
  getRouterParam: vi.fn(),
  setResponseHeader: vi.fn(),
}));

beforeEach(() => {
  vi.unstubAllGlobals();
  mocks.install();
});

describe('TMDb detail route handlers', () => {
  // Statement coverage: returns normalized Movie details for a valid ID
  it('returns normalized Movie details for a valid ID', async () => {
    mocks.routerParamMock.mockReturnValue('101');
    mocks.fetchMock.mockResolvedValue(movieRaw);

    const event = {} as never;
    const result = await movieDetailHandler(event);

    expect(mocks.fetchMock).toHaveBeenCalledWith(
      'https://api.themoviedb.org/3/movie/101',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer synthetic-test-token',
        }),
      }),
    );
    expect(result).toMatchObject({
      id: 101,
      mediaType: 'movie',
      title: 'Synthetic Movie',
    });
    expect(mocks.headerMock).toHaveBeenCalledWith(
      expect.anything(),
      'Cache-Control',
      'no-store',
    );
  });

  // Statement coverage: returns normalized TV details for a valid ID
  it('returns normalized TV details for a valid ID', async () => {
    mocks.routerParamMock.mockReturnValue('201');
    mocks.fetchMock.mockResolvedValue(tvRaw);

    const event = {} as never;
    const result = await tvDetailHandler(event);

    expect(mocks.fetchMock).toHaveBeenCalledWith(
      'https://api.themoviedb.org/3/tv/201',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer synthetic-test-token',
        }),
      }),
    );
    expect(result).toMatchObject({
      id: 201,
      mediaType: 'tv',
      title: 'Synthetic Series',
    });
    expect(mocks.headerMock).toHaveBeenCalledWith(
      expect.anything(),
      'Cache-Control',
      'no-store',
    );
  });

  // Branch coverage: returns a sanitized 400 for an invalid Movie ID
  it('returns a sanitized 400 for an invalid Movie ID', async () => {
    mocks.routerParamMock.mockReturnValue('invalid');

    const event = {} as never;
    const result = await movieDetailHandler(event);

    expect(mocks.fetchMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      statusCode: 400,
      statusMessage: 'Invalid Discover query',
    });
  });

  // Branch coverage: returns a sanitized 400 for an invalid TV ID
  it('returns a sanitized 400 for an invalid TV ID', async () => {
    mocks.routerParamMock.mockReturnValue('invalid');

    const event = {} as never;
    const result = await tvDetailHandler(event);

    expect(mocks.fetchMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      statusCode: 400,
      statusMessage: 'Invalid Discover query',
    });
  });
});
