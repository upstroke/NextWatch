import { describe, expect, it } from 'vitest';
import type { ChatIntent, FilterChange } from '@lib/schemas/chat';
import { SearchFiltersSchema } from '@lib/schemas/search';
import type { SearchFilters } from '@lib/schemas/search';
import { applyIntent } from '@lib/domain/search';

const emptyFilters: SearchFilters = SearchFiltersSchema.parse({});

/**
 * Builds a ready chat intent with the given changes and base revision.
 * @param changes Filter changes proposed by the parser.
 * @param baseRevision Revision the intent was created against.
 * @returns A chat intent with status ready.
 */
function readyIntent(changes: FilterChange[], baseRevision = 0): ChatIntent {
  return {
    status: 'ready',
    baseRevision,
    changes,
  };
}

/**
 * Builds a single filter change.
 * @param field Target filter field.
 * @param operation Filter operation.
 * @param value Change value.
 * @returns A filter change for a chat intent.
 */
function change(
  field: string,
  operation: FilterChange['operation'],
  value: unknown,
): FilterChange {
  return { field, operation, value };
}

describe('applyIntent', () => {
  // Statement coverage: a valid ready intent applies all changes and returns new filters
  it('applies valid changes and preserves untouched filters', () => {
    const filters: SearchFilters = SearchFiltersSchema.parse({
      mediaType: 'movie',
      genreIds: [28],
      minRating: 7,
    });

    const result = applyIntent(
      filters,
      readyIntent([change('minRating', 'set', 8.5), change('keywordIds', 'add', [301])]),
      0,
    );

    expect(result).toEqual({
      status: 'applied',
      filters: {
        mediaType: 'movie',
        genreIds: [28],
        keywordIds: [301],
        minRating: 8.5,
        sortBy: 'popularity.desc',
      },
    });
  });

  // Branch coverage: the input filters object is never mutated
  it('never mutates the original filters object', () => {
    const filters: SearchFilters = SearchFiltersSchema.parse({ genreIds: [28] });
    const snapshot = JSON.stringify(filters);

    applyIntent(filters, readyIntent([change('genreIds', 'add', [12])]), 0);

    expect(JSON.stringify(filters)).toBe(snapshot);
  });

  // Branch coverage: add merges without duplicates
  it('merges add operations without duplicates', () => {
    const result = applyIntent(
      SearchFiltersSchema.parse({ keywordIds: [301] }),
      readyIntent([change('keywordIds', 'add', [301, 402])]),
      0,
    );

    expect(result).toMatchObject({ status: 'applied', filters: { keywordIds: [301, 402] } });
  });

  // Branch coverage: remove deletes only the listed ids
  it('removes only the listed ids', () => {
    const result = applyIntent(
      SearchFiltersSchema.parse({ keywordIds: [301, 402] }),
      readyIntent([change('keywordIds', 'remove', [301])]),
      0,
    );

    expect(result).toMatchObject({ status: 'applied', filters: { keywordIds: [402] } });
  });

  // Branch coverage: set and replace exchange the entire list
  it('replaces the entire list for set and replace', () => {
    const setResult = applyIntent(
      SearchFiltersSchema.parse({ genreIds: [28, 35] }),
      readyIntent([change('genreIds', 'set', [878])]),
      0,
    );
    const replaceResult = applyIntent(
      SearchFiltersSchema.parse({ genreIds: [28, 35] }),
      readyIntent([change('genreIds', 'replace', [878])]),
      0,
    );

    expect(setResult).toMatchObject({ status: 'applied', filters: { genreIds: [878] } });
    expect(replaceResult).toMatchObject({ status: 'applied', filters: { genreIds: [878] } });
  });

  // Branch coverage: remove clears optional scalar filters
  it('clears optional scalar filters on remove', () => {
    const result = applyIntent(
      SearchFiltersSchema.parse({ minRating: 7.5, minYear: 2000 }),
      readyIntent([change('minRating', 'remove', undefined)]),
      0,
    );

    expect(result.status).toBe('applied');
    if (result.status !== 'applied') throw new Error('unreachable');
    expect('minRating' in result.filters).toBe(false);
    expect(result.filters.minYear).toBe(2000);
  });

  // Statement coverage: minYear and maxYear accept integer values
  it('sets minYear and maxYear with integer values', () => {
    const result = applyIntent(
      emptyFilters,
      readyIntent([change('minYear', 'set', 2000), change('maxYear', 'set', 2010)]),
      0,
    );

    expect(result).toMatchObject({
      status: 'applied',
      filters: { minYear: 2000, maxYear: 2010 },
    });
  });

  // Branch coverage: remove works for every optional scalar field
  it('clears minYear and maxYear on remove', () => {
    const result = applyIntent(
      SearchFiltersSchema.parse({ minYear: 2000, maxYear: 2010 }),
      readyIntent([change('minYear', 'remove', undefined), change('maxYear', 'remove', undefined)]),
      0,
    );

    expect(result.status).toBe('applied');
    if (result.status !== 'applied') throw new Error('unreachable');
    expect('minYear' in result.filters).toBe(false);
    expect('maxYear' in result.filters).toBe(false);
  });

  // Branch coverage: set with undefined value rejects the change
  it('rejects scalar set operations with undefined value', () => {
    const result = applyIntent(
      emptyFilters,
      readyIntent([change('minRating', 'set', undefined)]),
      0,
    );

    expect(result).toEqual({
      status: 'rejected',
      reason: 'invalid-value',
      field: 'minRating',
    });
  });

  // Branch coverage: wrong value types reject the change before the schema
  it('rejects scalar values with the wrong type', () => {
    const result = applyIntent(
      emptyFilters,
      readyIntent([change('mediaType', 'set', 42)]),
      0,
    );

    expect(result).toEqual({
      status: 'rejected',
      reason: 'invalid-value',
      field: 'mediaType',
    });
  });

  // Branch coverage: list fields reject values that are not arrays
  it('rejects list values that are not arrays', () => {
    const result = applyIntent(
      emptyFilters,
      readyIntent([change('keywordIds', 'set', 301)]),
      0,
    );

    expect(result).toEqual({
      status: 'rejected',
      reason: 'invalid-value',
      field: 'keywordIds',
    });
  });

  // Branch coverage: a stale revision rejects the intent
  it('rejects a stale revision', () => {
    const result = applyIntent(emptyFilters, readyIntent([change('minRating', 'set', 8)], 1), 2);

    expect(result).toEqual({ status: 'rejected', reason: 'stale-revision' });
  });

  // Branch coverage: unknown fields are rejected
  it('rejects unknown fields', () => {
    const result = applyIntent(
      emptyFilters,
      readyIntent([change('director', 'set', 'Nolan')]),
      0,
    );

    expect(result).toEqual({
      status: 'rejected',
      reason: 'unknown-field',
      field: 'director',
    });
  });

  // Branch coverage: add is not a valid operation for scalar fields
  it('rejects invalid operations for scalar fields', () => {
    const result = applyIntent(
      emptyFilters,
      readyIntent([change('minRating', 'add', 8)]),
      0,
    );

    expect(result).toEqual({
      status: 'rejected',
      reason: 'invalid-operation',
      field: 'minRating',
    });
  });

  // Branch coverage: remove is not valid for fields with defaults
  it('rejects remove for fields with defaults', () => {
    const result = applyIntent(
      emptyFilters,
      readyIntent([change('mediaType', 'remove', undefined)]),
      0,
    );

    expect(result).toEqual({
      status: 'rejected',
      reason: 'invalid-operation',
      field: 'mediaType',
    });
  });

  // Branch coverage: values that violate the schema reject the whole intent
  it('rejects values that violate the filter schema', () => {
    const result = applyIntent(
      emptyFilters,
      readyIntent([change('minRating', 'set', 42)]),
      0,
    );

    expect(result).toEqual({
      status: 'rejected',
      reason: 'invalid-value',
      field: 'minRating',
    });
  });

  // Branch coverage: the keyword limit is enforced through the schema
  it('rejects changes that exceed the keyword limit', () => {
    const result = applyIntent(
      SearchFiltersSchema.parse({ keywordIds: [301, 402] }),
      readyIntent([change('keywordIds', 'add', [550, 660])]),
      0,
    );

    expect(result).toEqual({
      status: 'rejected',
      reason: 'invalid-value',
      field: 'keywordIds',
    });
  });

  // Branch coverage: an invalid change leaves the original state untouched
  it('applies nothing when one change is invalid', () => {
    const filters: SearchFilters = SearchFiltersSchema.parse({ genreIds: [28] });

    const result = applyIntent(
      filters,
      readyIntent([change('minRating', 'set', 8), change('keywordIds', 'set', ['301'])]),
      0,
    );

    expect(result).toMatchObject({ status: 'rejected', reason: 'invalid-value' });
    expect(filters.genreIds).toEqual([28]);
  });

  // Branch coverage: needs_clarification leaves the search unchanged
  it('returns the clarification requirement without changing filters', () => {
    const result = applyIntent(
      emptyFilters,
      {
        status: 'needs_clarification',
        baseRevision: 0,
        changes: [],
        clarification: { questionKey: 'keyword-ambiguous', options: ['Inception', 'Interstellar'] },
      },
      0,
    );

    expect(result).toEqual({
      status: 'unchanged',
      reason: 'clarification',
      clarification: { questionKey: 'keyword-ambiguous', options: ['Inception', 'Interstellar'] },
    });
  });

  // Branch coverage: unsupported and error intents change nothing
  it('changes nothing for unsupported and error intents', () => {
    const unsupported = applyIntent(
      emptyFilters,
      { status: 'unsupported', baseRevision: 0, changes: [] },
      0,
    );
    const error = applyIntent(
      emptyFilters,
      { status: 'error', baseRevision: 0, changes: [] },
      0,
    );

    expect(unsupported).toEqual({ status: 'unchanged', reason: 'unsupported' });
    expect(error).toEqual({ status: 'unchanged', reason: 'error-status' });
  });

  // Branch coverage: ineffective changes are reported without a new search trigger
  it('reports ineffective changes as unchanged', () => {
    const filters: SearchFilters = SearchFiltersSchema.parse({ minRating: 7 });

    const result = applyIntent(
      filters,
      readyIntent([change('minRating', 'set', 7)]),
      0,
    );

    expect(result).toEqual({ status: 'unchanged', reason: 'no-effective-change' });
  });

  // Branch coverage: unchanged id lists are compared element by element
  it('reports unchanged id lists as no effective change', () => {
    const filters: SearchFilters = SearchFiltersSchema.parse({
      keywordIds: [301],
      genreIds: [28],
    });

    const result = applyIntent(
      filters,
      readyIntent([
        change('keywordIds', 'set', [301]),
        change('genreIds', 'set', [28]),
      ]),
      0,
    );

    expect(result).toEqual({ status: 'unchanged', reason: 'no-effective-change' });
  });

  // Branch coverage: intents that fail the intent schema are rejected
  it('rejects intents that violate the intent schema', () => {
    const result = applyIntent(
      emptyFilters,
      { status: 'ready', baseRevision: -1, changes: [] },
      0,
    );

    expect(result).toEqual({ status: 'rejected', reason: 'invalid-intent' });
  });

  // Branch coverage: the corrected sort value is accepted
  it('accepts the corrected vote_average sort value', () => {
    const result = applyIntent(
      emptyFilters,
      readyIntent([change('sortBy', 'set', 'vote_average.desc')]),
      0,
    );

    expect(result).toMatchObject({
      status: 'applied',
      filters: { sortBy: 'vote_average.desc' },
    });
  });
});
