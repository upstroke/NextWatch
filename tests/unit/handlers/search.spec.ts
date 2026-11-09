import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { H3Event } from 'h3';
import { createNuxtHandlerMocks } from '@test-mocks/nuxt-handler';
import { searchKeywordRawFixture } from '@tests/fixtures/tmdb/search-keyword.raw';
import { searchMovieRawFixture } from '@tests/fixtures/tmdb/search-movie.raw';
import { searchMultiRawFixture } from '@tests/fixtures/tmdb/search-multi.raw';
import { searchPersonRawFixture } from '@tests/fixtures/tmdb/search-person.raw';
import { searchTvRawFixture } from '@tests/fixtures/tmdb/search-tv.raw';

let mocks: ReturnType<typeof createNuxtHandlerMocks>;
let handlers: Record<
  'movie' | 'tv' | 'multi' | 'person' | 'keyword',
  (event: H3Event) => Promise<unknown>
>;

beforeEach(async () => {
  mocks = createNuxtHandlerMocks();
  mocks.install();

  handlers = {
    movie: (
      await import('@server/api/tmdb/search/movie.get')
    ).default as (event: H3Event) => Promise<unknown>,
    tv: (
      await import('@server/api/tmdb/search/tv.get')
    ).default as (event: H3Event) => Promise<unknown>,
    multi: (
      await import('@server/api/tmdb/search/multi.get')
    ).default as (event: H3Event) => Promise<unknown>,
    person: (
      await import('@server/api/tmdb/search/person.get')
    ).default as (event: H3Event) => Promise<unknown>,
    keyword: (
      await import('@server/api/tmdb/search/keyword.get')
    ).default as (event: H3Event) => Promise<unknown>,
  };
});

afterEach(() => {
  vi.unstubAllGlobals();
});

type SearchRoute = keyof typeof handlers;

function createEvent() {
  return { node: { res: { statusCode: 200 } } } as unknown as H3Event;
}

async function invokeHandler(route: SearchRoute) {
  const event = createEvent();
  const result = await handlers[route](event);

  expect(mocks.queryMock).toHaveBeenCalledExactlyOnceWith(event);
  expect(mocks.headerMock).toHaveBeenCalledExactlyOnceWith(
    event,
    'Cache-Control',
    'no-store',
  );

  return { event, result };
}

describe('Search route handlers', () => {
  // Statement coverage: validates the query and returns normalized movie candidates
  it('returns normalized movie candidates', async () => {
    mocks.queryMock.mockReturnValue({ query: 'movie' });
    mocks.fetchMock.mockResolvedValue(searchMovieRawFixture);

    const { event, result } = await invokeHandler('movie');

    expect(result).toEqual([
      {
        id: 101,
        title: 'Synthetic Movie',
        overview: 'Synthetic movie overview',
        posterPath: '/movie.jpg',
        backdropPath: '/movie-backdrop.jpg',
        releaseDate: '2024-05-01',
        voteAverage: 7.5,
      },
      {
        id: 102,
        title: 'Synthetic Undated Movie',
      },
    ]);
    expect(event.node.res.statusCode).toBe(200);
    expect(mocks.fetchMock).toHaveBeenCalledExactlyOnceWith(
      'https://api.themoviedb.org/3/search/movie',
      expect.objectContaining({ query: { query: 'movie' } }),
    );
  });

  // Statement coverage: validates the query and returns normalized tv candidates
  it('returns normalized tv candidates', async () => {
    mocks.queryMock.mockReturnValue({ query: 'series' });
    mocks.fetchMock.mockResolvedValue(searchTvRawFixture);

    const { event, result } = await invokeHandler('tv');

    expect(result).toEqual([
      {
        id: 201,
        name: 'Synthetic Series',
        overview: 'Synthetic series overview',
        posterPath: '/series.jpg',
        backdropPath: '/series-backdrop.jpg',
        firstAirDate: '2024-06-01',
        voteAverage: 8,
      },
      {
        id: 202,
        name: 'Synthetic Undated Series',
      },
    ]);
    expect(event.node.res.statusCode).toBe(200);
    expect(mocks.fetchMock).toHaveBeenCalledExactlyOnceWith(
      'https://api.themoviedb.org/3/search/tv',
      expect.objectContaining({ query: { query: 'series' } }),
    );
  });

  // Statement coverage: validates the query and returns normalized multi candidates
  it('returns normalized multi candidates', async () => {
    mocks.queryMock.mockReturnValue({ query: 'synthetic' });
    mocks.fetchMock.mockResolvedValue(searchMultiRawFixture);

    const { event, result } = await invokeHandler('multi');

    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({ mediaType: 'movie', id: 101 });
    expect(result[1]).toMatchObject({ mediaType: 'tv', id: 201 });
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
    expect(mocks.fetchMock).toHaveBeenCalledExactlyOnceWith(
      'https://api.themoviedb.org/3/search/multi',
      expect.objectContaining({ query: { query: 'synthetic' } }),
    );
  });

  // Statement coverage: validates the query and returns normalized person candidates
  it('returns normalized person candidates', async () => {
    mocks.queryMock.mockReturnValue({ query: 'person' });
    mocks.fetchMock.mockResolvedValue(searchPersonRawFixture);

    const { event, result } = await invokeHandler('person');

    expect(result).toEqual([
      {
        id: 301,
        name: 'Synthetic Person',
        profilePath: '/person.jpg',
        knownFor: [
          {
            id: 101,
            mediaType: 'movie',
            title: 'Synthetic Movie',
          },
          {
            id: 201,
            mediaType: 'tv',
            name: 'Synthetic Series',
          },
        ],
      },
      {
        id: 302,
        name: 'Synthetic Person Without Metadata',
      },
    ]);
    expect(event.node.res.statusCode).toBe(200);
    expect(mocks.fetchMock).toHaveBeenCalledExactlyOnceWith(
      'https://api.themoviedb.org/3/search/person',
      expect.objectContaining({ query: { query: 'person' } }),
    );
  });

  // Statement coverage: validates the query and returns normalized keyword candidates
  it('returns normalized keyword candidates', async () => {
    mocks.queryMock.mockReturnValue({ query: 'space' });
    mocks.fetchMock.mockResolvedValue(searchKeywordRawFixture);

    const { event, result } = await invokeHandler('keyword');

    expect(result).toEqual([
      {
        id: 801,
        name: 'space exploration',
      },
      {
        id: 802,
        name: 'artificial intelligence',
      },
    ]);
    expect(event.node.res.statusCode).toBe(200);
    expect(mocks.fetchMock).toHaveBeenCalledExactlyOnceWith(
      'https://api.themoviedb.org/3/search/keyword',
      expect.objectContaining({ query: { query: 'space' } }),
    );
  });

  // Branch coverage: returns a controlled 400 before configuration, transport, or response headers
  it.each([
    {},
    { query: '' },
    { query: '   ' },
    { query: 123 },
  ])('returns a controlled 400 for an invalid query: %o', async (query) => {
    mocks.queryMock.mockReturnValue(query);

    const event = createEvent();
    const result = await handlers.movie(event);

    expect(mocks.queryMock).toHaveBeenCalledExactlyOnceWith(event);
    expect(mocks.headerMock).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      statusCode: 400,
      statusMessage: 'Invalid search query',
    });
    expect(event.node.res.statusCode).toBe(400);
    expect(mocks.runtimeConfigMock).not.toHaveBeenCalled();
    expect(mocks.fetchMock).not.toHaveBeenCalled();
  });

  // Branch coverage: translates upstream rejection through the real error factory and HTTP adapter
  it('returns a sanitized 502 when the upstream request fails', async () => {
    mocks.queryMock.mockReturnValue({ query: 'movie' });
    mocks.fetchMock.mockRejectedValue(new Error('synthetic-upstream-secret'));

    const event = createEvent();

    await expect(handlers.movie(event)).rejects.toMatchObject({
      statusCode: 502,
      statusMessage: 'TMDb request or response invalid',
    });

    expect(mocks.queryMock).toHaveBeenCalledExactlyOnceWith(event);
    expect(mocks.headerMock).toHaveBeenCalledExactlyOnceWith(
      event,
      'Cache-Control',
      'no-store',
    );
    expect(event.node.res.statusCode).toBe(502);
    expect(mocks.fetchMock).toHaveBeenCalledTimes(1);
  });

  // Branch coverage: translates real response validation failures to a controlled 502
  it('returns a controlled 502 for malformed upstream data', async () => {
    mocks.queryMock.mockReturnValue({ query: 'movie' });
    mocks.fetchMock.mockResolvedValue({ results: [{ id: 'invalid' }] });

    const event = createEvent();

    await expect(handlers.movie(event)).rejects.toMatchObject({
      statusCode: 502,
      statusMessage: 'TMDb request or response invalid',
    });

    expect(mocks.queryMock).toHaveBeenCalledExactlyOnceWith(event);
    expect(mocks.headerMock).toHaveBeenCalledExactlyOnceWith(
      event,
      'Cache-Control',
      'no-store',
    );
    expect(event.node.res.statusCode).toBe(502);
    expect(mocks.fetchMock).toHaveBeenCalledTimes(1);
  });
});
