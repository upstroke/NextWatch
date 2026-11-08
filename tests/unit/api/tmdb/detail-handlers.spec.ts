import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getRouterParam, setResponseHeader } from 'h3';
import movieDetailHandler from '@server/api/tmdb/movie/[id].get';
import tvDetailHandler from '@server/api/tmdb/tv/[id].get';
import { createNuxtHandlerMocks } from '@test-mocks/nuxt-handler';
import { movieDetailRawFixture as movieRaw } from '@tests/fixtures/tmdb/detail-movie.raw';
import { tvDetailRawFixture as tvRaw } from '@tests/fixtures/tmdb/detail-tv.raw';

const mocks = createNuxtHandlerMocks();
const getRouterParamMock = vi.mocked(getRouterParam);
const setResponseHeaderMock = vi.mocked(setResponseHeader);

vi.mock(import('h3'), async (importOriginal) => {
  const actual = await importOriginal();

  return {
    ...actual,
    getRouterParam: vi.fn(),
    setResponseHeader: vi.fn(),
  };
});

const createEvent = () =>
  ({
    node: {
      res: {},
    },
  }) as never;

beforeEach(() => {
  vi.unstubAllGlobals();
  mocks.install();
  getRouterParamMock.mockReset();
  setResponseHeaderMock.mockClear();
});

describe('TMDb detail route handlers', () => {
  // Statement coverage: returns normalized Movie details for a valid ID
  it('returns normalized Movie details for a valid ID', async () => {
    getRouterParamMock.mockReturnValue('101');
    mocks.fetchMock.mockResolvedValue(movieRaw);

    const event = createEvent();
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
    expect(setResponseHeaderMock).toHaveBeenCalledWith(
      expect.anything(),
      'Cache-Control',
      'no-store',
    );
  });

  // Statement coverage: returns normalized TV details for a valid ID
  it('returns normalized TV details for a valid ID', async () => {
    getRouterParamMock.mockReturnValue('201');
    mocks.fetchMock.mockResolvedValue(tvRaw);

    const event = createEvent();
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
    expect(setResponseHeaderMock).toHaveBeenCalledWith(
      expect.anything(),
      'Cache-Control',
      'no-store',
    );
  });

  // Branch coverage: returns a sanitized 400 for an invalid Movie ID
  it('returns a sanitized 400 for an invalid Movie ID', async () => {
    getRouterParamMock.mockReturnValue('invalid');

    const event = createEvent();
    const result = await movieDetailHandler(event);

    expect(mocks.fetchMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      statusCode: 400,
      statusMessage: 'Invalid Discover query',
    });
  });

  // Branch coverage: returns a sanitized 400 for an invalid TV ID
  it('returns a sanitized 400 for an invalid TV ID', async () => {
    getRouterParamMock.mockReturnValue('invalid');

    const event = createEvent();
    const result = await tvDetailHandler(event);

    expect(mocks.fetchMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      statusCode: 400,
      statusMessage: 'Invalid Discover query',
    });
  });
});
