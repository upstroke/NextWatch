import { describe, expect, it } from 'vitest';
import type { FilterOperation } from '@lib/schemas/chat';
import { ActiveSearchFiltersSchema, SearchStateSchema } from '@lib/schemas/search-state';
import {
  SEARCH_FILTER_CATALOG,
  getSearchFilterDefinition,
  isCatalogFilterField,
  supportsFilterOperation,
} from '@lib/domain/search/filter-catalog';
import { applyIntent } from '@lib/domain/search/apply-intent';

const operations: FilterOperation[] = ['set', 'replace', 'add', 'remove'];

describe('search filter catalog', () => {
  // Statement coverage: the catalog stays aligned with the active-state contract.
  it('covers every active field and reuses its value schema', () => {
    expect(Object.keys(SEARCH_FILTER_CATALOG).sort()).toEqual(
      Object.keys(ActiveSearchFiltersSchema.shape).sort(),
    );
    for (const [field, schema] of Object.entries(ActiveSearchFiltersSchema.shape)) {
      expect(getSearchFilterDefinition(field)?.valueSchema).toBe(schema);
    }
  });

  // Branch coverage: only own fields are recognized, not prototype properties.
  it.each(['director', 'constructor', '__proto__', 'toString'])(
    'rejects the unknown field %s', (field) => {
      expect(isCatalogFilterField(field)).toBe(false);
      expect(getSearchFilterDefinition(field)).toBeUndefined();
      expect(supportsFilterOperation(field, 'set')).toBe(false);
    },
  );

  // Statement coverage: all active ID lists advertise the four list operations.
  it.each(['genreIds', 'keywordIds', 'personIds'])('describes list field %s', (field) => {
    expect(isCatalogFilterField(field)).toBe(true);
    expect(getSearchFilterDefinition(field)?.kind).toBe('list');
    for (const operation of operations) expect(supportsFilterOperation(field, operation)).toBe(true);
  });

  // Branch coverage: required scalar fields cannot be removed or appended to.
  it.each(['mediaType', 'sortBy'])('protects required scalar field %s', (field) => {
    expect(getSearchFilterDefinition(field)?.kind).toBe('scalar');
    expect(supportsFilterOperation(field, 'set')).toBe(true);
    expect(supportsFilterOperation(field, 'replace')).toBe(true);
    expect(supportsFilterOperation(field, 'remove')).toBe(false);
    expect(supportsFilterOperation(field, 'add')).toBe(false);
  });

  // Branch coverage: only optional scalar filters allow removal.
  it.each(['minRating', 'minYear', 'maxYear'])('allows clearing optional field %s', (field) => {
    expect(supportsFilterOperation(field, 'set')).toBe(true);
    expect(supportsFilterOperation(field, 'replace')).toBe(true);
    expect(supportsFilterOperation(field, 'remove')).toBe(true);
    expect(supportsFilterOperation(field, 'add')).toBe(false);
  });

  // Branch coverage: catalog support does not authorize person-ID changes from chat intents.
  it.each(operations)('rejects person-ID operation %s from a chat intent atomically', (operation) => {
    const state = SearchStateSchema.parse({
      mode: 'discover', revision: 3,
      filters: { genreIds: [878], personIds: [501] },
      pendingQueries: { personQueries: ['Brad Pitt'] },
    });
    const snapshot = structuredClone(state);
    expect(applyIntent(state, {
      status: 'ready', baseRevision: 3,
      changes: [
        { field: 'genreIds', operation: 'add', value: [28] },
        { field: 'personIds', operation, value: [502] },
      ],
    })).toEqual({ status: 'rejected', reason: 'unknown-field', field: 'personIds' });
    expect(state).toEqual(snapshot);
  });
});
