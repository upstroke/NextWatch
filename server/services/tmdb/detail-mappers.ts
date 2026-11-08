import type {
  TmdbDetailBase,
  TmdbMovieDetail,
  TmdbMovieDetailRaw,
  TmdbTvDetail,
  TmdbTvDetailRaw,
} from 'src/lib/schemas/tmdb-detail';

function toDetailBase(
  raw: TmdbMovieDetailRaw | TmdbTvDetailRaw,
  mediaType: 'movie' | 'tv',
  title: string,
  originalTitle: string,
): TmdbDetailBase {
  return {
    id: raw.id,
    mediaType,
    title,
    originalTitle,
    overview: raw.overview,
    tagline: raw.tagline,
    posterPath: raw.poster_path,
    backdropPath: raw.backdrop_path,
    voteAverage: raw.vote_average,
    voteCount: raw.vote_count,
    genres: raw.genres,
    originalLanguage: raw.original_language,
    status: raw.status,
    homepage: raw.homepage,
    popularity: raw.popularity,
  };
}

/**
 * Maps a validated Movie detail response to the normalized Movie detail contract.
 *
 * @param raw - The validated Movie detail response.
 * @returns The normalized Movie detail.
 */
export function mapMovieDetailResponse(raw: TmdbMovieDetailRaw): TmdbMovieDetail {
  return {
    ...toDetailBase(raw, 'movie', raw.title, raw.original_title),
    mediaType: 'movie',
    releaseDate: raw.release_date,
    runtime: raw.runtime,
  };
}

/**
 * Maps a validated TV detail response to the normalized TV detail contract.
 *
 * @param raw - The validated TV detail response.
 * @returns The normalized TV detail.
 */
export function mapTvDetailResponse(raw: TmdbTvDetailRaw): TmdbTvDetail {
  return {
    ...toDetailBase(raw, 'tv', raw.name, raw.original_name),
    mediaType: 'tv',
    firstAirDate: raw.first_air_date,
    lastAirDate: raw.last_air_date,
    numberOfSeasons: raw.number_of_seasons,
    numberOfEpisodes: raw.number_of_episodes,
    networks: raw.networks,
    createdBy: raw.created_by,
    originCountries: raw.origin_country,
  };
}
