import type { TmdbMovieDetail, TmdbTvDetail } from 'src/lib/schemas/tmdb-detail';
import { TmdbMovieDetailRawSchema, TmdbTvDetailRawSchema } from 'src/lib/schemas/tmdb-detail';
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
     * @returns The normalized Movie detail.
     * @throws A TMDb error with code `INVALID_RESPONSE` when the response
     * cannot be validated or mapped.
     */
    async getMovieDetail(id: number): Promise<TmdbMovieDetail> {
      const raw = await http.get(`/movie/${id}`);

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
     * @returns The normalized TV detail.
     * @throws A TMDb error with code `INVALID_RESPONSE` when the response
     * cannot be validated or mapped.
     */
    async getTvDetail(id: number): Promise<TmdbTvDetail> {
      const raw = await http.get(`/tv/${id}`);

      try {
        return mapTvDetailResponse(TmdbTvDetailRawSchema.parse(raw));
      } catch (error) {
        throw createTmdbError('INVALID_RESPONSE', { cause: error });
      }
    },
  };
}
