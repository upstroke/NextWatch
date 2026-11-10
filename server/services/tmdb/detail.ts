import type { TmdbContentLanguage } from '@lib/schemas/locale';
import type { TmdbMovieDetail, TmdbTvDetail } from '@lib/schemas/tmdb-detail';
import { TmdbMovieDetailRawSchema, TmdbTvDetailRawSchema } from '@lib/schemas/tmdb-detail';
import type { TmdbHttpClient } from './http';
import { createTmdbError } from './errors';
import { mapMovieDetailResponse, mapTvDetailResponse } from './detail-mappers';

/**
 * Creates a TMDb detail service backed by the supplied HTTP client.
 *
 * @param http - The TMDb HTTP client used for upstream requests.
 * @returns The detail service.
 */
export function createTmdbDetailService(http: TmdbHttpClient) {
  return {
    /**
     * Retrieves, validates and maps the details of a Movie.
     *
     * Transport failures are propagated unchanged. Validation or mapping
     * failures are normalized as an `INVALID_RESPONSE` error with the
     * original error preserved as its cause.
     *
     * @param id - The TMDb Movie identifier.
     * @param language - The resolved TMDb content language.
     * @returns The normalized Movie detail.
     * @throws A TMDb error with code `INVALID_RESPONSE` when the response
     * cannot be validated or mapped.
     */
    async getMovieDetail(id: number, language: TmdbContentLanguage): Promise<TmdbMovieDetail> {
      const raw = await http.get(`/movie/${id}`, { language });

      try {
        return mapMovieDetailResponse(TmdbMovieDetailRawSchema.parse(raw));
      } catch (error) {
        throw createTmdbError('INVALID_RESPONSE', { cause: error });
      }
    },

    /**
     * Retrieves, validates and maps the details of a TV series.
     *
     * Transport failures are propagated unchanged. Validation or mapping
     * failures are normalized as an `INVALID_RESPONSE` error with the
     * original error preserved as its cause.
     *
     * @param id - The TMDb TV series identifier.
     * @param language - The resolved TMDb content language.
     * @returns The normalized TV detail.
     * @throws A TMDb error with code `INVALID_RESPONSE` when the response
     * cannot be validated or mapped.
     */
    async getTvDetail(id: number, language: TmdbContentLanguage): Promise<TmdbTvDetail> {
      const raw = await http.get(`/tv/${id}`, { language });

      try {
        return mapTvDetailResponse(TmdbTvDetailRawSchema.parse(raw));
      } catch (error) {
        throw createTmdbError('INVALID_RESPONSE', { cause: error });
      }
    },
  };
}
