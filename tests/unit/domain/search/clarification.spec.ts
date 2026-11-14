import { describe, expect, it } from 'vitest';
import { applyIntent } from '@lib/domain/search/apply-intent';
import { SearchFiltersSchema } from '@lib/schemas/search';

const clarification = { questionKey: 'keyword-ambiguous', options: ['Time travel'] };

describe('clarification intent application', () => {
  it.each(['ready', 'needs_clarification', 'unsupported', 'error'])(
    'rejects stale %s intents without changing filters',
    (status) => {
      // Branch coverage: every valid status is subject to the revision guard.
      const filters = SearchFiltersSchema.parse({ genreIds: [28], minRating: 7 });
      const snapshot = SearchFiltersSchema.parse(filters);
      const intent = status === 'needs_clarification'
        ? { status, baseRevision: 1, changes: [], clarification }
        : { status, baseRevision: 1, changes: [] };

      expect(applyIntent(filters, intent, 2)).toEqual({
        status: 'rejected', reason: 'stale-revision',
      });
      expect(filters).toEqual(snapshot);
    },
  );

  it('returns required clarification data and preserves populated filters', () => {
    // Statement coverage: valid current clarification is usable without state mutation.
    const filters = SearchFiltersSchema.parse({ keywordIds: [301], minRating: 7 });
    const snapshot = SearchFiltersSchema.parse(filters);
    const result = applyIntent(filters, {
      status: 'needs_clarification', baseRevision: 2, changes: [], clarification,
    }, 2);

    expect(result).toEqual({ status: 'unchanged', reason: 'clarification', clarification });
    if (result.status !== 'unchanged' || result.reason !== 'clarification') {
      throw new Error('Expected a clarification result');
    }
    expect(result.clarification.questionKey).toBe('keyword-ambiguous');
    expect(filters).toEqual(snapshot);
  });

  it('maps an invalid status payload before checking its revision', () => {
    // Branch coverage: malformed stale input is invalid, not an actionable question.
    const filters = SearchFiltersSchema.parse({ minRating: 7 });
    const snapshot = SearchFiltersSchema.parse(filters);

    expect(applyIntent(filters, {
      status: 'needs_clarification', baseRevision: 1, changes: [],
    }, 2)).toEqual({ status: 'rejected', reason: 'invalid-intent' });
    expect(filters).toEqual(snapshot);
  });
});
