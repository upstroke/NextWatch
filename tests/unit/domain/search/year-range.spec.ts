import { describe, expect, it } from 'vitest';
import { applyIntent } from '@lib/domain/search/apply-intent';
import { SearchStateSchema } from '@lib/schemas/search-state';

function populatedState() {
  return SearchStateSchema.parse({
    mode: 'discover',
    revision: 0,
    filters: { minYear: 2000, maxYear: 2020, minRating: 7 },
  });
}

describe('year range intent application', () => {
  // Branch coverage: invalid final ranges reject all changes without advancing revision.
  it.each([
    { field: 'minYear', operation: 'set', value: 2021 },
    { field: 'maxYear', operation: 'set', value: 1999 },
  ])('rejects an incompatible $field update atomically', (yearChange) => {
    const state = populatedState();
    const snapshot = structuredClone(state);
    expect(
      applyIntent(state, {
        status: 'ready',
        baseRevision: 0,
        changes: [{ field: 'minRating', operation: 'set', value: 8 }, yearChange],
      }),
    ).toEqual({ status: 'rejected', reason: 'invalid-value', field: 'maxYear' });
    expect(state).toEqual(snapshot);
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
  ])('moves both bounds in one intent: %j', (first, second) => {
    const state = populatedState();
    const snapshot = structuredClone(state);
    expect(
      applyIntent(state, {
        status: 'ready',
        baseRevision: 0,
        changes: [first, second],
      }),
    ).toMatchObject({
      status: 'applied',
      state: {
        revision: 1,
        filters: { minYear: 2030, maxYear: 2040 },
      },
    });
    expect(state).toEqual(snapshot);
  });

  // Statement coverage: removing either bound preserves the other and opens the range.
  it.each(['minYear', 'maxYear'])('removes %s to produce an open range', (field) => {
    const result = applyIntent(populatedState(), {
      status: 'ready',
      baseRevision: 0,
      changes: [{ field, operation: 'remove', value: undefined }],
    });
    expect(result.status).toBe('applied');
    if (result.status !== 'applied') throw new Error('Expected an applied intent');
    expect(result.state.filters).not.toHaveProperty(field);
    expect(result.state.filters).toMatchObject(
      field === 'minYear' ? { maxYear: 2020 } : { minYear: 2000 },
    );
  });
});
