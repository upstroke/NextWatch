import type {
  SearchKeywordCandidate,
  SearchMovieCandidate,
  SearchPersonCandidate,
  SearchTvCandidate,
  TmdbSearchKeywordResponse,
  TmdbSearchMovieResponse,
  TmdbSearchMultiResponse,
  TmdbSearchPersonResponse,
  TmdbSearchTvResponse,
} from '@lib/schemas/tmdb-search';

export function mapMovieSearchCandidate(
  result: TmdbSearchMovieResponse['results'][number],
): SearchMovieCandidate {
  return {
    id: result.id,
    title: result.title,
    overview: result.overview,
    posterPath: result.poster_path,
    backdropPath: result.backdrop_path,
    releaseDate: result.release_date,
    voteAverage: result.vote_average,
  };
}

export function mapTvSearchCandidate(
  result: TmdbSearchTvResponse['results'][number],
): SearchTvCandidate {
  return {
    id: result.id,
    name: result.name,
    overview: result.overview,
    posterPath: result.poster_path,
    backdropPath: result.backdrop_path,
    firstAirDate: result.first_air_date,
    voteAverage: result.vote_average,
  };
}

export function mapPersonSearchCandidate(
  result: TmdbSearchPersonResponse['results'][number],
): SearchPersonCandidate {
  return {
    id: result.id,
    name: result.name,
    profilePath: result.profile_path,
    knownFor: result.known_for?.map((item) => ({
      id: item.id,
      mediaType: item.media_type,
      title: item.title,
      name: item.name,
    })),
  };
}

export function mapKeywordSearchCandidate(
  result: TmdbSearchKeywordResponse['results'][number],
): SearchKeywordCandidate {
  return {
    id: result.id,
    name: result.name,
  };
}

export type MultiSearchCandidate =
  | (SearchMovieCandidate & { mediaType: 'movie' })
  | (SearchTvCandidate & { mediaType: 'tv' })
  | (SearchPersonCandidate & { mediaType: 'person' });

export function mapMultiSearchCandidates(
  results: TmdbSearchMultiResponse['results'],
): MultiSearchCandidate[] {
  return results.map((result) => {
    switch (result.media_type) {
      case 'movie':
        return {
          mediaType: 'movie',
          ...mapMovieSearchCandidate(result),
        };
      case 'tv':
        return {
          mediaType: 'tv',
          ...mapTvSearchCandidate(result),
        };
      case 'person':
        return {
          mediaType: 'person',
          ...mapPersonSearchCandidate(result),
        };
    }
  });
}
