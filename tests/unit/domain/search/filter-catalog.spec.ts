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
  // Statement coverage: catalog completeness and shared schemas prevent parallel field definitions.
  it('covers every technical filter field and reuses its value schema', () => {
    expect(Object.keys(SEARCH_FILTER_CATALOG).sort()).toEqual(
      Object.keys(ActiveSearchFiltersSchema.shape).sort(),
    );
    for (const [field, schema] of Object.entries(ActiveSearchFiltersSchema.shape))
      expect(getSearchFilterDefinition(field)?.valueSchema).toBe(schema);
  });
  // Branch coverage: own-field lookup excludes prototype properties and accepted-person state.
  it.each(['director', 'people', 'constructor', '__proto__', 'toString'])(
    'rejects the unknown field %s',
    (field) => {
      expect(isCatalogFilterField(field)).toBe(false);
      expect(getSearchFilterDefinition(field)).toBeUndefined();
      expect(supportsFilterOperation(field, 'set')).toBe(false);
    },
  );
  // Statement coverage: technical ID-list operations do not authorize chat person changes.
  it.each(['genreIds', 'keywordIds', 'personIds'])('describes list field %s', (field) => {
    expect(isCatalogFilterField(field)).toBe(true);
    expect(getSearchFilterDefinition(field)?.kind).toBe('list');
    for (const operation of operations)
      expect(supportsFilterOperation(field, operation)).toBe(true);
  });
  // Branch coverage: required scalars cannot be removed or appended to.
  it.each(['mediaType', 'sortBy'])('protects required scalar field %s', (field) => {
    expect(getSearchFilterDefinition(field)?.kind).toBe('scalar');
    expect(supportsFilterOperation(field, 'set')).toBe(true);
    expect(supportsFilterOperation(field, 'replace')).toBe(true);
    expect(supportsFilterOperation(field, 'remove')).toBe(false);
    expect(supportsFilterOperation(field, 'add')).toBe(false);
  });
  // Branch coverage: optional scalars support removal but not append.
  it.each(['minRating', 'minYear', 'maxYear'])('allows clearing optional field %s', (field) => {
    expect(supportsFilterOperation(field, 'set')).toBe(true);
    expect(supportsFilterOperation(field, 'replace')).toBe(true);
    expect(supportsFilterOperation(field, 'remove')).toBe(true);
    expect(supportsFilterOperation(field, 'add')).toBe(false);
  });
  // Branch coverage: neither derived IDs nor accepted-person records can be edited by chat.
  it.each(operations)('rejects person changes for operation %s atomically', (operation) => {
    for (const field of ['personIds', 'people']) {
      const state = SearchStateSchema.parse({
        mode: 'discover',
        revision: 3,
        filters: { genreIds: [878] },
        people: [{ id: 501, name: 'Example person' }],
        pendingQueries: {
          personQueries: [{ ref: 'p', query: 'Another person', operation: 'add' }],
        },
      });
      const snapshot = structuredClone(state);
      const value = field === 'personIds' ? [502] : [{ id: 502, name: 'Other person' }];
      expect(
        applyIntent(state, {
          status: 'ready',
          baseRevision: 3,
          changes: [
            { field: 'genreIds', operation: 'add', value: [28] },
            { field, operation, value },
          ],
        }),
      ).toEqual({ status: 'rejected', reason: 'unknown-field', field });
      expect(state).toEqual(snapshot);
    }
  });
});
