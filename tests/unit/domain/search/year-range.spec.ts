import { describe, expect, it } from 'vitest';
import { applyIntent } from '@lib/domain/search/apply-intent';
import { SearchFiltersSchema } from '@lib/schemas/search';

describe('year range intent application', () => {
  // Branch coverage: either bound can invalidate the resulting range; no changes leak.
  it.each([
    { field: 'minYear', operation: 'set', value: 2021 },
    { field: 'maxYear', operation: 'set', value: 1999 },
  ])('rejects an incompatible $field update atomically', (yearChange) => {
    const filters = SearchFiltersSchema.parse({ minYear: 2000, maxYear: 2020, minRating: 7 });
    const snapshot = SearchFiltersSchema.parse(filters);

    expect(applyIntent(filters, {
      status: 'ready', baseRevision: 0,
      changes: [{ field: 'minRating', operation: 'set', value: 8 }, yearChange],
    }, 0)).toEqual({ status: 'rejected', reason: 'invalid-value', field: 'maxYear' });
    expect(filters).toEqual(snapshot);
  });

  // Branch coverage: only the final range matters, regardless of intermediate bounds.
  it.each([
    [
      { field: 'minYear', operation: 'set', value: 2030 },
      { field: 'maxYear', operation: 'set', value: 2040 },
    ],
    [
      { field: 'maxYear', operation: 'set', value: 2040 },
      { field: 'minYear', operation: 'set', value: 2030 },
    ],
  ])('moves both bounds in one atomic intent: %j', (first, second) => {
    const filters = SearchFiltersSchema.parse({ minYear: 2000, maxYear: 2020 });
    const snapshot = SearchFiltersSchema.parse(filters);

    expect(applyIntent(filters, {
      status: 'ready', baseRevision: 0, changes: [first, second],
    }, 0)).toMatchObject({ status: 'applied', filters: { minYear: 2030, maxYear: 2040 } });
    expect(filters).toEqual(snapshot);
  });

  // Statement coverage: removing either bound preserves the other and opens the range.
  it.each(['minYear', 'maxYear'])('removes %s to produce an open range', (field) => {
    const filters = SearchFiltersSchema.parse({ minYear: 2000, maxYear: 2020 });
    const result = applyIntent(filters, {
      status: 'ready', baseRevision: 0, changes: [{ field, operation: 'remove' }],
    }, 0);

    expect(result.status).toBe('applied');
    if (result.status !== 'applied') throw new Error('Expected an applied intent');
    expect(result.filters).not.toHaveProperty(field);
    expect(result.filters).toMatchObject(field === 'minYear' ? { maxYear: 2020 } : { minYear: 2000 });
  });
});
