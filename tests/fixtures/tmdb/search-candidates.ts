import type {
  SearchKeywordCandidate,
  SearchMovieCandidate,
  SearchPersonCandidate,
  SearchTvCandidate,
} from '@lib/schemas/tmdb-search';

export const searchMovieCandidateFixture: SearchMovieCandidate = {
  id: 101,
  title: 'Synthetic Movie',
  overview: 'Synthetic movie overview',
  posterPath: '/movie.jpg',
  backdropPath: '/movie-backdrop.jpg',
  releaseDate: '2024-05-01',
  voteAverage: 7.5,
};

export const searchSecondMovieCandidateFixture: SearchMovieCandidate = {
  id: 102,
  title: 'Synthetic Undated Movie',
};

export const searchTvCandidateFixture: SearchTvCandidate = {
  id: 201,
  name: 'Synthetic Series',
  overview: 'Synthetic series overview',
  posterPath: '/series.jpg',
  backdropPath: '/series-backdrop.jpg',
  firstAirDate: '2024-06-01',
  voteAverage: 8,
};

export const searchSecondTvCandidateFixture: SearchTvCandidate = {
  id: 202,
  name: 'Synthetic Undated Series',
};

export const searchPersonCandidateFixture: SearchPersonCandidate = {
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
};

export const searchSecondPersonCandidateFixture: SearchPersonCandidate = {
  id: 302,
  name: 'Synthetic Person Without Metadata',
};

export const searchKeywordCandidateFixture: SearchKeywordCandidate = {
  id: 801,
  name: 'space exploration',
};

export const searchSecondKeywordCandidateFixture: SearchKeywordCandidate = {
  id: 802,
  name: 'artificial intelligence',
};
