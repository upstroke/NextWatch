import { describe, expect, it } from 'vitest';
import { SearchFiltersSchema } from '@lib/schemas/search';

describe('search year range', () => {
  // Branch coverage: closed, single-year and open ranges are supported.
  it.each([
    { minYear: 2000, maxYear: 2020 },
    { minYear: 2020, maxYear: 2020 },
    { minYear: 2000 },
    { maxYear: 2020 },
    {},
  ])('accepts the supported range %j', (range) => {
    expect(SearchFiltersSchema.parse(range)).toMatchObject(range);
  });

  // Branch coverage: reversed bounds produce a field-specific domain error.
  it('rejects reversed bounds at maxYear', () => {
    const result = SearchFiltersSchema.safeParse({ minYear: 2020, maxYear: 2000 });

    expect(result.success).toBe(false);
    if (result.success) throw new Error('Expected an invalid year range');
    expect(result.error.issues).toEqual([
      expect.objectContaining({ code: 'custom', path: ['maxYear'] }),
    ]);
  });
});
