import { describe, expect, it } from 'vitest';
import { validatePersonSelection } from '@lib/domain/search/validate-person-selection';
import { SearchStateSchema } from '@lib/schemas/search-state';
import type { SearchState } from '@lib/schemas/search-state';

function populatedState(operation: 'add' | 'replace' = 'add') {
  const request =
    operation === 'add'
      ? { ref: 'p', query: 'Ambiguous person', operation }
      : { ref: 'p', query: 'Ambiguous replacement', operation, targetPersonId: 501 };
  return SearchStateSchema.parse({
    mode: 'discover',
    revision: 4,
    filters: { genreIds: [878], keywordIds: [100], minRating: 7 },
    people: [{ id: 501, name: 'Accepted person' }],
    pendingQueries: {
      personQueries: [request, { ref: 'other', query: 'Other person', operation: 'add' }],
      keywordQueries: [{ ref: 'k', query: 'space' }],
    },
  });
}

function question() {
  return {
    kind: 'person-selection',
    clarificationRef: 'question-1',
    ref: 'p',
    sourceRevision: 4,
    candidates: [
      { id: 502, name: 'First candidate' },
      {
        id: 503,
        name: 'Selected candidate',
        knownFor: [{ title: 'Example movie', mediaType: 'movie', year: 2018 }],
      },
    ],
    hasMore: true,
  };
}

function answer() {
  return { clarificationRef: 'question-1', ref: 'p', sourceRevision: 4, personId: 503 };
}

function expectRejection(
  state: SearchState,
  activeQuestion: unknown,
  input: unknown,
  reason: string,
) {
  const snapshot = structuredClone({ state, activeQuestion, input });
  expect(validatePersonSelection(state, activeQuestion, input)).toEqual({
    status: 'rejected',
    reason,
  });
  expect({ state, activeQuestion, input }).toEqual(snapshot);
}

describe('person selection validation', () => {
  // Statement coverage: additions and replacements validate only the selected candidate without accepting an identity.
  it.each(['add', 'replace'] satisfies ('add' | 'replace')[])(
    'validates an offered candidate for a pending %s without changing any input',
    (operation) => {
      const state = populatedState(operation);
      const activeQuestion = question();
      const input = answer();
      const snapshot = structuredClone({ state, activeQuestion, input });
      expect(validatePersonSelection(state, activeQuestion, input)).toEqual({
        status: 'validated',
        clarificationRef: 'question-1',
        ref: 'p',
        sourceRevision: 4,
        candidate: {
          id: 503,
          name: 'Selected candidate',
          knownFor: [{ title: 'Example movie', mediaType: 'movie', year: 2018 }],
        },
      });
      expect({ state, activeQuestion, input }).toEqual(snapshot);
    },
  );

  // Branch coverage: an answer cannot recreate a question that is no longer active.
  it.each([null, undefined])('rejects an absent active question: %s', (activeQuestion) => {
    expectRejection(populatedState(), activeQuestion, answer(), 'no-active-clarification');
  });

  // Branch coverage: malformed or duplicate-candidate stored questions fail closed before answer association.
  it.each([{}, { ...question(), candidates: [{ id: 502, name: 'A' }, { id: 502, name: 'B' }] }])(
    'rejects an invalid active question: %j',
    (activeQuestion) => {
      expectRejection(populatedState(), activeQuestion, answer(), 'invalid-clarification');
    },
  );

  // Branch coverage: malformed or overposted answers are rejected at the untrusted input boundary.
  it.each([{}, { ...answer(), person: { id: 503, name: 'Injected name' } }])(
    'rejects an invalid answer: %j',
    (input) => {
      expectRejection(populatedState(), question(), input, 'invalid-answer');
    },
  );

  // Branch coverage: both sides must match current revision, including internally matching but outdated pairs.
  it.each([
    { questionRevision: 3, answerRevision: 4 },
    { questionRevision: 4, answerRevision: 3 },
    { questionRevision: 3, answerRevision: 3 },
    { questionRevision: 5, answerRevision: 4 },
    { questionRevision: 4, answerRevision: 5 },
  ])('rejects non-current revisions: %j', ({ questionRevision, answerRevision }) => {
    expectRejection(
      populatedState(),
      { ...question(), sourceRevision: questionRevision },
      { ...answer(), sourceRevision: answerRevision },
      'stale-revision',
    );
  });

  // Branch coverage: an old candidate group or a different pending person cannot answer the current question.
  it.each([{ clarificationRef: 'previous-group' }, { ref: 'other' }])(
    'rejects a mismatched answer binding: %j',
    (binding) => {
      expectRejection(populatedState(), question(), { ...answer(), ...binding }, 'question-mismatch');
    },
  );

  // Branch coverage: matching question/answer references must still identify an existing person request, not a keyword.
  it.each(['missing', 'k'])('rejects unavailable or wrong-kind pending reference %s', (ref) => {
    expectRejection(
      populatedState(),
      { ...question(), ref },
      { ...answer(), ref },
      'unknown-request',
    );
  });

  // Branch coverage: neither an arbitrary ID nor an already accepted but unoffered ID is a valid selection.
  it.each([999, 501])('rejects unoffered candidate %i', (personId) => {
    expectRejection(populatedState(), question(), { ...answer(), personId }, 'candidate-not-offered');
  });

  // Statement coverage: returned candidate data is isolated from the stored question and the accepted state.
  it('returns an independent candidate record with independent known titles', () => {
    const state = populatedState();
    const activeQuestion = question();
    const input = answer();
    const snapshot = structuredClone({ state, activeQuestion, input });
    const result = validatePersonSelection(state, activeQuestion, input);
    expect(result.status).toBe('validated');
    if (result.status !== 'validated') throw new Error('Expected a validated candidate');
    result.candidate.name = 'Changed';
    result.candidate.knownFor.push({ title: 'Another title', mediaType: 'tv' });
    expect({ state, activeQuestion, input }).toEqual(snapshot);
  });
});
