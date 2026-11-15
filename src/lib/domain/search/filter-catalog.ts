import type { FilterOperation } from '@lib/schemas/chat';
import { ActiveSearchFiltersSchema } from '@lib/schemas/search-state';
import type { ActiveSearchFilters } from '@lib/schemas/search-state';

export type CatalogFilterField = keyof ActiveSearchFilters;

type ActiveFilterSchemas = typeof ActiveSearchFiltersSchema.shape;

/**
 * Describes one catalog entry.
 * Number-array fields are lists; all other fields are scalars.
 */
type FilterDefinition<Field extends CatalogFilterField> = {
  kind: ActiveSearchFilters[Field] extends number[] ? 'list' : 'scalar';
  operations: readonly FilterOperation[];
  valueSchema: ActiveFilterSchemas[Field];
};

/** Requires a matching catalog entry for every active filter field. */
type SearchFilterCatalog = {
  [Field in CatalogFilterField]-?: FilterDefinition<Field>;
};

const listOperations: readonly FilterOperation[] = ['set', 'replace', 'add', 'remove'];
const scalarOperations: readonly FilterOperation[] = ['set', 'replace'];
const optionalScalarOperations: readonly FilterOperation[] = ['set', 'replace', 'remove'];

/** Version of the supported field and operation catalog, not a TMDb API version. */
export const SEARCH_FILTER_CATALOG_VERSION = 1;

/**
 * Static active-filter capabilities. Value schemas are reused rather than
 * duplicating ranges, defaults or list limits. Cross-field validation stays
 * in ActiveSearchFiltersSchema. Entries do not establish ID provenance,
 * mediatype compatibility or permission to execute a TMDb request.
 */
export const SEARCH_FILTER_CATALOG = {
  mediaType: {
    kind: 'scalar',
    operations: scalarOperations,
    valueSchema: ActiveSearchFiltersSchema.shape.mediaType,
  },
  keywordIds: {
    kind: 'list',
    operations: listOperations,
    valueSchema: ActiveSearchFiltersSchema.shape.keywordIds,
  },
  genreIds: {
    kind: 'list',
    operations: listOperations,
    valueSchema: ActiveSearchFiltersSchema.shape.genreIds,
  },
  personIds: {
    kind: 'list',
    operations: listOperations,
    valueSchema: ActiveSearchFiltersSchema.shape.personIds,
  },
  minRating: {
    kind: 'scalar',
    operations: optionalScalarOperations,
    valueSchema: ActiveSearchFiltersSchema.shape.minRating,
  },
  minYear: {
    kind: 'scalar',
    operations: optionalScalarOperations,
    valueSchema: ActiveSearchFiltersSchema.shape.minYear,
  },
  maxYear: {
    kind: 'scalar',
    operations: optionalScalarOperations,
    valueSchema: ActiveSearchFiltersSchema.shape.maxYear,
  },
  sortBy: {
    kind: 'scalar',
    operations: scalarOperations,
    valueSchema: ActiveSearchFiltersSchema.shape.sortBy,
  },
} satisfies SearchFilterCatalog;

/** Checks whether a name is an own catalog field, excluding inherited object keys. */
export function isCatalogFilterField(field: string): field is CatalogFilterField {
  return Object.prototype.hasOwnProperty.call(SEARCH_FILTER_CATALOG, field);
}

/** Returns the definition for an active filter field, or undefined for unknown names. */
export function getSearchFilterDefinition(field: string) {
  return isCatalogFilterField(field) ? SEARCH_FILTER_CATALOG[field] : undefined;
}

/** Reports whether the catalog allows an operation for the supplied filter field. */
export function supportsFilterOperation(field: string, operation: FilterOperation): boolean {
  return getSearchFilterDefinition(field)?.operations.includes(operation) ?? false;
}
