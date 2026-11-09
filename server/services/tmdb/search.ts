import type {
  MultiSearchCandidate,
  SearchKeywordCandidate,
  SearchMovieCandidate,
  SearchPersonCandidate,
  SearchTvCandidate,
} from '@lib/schemas/tmdb-search';
import {
  TmdbSearchKeywordResponseSchema,
  TmdbSearchMovieResponseSchema,
  TmdbSearchMultiResponseSchema,
  TmdbSearchPersonResponseSchema,
  TmdbSearchTvResponseSchema,
} from '@lib/schemas/tmdb-search';
import type { TmdbHttpClient } from './http';
import { createTmdbError } from './errors';
import {
  mapKeywordSearchCandidate,
  mapMovieSearchCandidate,
  mapMultiSearchCandidates,
  mapPersonSearchCandidate,
  mapTvSearchCandidate,
} from './search-mappers';

/**
 * Retrieves, validates and maps Movie Search results.
 *
 * @param http - The TMDb HTTP client used for the upstream request.
 * @param query - The search query supplied by the caller.
 * @returns The mapped movie search candidates.
 * @throws A TMDb error with code `INVALID_RESPONSE` when the response
 * cannot be validated or mapped.
 */
async function searchMovies(http: TmdbHttpClient, query: string): Promise<SearchMovieCandidate[]> {
  const raw = await http.get('/search/movie', { query });

  try {
    const response = TmdbSearchMovieResponseSchema.parse(raw);

    return response.results.map(mapMovieSearchCandidate);
  } catch {
    throw createTmdbError('INVALID_RESPONSE');
  }
}

/**
 * Retrieves, validates and maps TV Search results.
 *
 * @param http - The TMDb HTTP client used for the upstream request.
 * @param query - The search query supplied by the caller.
 * @returns The mapped TV search candidates.
 * @throws A TMDb error with code `INVALID_RESPONSE` when the response
 * cannot be validated or mapped.
 */
async function searchTv(http: TmdbHttpClient, query: string): Promise<SearchTvCandidate[]> {
  const raw = await http.get('/search/tv', { query });

  try {
    const response = TmdbSearchTvResponseSchema.parse(raw);

    return response.results.map(mapTvSearchCandidate);
  } catch {
    throw createTmdbError('INVALID_RESPONSE');
  }
}

/**
 * Retrieves, validates and maps Multi Search results.
 *
 * @param http - The TMDb HTTP client used for the upstream request.
 * @param query - The search query supplied by the caller.
 * @returns The mapped multi search candidates.
 * @throws A TMDb error with code `INVALID_RESPONSE` when the response
 * cannot be validated or mapped.
 */
async function searchMulti(http: TmdbHttpClient, query: string): Promise<MultiSearchCandidate[]> {
  const raw = await http.get('/search/multi', { query });

  try {
    const response = TmdbSearchMultiResponseSchema.parse(raw);

    return mapMultiSearchCandidates(response.results);
  } catch {
    throw createTmdbError('INVALID_RESPONSE');
  }
}

/**
 * Retrieves, validates and maps Person Search results.
 *
 * @param http - The TMDb HTTP client used for the upstream request.
 * @param query - The search query supplied by the caller.
 * @returns The mapped person search candidates.
 * @throws A TMDb error with code `INVALID_RESPONSE` when the response
 * cannot be validated or mapped.
 */
async function searchPeople(http: TmdbHttpClient, query: string): Promise<SearchPersonCandidate[]> {
  const raw = await http.get('/search/person', { query });

  try {
    const response = TmdbSearchPersonResponseSchema.parse(raw);

    return response.results.map(mapPersonSearchCandidate);
  } catch {
    throw createTmdbError('INVALID_RESPONSE');
  }
}

/**
 * Retrieves, validates and maps Keyword Search results.
 *
 * @param http - The TMDb HTTP client used for the upstream request.
 * @param query - The search query supplied by the caller.
 * @returns The mapped keyword search candidates.
 * @throws A TMDb error with code `INVALID_RESPONSE` when the response
 * cannot be validated or mapped.
 */
async function searchKeywords(
  http: TmdbHttpClient,
  query: string,
): Promise<SearchKeywordCandidate[]> {
  const raw = await http.get('/search/keyword', { query });

  try {
    const response = TmdbSearchKeywordResponseSchema.parse(raw);

    return response.results.map(mapKeywordSearchCandidate);
  } catch {
    throw createTmdbError('INVALID_RESPONSE');
  }
}

/**
 * Creates a Search service backed by the supplied TMDb HTTP client.
 *
 * @param http - The TMDb HTTP client used for upstream requests.
 * @returns The Search service.
 */
export function createSearchService(http: TmdbHttpClient) {
  return {
    /**
     * Retrieves and maps Movie Search results for the supplied query.
     *
     * @param query - The search query supplied by the caller.
     * @returns The mapped movie search candidates.
     */
    searchMovies(query: string): Promise<SearchMovieCandidate[]> {
      return searchMovies(http, query);
    },

    /**
     * Retrieves and maps TV Search results for the supplied query.
     *
     * @param query - The search query supplied by the caller.
     * @returns The mapped TV search candidates.
     */
    searchTv(query: string): Promise<SearchTvCandidate[]> {
      return searchTv(http, query);
    },

    /**
     * Retrieves and maps Multi Search results for the supplied query.
     *
     * @param query - The search query supplied by the caller.
     * @returns The mapped multi search candidates.
     */
    searchMulti(query: string): Promise<MultiSearchCandidate[]> {
      return searchMulti(http, query);
    },

    /**
     * Retrieves and maps Person Search results for the supplied query.
     *
     * @param query - The search query supplied by the caller.
     * @returns The mapped person search candidates.
     */
    searchPeople(query: string): Promise<SearchPersonCandidate[]> {
      return searchPeople(http, query);
    },

    /**
     * Retrieves and maps Keyword Search results for the supplied query.
     *
     * @param query - The search query supplied by the caller.
     * @returns The mapped keyword search candidates.
     */
    searchKeywords(query: string): Promise<SearchKeywordCandidate[]> {
      return searchKeywords(http, query);
    },
  };
}
