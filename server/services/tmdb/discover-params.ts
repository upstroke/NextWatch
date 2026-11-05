import type { DiscoverFilters } from '../../../src/lib/schemas/discover';

export type DiscoverMediaType = 'movie' | 'tv';

export type DiscoverQueryParams = {
  with_genres?: string;
  'vote_average.gte'?: string;
  'primary_release_date.gte'?: string;
  'primary_release_date.lte'?: string;
  'first_air_date.gte'?: string;
  'first_air_date.lte'?: string;
  sort_by: DiscoverFilters['sortBy'];
};

function toYearStart(year: number) {
  return `${year}-01-01`;
}

function toYearEnd(year: number) {
  return `${year}-12-31`;
}

/** Pure mapping from validated application filters to TMDb Discover query parameters. */
export function buildDiscoverParams(
  mediaType: DiscoverMediaType,
  filters: DiscoverFilters,
): DiscoverQueryParams {
  const params: DiscoverQueryParams = {
    sort_by: filters.sortBy,
  };

  if (filters.genreIds.length > 0) {
    params.with_genres = filters.genreIds.join(',');
  }

  if (filters.minRating !== undefined) {
    params['vote_average.gte'] = String(filters.minRating);
  }

  if (filters.yearFrom !== undefined) {
    if (mediaType === 'movie') {
      params['primary_release_date.gte'] = toYearStart(filters.yearFrom);
    } else {
      params['first_air_date.gte'] = toYearStart(filters.yearFrom);
    }
  }

  if (filters.yearTo !== undefined) {
    if (mediaType === 'movie') {
      params['primary_release_date.lte'] = toYearEnd(filters.yearTo);
    } else {
      params['first_air_date.lte'] = toYearEnd(filters.yearTo);
    }
  }

  return params;
}
