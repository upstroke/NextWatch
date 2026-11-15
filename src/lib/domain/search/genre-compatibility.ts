import { GenreCatalogsSchema } from '@lib/schemas/genre-catalogs';
import type { SearchFilters } from '@lib/schemas/search';
import type { InactiveGenre, SearchState } from '@lib/schemas/search-state';

export type GenreCompatibilityFailure =
  | 'genre-catalogs-required'
  | 'invalid-genre-catalogs'
  | 'unknown-genre';

/** Facts for later translated feedback and media-specific execution, not rendered UI. */
export type GenreMediaChange = {
  from: SearchFilters['mediaType'];
  to: SearchFilters['mediaType'];
  deactivatedGenreIds: number[];
  restoredGenreIds: number[];
  genreScopes: { movie: number[]; tv: number[] };
};

type GenreCompatibilityResult =
  | { ok: false; reason: GenreCompatibilityFailure }
  | { ok: true; filters: SearchFilters; inactiveGenres: InactiveGenre[]; mediaChange?: GenreMediaChange };

/**
 * Reconstructs the single genre wish without sorting genre IDs or mutating state.
 * @param state Previously validated state with disjoint active and inactive genres.
 * @returns All desired IDs in their remembered first-occurrence order.
 */
export function getGenreWish(state: SearchState): number[] {
  const ids = [...state.filters.genreIds];
  const inactive = [...(state.inactiveGenres ?? [])].sort((a, b) => a.position - b.position);
  for (const genre of inactive) ids.splice(genre.position, 0, genre.id);
  return ids;
}

/**
 * Partitions a normalized complete genre wish for an accepted media-type proposal.
 * Same-media edits retain known inactive membership; set/replace/remove operate on
 * the whole wish, so explicitly replaced or removed values cannot reappear later.
 * Media changes require both complete application-supplied catalogs whenever
 * genres are desired. Unknown IDs and unavailable catalogs are not incompatibility.
 * Shared IDs remain unchanged; no similar category or substitute ID is invented.
 * The function does not commit state, increment revision, fetch data or execute search.
 * @param state Previously validated source state.
 * @param desired Candidate filters whose genreIds contain the complete desired wish.
 * @param catalogs Untrusted catalog structure from the trusted retrieval boundary.
 * @returns A candidate partition and feedback facts, or a rejection reason.
 */
export function prepareGenreCompatibility(
  state: SearchState,
  desired: SearchFilters,
  catalogs?: unknown,
): GenreCompatibilityResult {
  const priorInactive = new Set((state.inactiveGenres ?? []).map((genre) => genre.id));
  if (desired.mediaType === state.filters.mediaType) {
    const inactiveGenres = desired.genreIds.flatMap((id, position) =>
      priorInactive.has(id) ? [{ id, position }] : [],
    );
    return {
      ok: true,
      filters: { ...desired, genreIds: desired.genreIds.filter((id) => !priorInactive.has(id)) },
      inactiveGenres,
    };
  }

  if (desired.genreIds.length === 0) {
    return {
      ok: true, filters: desired, inactiveGenres: [],
      mediaChange: { from: state.filters.mediaType, to: desired.mediaType,
        deactivatedGenreIds: [], restoredGenreIds: [], genreScopes: { movie: [], tv: [] } },
    };
  }
  if (catalogs === undefined) return { ok: false, reason: 'genre-catalogs-required' };
  const parsed = GenreCatalogsSchema.safeParse(catalogs);
  if (!parsed.success) return { ok: false, reason: 'invalid-genre-catalogs' };
  const movieIds = new Set(parsed.data.movie.map((genre) => genre.id));
  const tvIds = new Set(parsed.data.tv.map((genre) => genre.id));
  if (desired.genreIds.some((id) => !movieIds.has(id) && !tvIds.has(id))) {
    return { ok: false, reason: 'unknown-genre' };
  }

  const genreIds: number[] = [];
  const inactiveGenres: InactiveGenre[] = [];
  desired.genreIds.forEach((id, position) => {
    const compatible = desired.mediaType === 'all' ||
      (desired.mediaType === 'movie' ? movieIds.has(id) : tvIds.has(id));
    if (compatible) genreIds.push(id);
    else inactiveGenres.push({ id, position });
  });
  return {
    ok: true,
    filters: { ...desired, genreIds },
    inactiveGenres,
    mediaChange: {
      from: state.filters.mediaType,
      to: desired.mediaType,
      deactivatedGenreIds: inactiveGenres.filter((genre) => !priorInactive.has(genre.id)).map((genre) => genre.id),
      restoredGenreIds: genreIds.filter((id) => priorInactive.has(id)),
      genreScopes: {
        movie: genreIds.filter((id) => movieIds.has(id)),
        tv: genreIds.filter((id) => tvIds.has(id)),
      },
    },
  };
}
