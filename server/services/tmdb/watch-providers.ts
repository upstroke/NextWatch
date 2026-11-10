import type {
  TmdbWatchProvidersRaw,
  WatchProviderAvailability,
} from '@lib/schemas/tmdb-watch-providers';
import {
  TmdbWatchProvidersRawSchema,
  WatchProviderAvailabilitySchema,
} from '@lib/schemas/tmdb-watch-providers';
import type { TmdbHttpClient } from './http';
import { createTmdbError } from './errors';

function mapWatchProviders(raw: TmdbWatchProvidersRaw, region: string): WatchProviderAvailability {
  const category = raw.results?.[region];

  return WatchProviderAvailabilitySchema.parse({
    mediaId: raw.id,
    region,
    stream: (category?.flatrate ?? []).map((provider) => ({
      id: provider.provider_id,
      name: provider.provider_name,
      logoPath: provider.logo_path,
      displayPriority: provider.display_priority,
    })),
    rent: (category?.rent ?? []).map((provider) => ({
      id: provider.provider_id,
      name: provider.provider_name,
      logoPath: provider.logo_path,
      displayPriority: provider.display_priority,
    })),
    buy: (category?.buy ?? []).map((provider) => ({
      id: provider.provider_id,
      name: provider.provider_name,
      logoPath: provider.logo_path,
      displayPriority: provider.display_priority,
    })),
  });
}

/**
 * Creates a TMDb watch provider service backed by the supplied HTTP client.
 *
 * @param http - The TMDb HTTP client used for upstream requests.
 * @returns The watch provider service.
 */
export function createWatchProviderService(http: TmdbHttpClient) {
  return {
    /**
     * Retrieves, validates and maps watch provider availability for a Movie.
     *
     * Transport failures are propagated unchanged. Validation or mapping
     * failures are normalized as an `INVALID_RESPONSE` error with the
     * original error preserved as its cause.
     *
     * @param id - The TMDb Movie identifier.
     * @param region - The uppercase ISO 3166-1 alpha-2 region code.
     * @returns The normalized Movie watch provider availability.
     * @throws A TMDb error with code `INVALID_RESPONSE` when the response
     * cannot be validated or mapped.
     */
    async getMovieWatchProviders(
      id: number,
      region: string,
    ): Promise<WatchProviderAvailability> {
      const raw = await http.get(`/movie/${id}/watch/providers`, { region });

      try {
        return mapWatchProviders(TmdbWatchProvidersRawSchema.parse(raw), region);
      } catch (error) {
        throw createTmdbError('INVALID_RESPONSE', { cause: error });
      }
    },

    /**
     * Retrieves, validates and maps watch provider availability for a TV series.
     *
     * Transport failures are propagated unchanged. Validation or mapping
     * failures are normalized as an `INVALID_RESPONSE` error with the
     * original error preserved as its cause.
     *
     * @param id - The TMDb TV series identifier.
     * @param region - The uppercase ISO 3166-1 alpha-2 region code.
     * @returns The normalized TV watch provider availability.
     * @throws A TMDb error with code `INVALID_RESPONSE` when the response
     * cannot be validated or mapped.
     */
    async getTvWatchProviders(
      id: number,
      region: string,
    ): Promise<WatchProviderAvailability> {
      const raw = await http.get(`/tv/${id}/watch/providers`, { region });

      try {
        return mapWatchProviders(TmdbWatchProvidersRawSchema.parse(raw), region);
      } catch (error) {
        throw createTmdbError('INVALID_RESPONSE', { cause: error });
      }
    },
  };
}
