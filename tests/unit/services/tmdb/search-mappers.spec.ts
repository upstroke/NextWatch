import { describe, expect, it } from 'vitest';
import {
  mapKeywordSearchCandidate,
  mapMovieSearchCandidate,
  mapMultiSearchCandidates,
  mapPersonSearchCandidate,
  mapTvSearchCandidate,
} from '@server/services/tmdb/search-mappers';
import {
  searchKeywordCandidateFixture,
  searchMovieCandidateFixture,
  searchPersonCandidateFixture,
  searchTvCandidateFixture,
} from '@tests/fixtures/tmdb/search-candidates';
import { searchKeywordRawFixture } from '@tests/fixtures/tmdb/search-keyword.raw';
import { searchMovieRawFixture } from '@tests/fixtures/tmdb/search-movie.raw';
import {
  emptySearchMultiRawFixture,
  searchMultiRawFixture,
} from '@tests/fixtures/tmdb/search-multi.raw';
import { searchPersonRawFixture } from '@tests/fixtures/tmdb/search-person.raw';
import { searchTvRawFixture } from '@tests/fixtures/tmdb/search-tv.raw';

describe('search mappers', () => {
  // Statement coverage: maps a movie search result
  it('maps a movie search result', () => {
    expect(
      mapMovieSearchCandidate(searchMovieRawFixture.results[0]),
    ).toEqual(searchMovieCandidateFixture);
  });

  // Statement coverage: maps a tv search result
  it('maps a tv search result', () => {
    expect(mapTvSearchCandidate(searchTvRawFixture.results[0])).toEqual(
      searchTvCandidateFixture,
    );
  });

  // Statement coverage: maps a person search result
  it('maps a person search result', () => {
    expect(
      mapPersonSearchCandidate(searchPersonRawFixture.results[0]),
    ).toEqual(searchPersonCandidateFixture);
  });

  // Statement coverage: maps a keyword search result
  it('maps a keyword search result', () => {
    expect(
      mapKeywordSearchCandidate(searchKeywordRawFixture.results[0]),
    ).toEqual(searchKeywordCandidateFixture);
  });

  // Statement coverage: maps multi search results by media type
  it('maps multi search results by media type', () => {
    expect(mapMultiSearchCandidates(searchMultiRawFixture.results)).toEqual([
      {
        mediaType: 'movie',
        ...searchMovieCandidateFixture,
      },
      {
        mediaType: 'tv',
        ...searchTvCandidateFixture,
      },
      {
        mediaType: 'person',
        id: searchPersonCandidateFixture.id,
        name: searchPersonCandidateFixture.name,
        profilePath: searchPersonCandidateFixture.profilePath,
        knownFor: [
          {
            id: 101,
            mediaType: 'movie',
            title: 'Synthetic Movie',
          },
        ],
      },
    ]);
  });

  // Statement coverage: maps an empty multi search response
  it('maps an empty multi search response', () => {
    expect(
      mapMultiSearchCandidates(emptySearchMultiRawFixture.results),
    ).toEqual([]);
  });
});
