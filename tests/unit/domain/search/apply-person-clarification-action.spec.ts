import { describe, expect, it } from 'vitest';
import { applyPersonClarificationAction } from '@lib/domain/search/apply-person-clarification-action';
import type { PersonClarificationAction } from '@lib/schemas/person-clarification-flow';
import { SearchStateSchema } from '@lib/schemas/search-state';
import type { SearchState } from '@lib/schemas/search-state';

type QuestionKind = 'person-selection' | 'person-no-match';

function populatedState(operation: 'add' | 'replace' = 'add') {
  const request =
    operation === 'add'
      ? { ref: 'p', query: 'Ambiguous person', operation }
      : { ref: 'p', query: 'Replacement person', operation, targetPersonId: 501 };
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

function binding() {
  return { clarificationRef: 'question-1', ref: 'p', sourceRevision: 4 };
}

function question(kind: QuestionKind = 'person-selection', hasMore = true) {
  if (kind === 'person-no-match') return { ...binding(), kind };
  return { ...binding(), kind, candidates: [{ id: 503, name: 'Candidate' }], hasMore };
}

function action(kind: PersonClarificationAction['action'] = 'remove') {
  if (kind === 'refine') return { ...binding(), action: kind, text: ' Example hint ' };
  return { ...binding(), action: kind };
}

function expectRejection(
  state: SearchState,
  activeQuestion: unknown,
  input: unknown,
  reason: string,
) {
  const snapshot = structuredClone({ state, activeQuestion, input });
  expect(applyPersonClarificationAction(state, activeQuestion, input)).toEqual({
    status: 'rejected',
    reason,
  });
  expect({ state, activeQuestion, input }).toEqual(snapshot);
}

describe('person clarification follow-up processing', () => {
  // Statement coverage: both removal meanings use real WP 009 transitions for either request context and question kind.
  it.each([
    { operation: 'add', action: 'remove', kind: 'person-selection' },
    { operation: 'add', action: 'discard-change', kind: 'person-selection' },
    { operation: 'replace', action: 'remove', kind: 'person-selection' },
    { operation: 'replace', action: 'discard-change', kind: 'person-selection' },
    { operation: 'add', action: 'remove', kind: 'person-no-match' },
    { operation: 'add', action: 'discard-change', kind: 'person-no-match' },
    { operation: 'replace', action: 'remove', kind: 'person-no-match' },
    { operation: 'replace', action: 'discard-change', kind: 'person-no-match' },
  ] satisfies {
    operation: 'add' | 'replace';
    action: 'remove' | 'discard-change';
    kind: QuestionKind;
  }[])('applies $action to $operation from $kind without losing unrelated criteria', (testCase) => {
    const state = populatedState(testCase.operation);
    const activeQuestion = question(testCase.kind);
    const input = action(testCase.action);
    const snapshot = structuredClone({ state, activeQuestion, input });
    const result = applyPersonClarificationAction(state, activeQuestion, input);
    expect(result).toEqual({
      status: 'applied',
      state: {
        ...state,
        revision: 5,
        pendingQueries: {
          ...state.pendingQueries,
          personQueries: state.pendingQueries.personQueries.filter(
            (request) => request.ref !== 'p',
          ),
        },
      },
    });
    expect({ state, activeQuestion, input }).toEqual(snapshot);
    if (result.status !== 'applied') throw new Error('Expected an applied removal');
    result.state.filters.genreIds.push(28);
    result.state.people.forEach((person) => {
      person.name = 'Changed';
    });
    result.state.pendingQueries.personQueries.forEach((request) => {
      request.query = 'Changed';
    });
    expect({ state, activeQuestion, input }).toEqual(snapshot);
  });

  // Statement coverage: hints preserve addition/replacement context and are not applied as pending-query changes.
  it.each([
    { operation: 'add', kind: 'person-selection' },
    { operation: 'replace', kind: 'person-selection' },
    { operation: 'add', kind: 'person-no-match' },
    { operation: 'replace', kind: 'person-no-match' },
  ] satisfies { operation: 'add' | 'replace'; kind: QuestionKind }[])(
    'forwards a normalized hint for $operation from $kind without changing revision',
    ({ operation, kind }) => {
      const state = populatedState(operation);
      const activeQuestion = question(kind);
      const input = action('refine');
      const snapshot = structuredClone({ state, activeQuestion, input });
      const result = applyPersonClarificationAction(state, activeQuestion, input);
      expect(result).toEqual({
        status: 'follow-up',
        action: { ...binding(), action: 'refine', text: 'Example hint' },
        request: state.pendingQueries.personQueries.find((request) => request.ref === 'p'),
      });
      if (result.status !== 'follow-up') throw new Error('Expected a follow-up');
      result.request.query = 'Changed';
      if (result.action.action === 'refine') result.action.text = 'Changed';
      expect({ state, activeQuestion, input }).toEqual(snapshot);
    },
  );

  // Statement coverage: navigation forwards a bound request without fetching candidates or changing state.
  it('forwards more-candidates only for a selection with further candidates', () => {
    const state = populatedState('replace');
    const activeQuestion = question();
    const input = action('more-candidates');
    const snapshot = structuredClone({ state, activeQuestion, input });
    expect(applyPersonClarificationAction(state, activeQuestion, input)).toEqual({
      status: 'follow-up',
      action: input,
      request: state.pendingQueries.personQueries.find((request) => request.ref === 'p'),
    });
    expect({ state, activeQuestion, input }).toEqual(snapshot);
  });

  // Branch coverage: no-match and exhausted groups cannot authorize candidate navigation.
  it.each([question('person-no-match'), question('person-selection', false)])(
    'rejects unavailable candidate navigation: %j',
    (activeQuestion) => {
      expectRejection(
        populatedState(),
        activeQuestion,
        action('more-candidates'),
        'action-unavailable',
      );
    },
  );

  // Branch coverage: absent questions cannot be reconstructed from an action payload.
  it.each([null, undefined])('rejects an absent active question: %s', (activeQuestion) => {
    expectRejection(populatedState(), activeQuestion, action(), 'no-active-clarification');
  });

  // Branch coverage: malformed questions and provider errors are not actionable semantic questions.
  it.each([{}, { kind: 'person-resolution-error', ref: 'p', sourceRevision: 4 }])(
    'rejects invalid or technical question context: %j',
    (activeQuestion) => {
      expectRejection(populatedState(), activeQuestion, action(), 'invalid-clarification');
    },
  );

  // Branch coverage: malformed or identity-bearing action payloads fail before any transition.
  it.each([{}, { ...action(), personId: 503 }])('rejects invalid action data: %j', (input) => {
    expectRejection(populatedState(), question(), input, 'invalid-action');
  });

  // Branch coverage: every action rejects stale questions, stale answers and non-current revision pairs.
  it.each([
    'refine',
    'more-candidates',
    'remove',
    'discard-change',
  ] satisfies PersonClarificationAction['action'][])(
    'enforces current revisions for %s',
    (kind) => {
      for (const [questionRevision, actionRevision] of [
        [3, 4],
        [4, 3],
        [3, 3],
        [5, 4],
        [4, 5],
      ]) {
        expectRejection(
          populatedState(),
          { ...question(), sourceRevision: questionRevision },
          { ...action(kind), sourceRevision: actionRevision },
          'stale-revision',
        );
      }
    },
  );

  // Branch coverage: a previous group and another existing person request cannot answer the active question.
  it.each([{ clarificationRef: 'old-group' }, { ref: 'other' }])(
    'rejects a mismatched action binding: %j',
    (extra) => {
      expectRejection(populatedState(), question(), { ...action(), ...extra }, 'question-mismatch');
    },
  );

  // Branch coverage: even matching bindings must identify an existing person request, never a keyword request.
  it.each(['missing', 'k'])('rejects unknown or wrong-kind request %s', (ref) => {
    expectRejection(
      populatedState(),
      { ...question(), ref },
      { ...action(), ref },
      'unknown-request',
    );
  });

  // Statement coverage: removing the only pending addition reuses WP 009 mode and revision decisions.
  it('returns to trending when the last search condition is explicitly removed', () => {
    const state = SearchStateSchema.parse({
      mode: 'discover',
      revision: 4,
      filters: {},
      pendingQueries: {
        personQueries: [{ ref: 'p', query: 'Unknown person', operation: 'add' }],
      },
    });
    const snapshot = structuredClone(state);
    const result = applyPersonClarificationAction(state, question('person-no-match'), action());
    expect(result.status).toBe('applied');
    if (result.status !== 'applied') throw new Error('Expected an applied removal');
    expect(result.state.mode).toBe('trending');
    expect(result.state.revision).toBe(5);
    expect(result.state.pendingQueries.personQueries).toEqual([]);
    expect(state).toEqual(snapshot);
  });

  // Branch coverage: an already applied removal cannot be replayed against the updated state.
  it('rejects a replayed discard without altering the resulting state', () => {
    const activeQuestion = question();
    const input = action('discard-change');
    const result = applyPersonClarificationAction(populatedState('replace'), activeQuestion, input);
    if (result.status !== 'applied') throw new Error('Expected an applied removal');
    expectRejection(result.state, activeQuestion, input, 'stale-revision');
  });
});
