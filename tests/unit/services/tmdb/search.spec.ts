import { beforeEach, describe, expect, it } from 'vitest';
import { createSearchService } from '@server/services/tmdb/search';
import { createTmdbHttpMock } from '@test-mocks/tmdb-http';
import {
  searchKeywordCandidateFixture,
  searchMovieCandidateFixture,
  searchPersonCandidateFixture,
  searchSecondKeywordCandidateFixture,
  searchSecondMovieCandidateFixture,
  searchSecondPersonCandidateFixture,
  searchSecondTvCandidateFixture,
  searchTvCandidateFixture,
} from '@tests/fixtures/tmdb/search-candidates';
import {
  emptySearchKeywordRawFixture,
  searchKeywordRawFixture,
} from '@tests/fixtures/tmdb/search-keyword.raw';
import {
  emptySearchMovieRawFixture,
  searchMovieRawFixture,
} from '@tests/fixtures/tmdb/search-movie.raw';
import {
  emptySearchMultiRawFixture,
  searchMultiRawFixture,
} from '@tests/fixtures/tmdb/search-multi.raw';
import {
  emptySearchPersonRawFixture,
  searchPersonRawFixture,
} from '@tests/fixtures/tmdb/search-person.raw';
import {
  emptySearchTvRawFixture,
  searchTvRawFixture,
} from '@tests/fixtures/tmdb/search-tv.raw';

describe('search service', () => {
  let http: ReturnType<typeof createTmdbHttpMock>;
  let search: ReturnType<typeof createSearchService>;

  beforeEach(() => {
    http = createTmdbHttpMock();
    search = createSearchService(http);
  });

  // Statement coverage: searches movies through the movie endpoint
  it('searches movies through the movie endpoint', async () => {
    http.get.mockResolvedValue(searchMovieRawFixture);

    await expect(search.searchMovies('movie')).resolves.toEqual([
      searchMovieCandidateFixture,
      searchSecondMovieCandidateFixture,
    ]);
    expect(http.get).toHaveBeenCalledWith('/search/movie', {
      query: 'movie',
    });
  });

  // Statement coverage: searches tv shows through the tv endpoint
  it('searches tv shows through the tv endpoint', async () => {
    http.get.mockResolvedValue(searchTvRawFixture);

    await expect(search.searchTv('series')).resolves.toEqual([
      searchTvCandidateFixture,
      searchSecondTvCandidateFixture,
    ]);
    expect(http.get).toHaveBeenCalledWith('/search/tv', {
      query: 'series',
    });
  });

  // Statement coverage: searches multiple media types through the multi endpoint
  it('searches multiple media types through the multi endpoint', async () => {
    http.get.mockResolvedValue(searchMultiRawFixture);

    const result = await search.searchMulti('synthetic');

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({
      mediaType: 'movie',
      ...searchMovieCandidateFixture,
    });
    expect(result[1]).toEqual({
      mediaType: 'tv',
      ...searchTvCandidateFixture,
    });
    expect(result[2]).toMatchObject({
      mediaType: 'person',
      id: searchPersonCandidateFixture.id,
      name: searchPersonCandidateFixture.name,
    });
    expect(http.get).toHaveBeenCalledWith('/search/multi', {
      query: 'synthetic',
    });
  });

  // Statement coverage: searches people through the person endpoint
  it('searches people through the person endpoint', async () => {
    http.get.mockResolvedValue(searchPersonRawFixture);

    await expect(search.searchPeople('person')).resolves.toEqual([
      searchPersonCandidateFixture,
      searchSecondPersonCandidateFixture,
    ]);
    expect(http.get).toHaveBeenCalledWith('/search/person', {
      query: 'person',
    });
  });

  // Statement coverage: searches keywords through the keyword endpoint
  it('searches keywords through the keyword endpoint', async () => {
    http.get.mockResolvedValue(searchKeywordRawFixture);

    await expect(search.searchKeywords('space')).resolves.toEqual([
      searchKeywordCandidateFixture,
      searchSecondKeywordCandidateFixture,
    ]);
    expect(http.get).toHaveBeenCalledWith('/search/keyword', {
      query: 'space',
    });
  });

  // Statement coverage: returns empty results for empty movie responses
  it('returns empty results for empty movie responses', async () => {
    http.get.mockResolvedValue(emptySearchMovieRawFixture);

    await expect(search.searchMovies('unknown')).resolves.toEqual([]);
  });

  // Statement coverage: returns empty results for empty tv responses
  it('returns empty results for empty tv responses', async () => {
    http.get.mockResolvedValue(emptySearchTvRawFixture);

    await expect(search.searchTv('unknown')).resolves.toEqual([]);
  });

  // Statement coverage: returns empty results for empty multi responses
  it('returns empty results for empty multi responses', async () => {
    http.get.mockResolvedValue(emptySearchMultiRawFixture);

    await expect(search.searchMulti('unknown')).resolves.toEqual([]);
  });

  // Statement coverage: returns empty results for empty person responses
  it('returns empty results for empty person responses', async () => {
    http.get.mockResolvedValue(emptySearchPersonRawFixture);

    await expect(search.searchPeople('unknown')).resolves.toEqual([]);
  });

  // Statement coverage: returns empty results for empty keyword responses
  it('returns empty results for empty keyword responses', async () => {
    http.get.mockResolvedValue(emptySearchKeywordRawFixture);

    await expect(search.searchKeywords('unknown')).resolves.toEqual([]);
  });

  // Branch coverage: rejects an invalid movie response
  it('rejects an invalid movie response', async () => {
    http.get.mockResolvedValue({});

    await expect(search.searchMovies('movie')).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
    });
  });

  // Branch coverage: rejects an invalid tv response
  it('rejects an invalid tv response', async () => {
    http.get.mockResolvedValue({});

    await expect(search.searchTv('series')).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
    });
  });

  // Branch coverage: rejects an invalid multi response
  it('rejects an invalid multi response', async () => {
    http.get.mockResolvedValue({});

    await expect(search.searchMulti('synthetic')).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
    });
  });

  // Branch coverage: rejects an invalid person response
  it('rejects an invalid person response', async () => {
    http.get.mockResolvedValue({});

    await expect(search.searchPeople('person')).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
    });
  });

  // Branch coverage: rejects an invalid keyword response
  it('rejects an invalid keyword response', async () => {
    http.get.mockResolvedValue({});

    await expect(search.searchKeywords('space')).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
    });
  });
});
