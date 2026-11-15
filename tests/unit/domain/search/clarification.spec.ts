import { describe, expect, it } from 'vitest';
import { applyIntent } from '@lib/domain/search/apply-intent';
import { SearchStateSchema } from '@lib/schemas/search-state';

const clarification = { questionKey: 'keyword-ambiguous', options: ['Time travel'] };

function populatedState() {
  return SearchStateSchema.parse({
    mode: 'discover', revision: 2,
    filters: { genreIds: [878], minRating: 7 },
    people: [{ id: 501, name: 'Example person' }],
    pendingQueries: { personQueries: ['Another person'], keywordQueries: ['space'] },
  });
}

describe('clarification intent application', () => {
  // Branch coverage: every structurally valid status is subject to the state revision guard.
  it.each(['ready', 'needs_clarification', 'unsupported', 'error'])(
    'rejects stale %s intents without changing state', (status) => {
      const state = populatedState();
      const snapshot = structuredClone(state);
      const intent = status === 'needs_clarification'
        ? { status, baseRevision: 1, changes: [], clarification }
        : { status, baseRevision: 1, changes: [] };
      expect(applyIntent(state, intent)).toEqual({ status: 'rejected', reason: 'stale-revision' });
      expect(state).toEqual(snapshot);
    },
  );

  // Statement coverage: semantic clarification is returned separately from preserved criteria and people.
  it('returns clarification without changing criteria, people, mode or revision', () => {
    const state = populatedState();
    const snapshot = structuredClone(state);
    expect(applyIntent(state, {
      status: 'needs_clarification', baseRevision: 2, changes: [], clarification,
    })).toEqual({ status: 'unchanged', reason: 'clarification', clarification });
    expect(state).toEqual(snapshot);
  });

  // Branch coverage: malformed model output is rejected before stale-response classification.
  it('rejects malformed clarification before checking revision', () => {
    const state = populatedState();
    const snapshot = structuredClone(state);
    expect(applyIntent(state, {
      status: 'needs_clarification', baseRevision: 1, changes: [],
    })).toEqual({ status: 'rejected', reason: 'invalid-intent' });
    expect(state).toEqual(snapshot);
  });

  // Branch coverage: unsupported and technical-error statuses are not semantic clarification.
  it.each([
    { status: 'unsupported', reason: 'unsupported' },
    { status: 'error', reason: 'error-status' },
  ])('preserves state for $status', ({ status, reason }) => {
    const state = populatedState();
    const snapshot = structuredClone(state);
    expect(applyIntent(state, { status, baseRevision: 2, changes: [] }))
      .toEqual({ status: 'unchanged', reason });
    expect(state).toEqual(snapshot);
  });
});
