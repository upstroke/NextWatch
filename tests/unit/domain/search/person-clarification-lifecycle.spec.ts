import { describe, expect, it } from 'vitest';
import {
  offerPersonClarification,
  processPersonClarificationAction,
  reconcilePersonClarification,
} from '@lib/domain/search/person-clarification-lifecycle';
import { validatePersonSelection } from '@lib/domain/search/validate-person-selection';
import { acceptResolvedPerson } from '@lib/domain/search/pending-operations';
import { PersonClarificationSessionSchema } from '@lib/schemas/person-clarification-session';
import { SearchStateSchema } from '@lib/schemas/search-state';
import type { SearchState } from '@lib/schemas/search-state';

function state() {
  return SearchStateSchema.parse({
    mode: 'discover',
    revision: 4,
    filters: { genreIds: [878], minRating: 7 },
    people: [{ id: 501, name: 'Accepted person' }],
    pendingQueries: {
      personQueries: [
        { ref: 'p', query: 'Replacement', operation: 'replace', targetPersonId: 501 },
        { ref: 'other', query: 'Other person', operation: 'add' },
      ],
      keywordQueries: [{ ref: 'k', query: 'space' }],
    },
  });
}

function offer(ref = 'p', sourceRevision = 4) {
  return {
    kind: 'person-selection',
    ref,
    sourceRevision,
    candidates: [{ id: 503, name: 'Candidate' }],
    hasMore: true,
  };
}

function open(searchState: SearchState, session: unknown = {}, input: unknown = offer()) {
  const result = offerPersonClarification(searchState, session, input);
  if (result.status !== 'active') throw new Error('Expected an active question');
  return result.session;
}

function answer(clarificationRef = 'person-question-1', ref = 'p', sourceRevision = 4) {
  return { clarificationRef, ref, sourceRevision, personId: 503 };
}

describe('sequential person clarification lifecycle', () => {
  // Statement coverage: initialization is separate from search criteria and retains no competing pending model.
  it('initializes an empty session and identifies the first pending person without mutation', () => {
    const searchState = state();
    const snapshot = structuredClone(searchState);
    expect(PersonClarificationSessionSchema.parse({})).toEqual({ sequence: 0, activeQuestion: null });
    const result = reconcilePersonClarification(searchState, {});
    expect(result).toEqual({
      status: 'needs-question',
      session: { sequence: 0, activeQuestion: null },
      request: searchState.pendingQueries.personQueries[0],
    });
    if (result.status !== 'needs-question') throw new Error('Expected a pending question');
    result.request.query = 'Changed';
    expect(searchState).toEqual(snapshot);
  });

  // Statement coverage: selection and no-match offers share session-issued question references.
  it.each([offer(), { kind: 'person-no-match', ref: 'p', sourceRevision: 4 }])(
    'issues one current question from fresh offer data: %j',
    (input) => {
      const searchState = state();
      const snapshot = structuredClone({ searchState, input });
      const session = open(searchState, {}, input);
      expect(session.sequence).toBe(1);
      expect(session.activeQuestion).toMatchObject({
        kind: input.kind,
        clarificationRef: 'person-question-1',
        ref: 'p',
        sourceRevision: 4,
      });
      expect({ searchState, input }).toEqual(snapshot);
    },
  );

  // Statement coverage: a still-current first question is kept without issuing another reference.
  it('retains and copies the current active question', () => {
    const searchState = state();
    const session = open(searchState);
    const result = reconcilePersonClarification(searchState, session);
    expect(result).toEqual({ status: 'active', session });
    if (result.status !== 'active') throw new Error('Expected an active question');
    expect(result.session).not.toBe(session);
    expect(result.session.activeQuestion).not.toBe(session.activeQuestion);
  });

  // Branch coverage: replacing a group at the same search revision invalidates answers to the previous group.
  it('rotates references for replacement candidate groups without changing search revision', () => {
    const searchState = state();
    const first = open(searchState);
    const snapshot = structuredClone({ searchState, first });
    const second = open(searchState, first, { ...offer(), candidates: [{ id: 504, name: 'Next candidate' }] });
    expect(second.sequence).toBe(2);
    expect(second.activeQuestion?.clarificationRef).toBe('person-question-2');
    expect(validatePersonSelection(searchState, second.activeQuestion, answer())).toEqual({
      status: 'rejected', reason: 'question-mismatch',
    });
    expect({ searchState, first }).toEqual(snapshot);
  });

  // Branch coverage: revisions invalidate stored candidates instead of rebasing them onto changed search criteria.
  it('retires a stale question and requests a fresh offer at the current revision', () => {
    const searchState = state();
    const session = open(searchState);
    const changed = { ...searchState, revision: 5 };
    const snapshot = structuredClone({ changed, session });
    expect(reconcilePersonClarification(changed, session)).toEqual({
      status: 'needs-question',
      session: { sequence: 1, activeQuestion: null },
      request: changed.pendingQueries.personQueries[0],
    });
    expect(offerPersonClarification(changed, session, offer())).toEqual({ status: 'rejected', reason: 'stale-revision' });
    const refreshed = open(changed, session, offer('p', 5));
    expect(refreshed.activeQuestion?.sourceRevision).toBe(5);
    expect(refreshed.activeQuestion?.clarificationRef).toBe('person-question-2');
    expect({ changed, session }).toEqual(snapshot);
  });

  // Statement coverage: trusted synthetic WP 009 acceptance advances to the next person without losing other conditions.
  it('moves to the next pending person after controlled acceptance', () => {
    const searchState = state();
    const session = open(searchState);
    const snapshot = structuredClone({ searchState, session });
    const selected = validatePersonSelection(searchState, session.activeQuestion, answer());
    if (selected.status !== 'validated') throw new Error('Expected a valid selection');
    const accepted = acceptResolvedPerson(searchState, {
      ref: selected.ref,
      sourceRevision: selected.sourceRevision,
      person: { id: selected.candidate.id, name: selected.candidate.name },
    });
    if (accepted.status !== 'applied') throw new Error('Expected synthetic trusted acceptance');
    expect(accepted.state.revision).toBe(5);
    expect(accepted.state.filters).toEqual(searchState.filters);
    expect(accepted.state.pendingQueries.keywordQueries).toEqual(searchState.pendingQueries.keywordQueries);
    expect(reconcilePersonClarification(accepted.state, session)).toEqual({
      status: 'needs-question',
      session: { sequence: 1, activeQuestion: null },
      request: accepted.state.pendingQueries.personQueries[0],
    });
    const next = open(accepted.state, session, offer('other', 5));
    expect(next.activeQuestion).toMatchObject({ ref: 'other', sourceRevision: 5, clarificationRef: 'person-question-2' });
    expect({ searchState, session }).toEqual(snapshot);
  });

  // Branch coverage: later people, unknown references and keywords cannot jump the person-question sequence.
  it.each([
    { ref: 'other', reason: 'out-of-order-request' },
    { ref: 'missing', reason: 'unknown-request' },
    { ref: 'k', reason: 'unknown-request' },
  ])('rejects an offer for $ref', ({ ref, reason }) => {
    const searchState = state();
    const session = open(searchState);
    const snapshot = structuredClone({ searchState, session });
    expect(offerPersonClarification(searchState, session, offer(ref))).toEqual({ status: 'rejected', reason });
    expect({ searchState, session }).toEqual(snapshot);
  });

  // Branch coverage: invalid stored sequence/question bindings fail closed at every lifecycle entry point.
  it.each([
    { sequence: 0, activeQuestion: { ...offer(), clarificationRef: 'person-question-0' } },
    { sequence: 2, activeQuestion: { ...offer(), clarificationRef: 'person-question-1' } },
    { sequence: -1, activeQuestion: null },
  ])('rejects inconsistent stored session data: %j', (session) => {
    const searchState = state();
    const expected = { status: 'rejected', reason: 'invalid-session' };
    expect(reconcilePersonClarification(searchState, session)).toEqual(expected);
    expect(offerPersonClarification(searchState, session, offer())).toEqual(expected);
    expect(processPersonClarificationAction(searchState, session, {})).toEqual(expected);
  });

  // Branch coverage: provider errors and client-supplied question references are not fresh semantic offers.
  it.each([{}, { kind: 'person-resolution-error', ref: 'p', sourceRevision: 4 }, { ...offer(), clarificationRef: 'injected' }])(
    'rejects an invalid offer: %j',
    (input) => {
      expect(offerPersonClarification(state(), {}, input)).toEqual({ status: 'rejected', reason: 'invalid-offer' });
    },
  );

  // Branch coverage: the session counter must not wrap and accidentally reuse a retired reference.
  it('rejects issuing a question after sequence exhaustion', () => {
    const session = { sequence: Number.MAX_SAFE_INTEGER, activeQuestion: null };
    expect(offerPersonClarification(state(), session, offer())).toEqual({ status: 'rejected', reason: 'sequence-exhausted' });
  });

  // Statement coverage: person completion retires the question but does not claim unresolved keywords are executable.
  it('reports only person completion and preserves the issued sequence', () => {
    const searchState = state();
    const session = open(searchState);
    const completed = { ...searchState, pendingQueries: { ...searchState.pendingQueries, personQueries: [] } };
    expect(reconcilePersonClarification(completed, session)).toEqual({
      status: 'complete', session: { sequence: 1, activeQuestion: null },
    });
    expect(completed.pendingQueries.keywordQueries).toEqual([{ ref: 'k', query: 'space' }]);
  });

  // Statement coverage: accepted navigation/hints consume the current question even without a criteria revision change.
  it.each([{ action: 'more-candidates' }, { action: 'refine', text: ' Example hint ' }])(
    'retires a question after a follow-up: %j',
    (extra) => {
      const searchState = state();
      const session = open(searchState);
      const input = { clarificationRef: 'person-question-1', ref: 'p', sourceRevision: 4, ...extra };
      const snapshot = structuredClone({ searchState, session, input });
      const result = processPersonClarificationAction(searchState, session, input);
      if (result.status !== 'processed') throw new Error('Expected processed action');
      expect(result.outcome.status).toBe('follow-up');
      expect(result.session).toEqual({ sequence: 1, activeQuestion: null });
      const replay = processPersonClarificationAction(searchState, result.session, input);
      expect(replay).toEqual({
        status: 'processed', session: result.session,
        outcome: { status: 'rejected', reason: 'no-active-clarification' },
      });
      expect({ searchState, session, input }).toEqual(snapshot);
    },
  );

  // Statement coverage: explicit removal/discard closes the question and lets the next person be prepared at the new revision.
  it.each(['remove', 'discard-change'])('retires the question after %s through the real transition', (action) => {
    const searchState = state();
    const session = open(searchState);
    const snapshot = structuredClone({ searchState, session });
    const result = processPersonClarificationAction(searchState, session, {
      clarificationRef: 'person-question-1', ref: 'p', sourceRevision: 4, action,
    });
    if (result.status !== 'processed' || result.outcome.status !== 'applied') throw new Error('Expected removal');
    expect(result.session).toEqual({ sequence: 1, activeQuestion: null });
    expect(result.outcome.state.people).toEqual(searchState.people);
    const next = reconcilePersonClarification(result.outcome.state, result.session);
    expect(next.status).toBe('needs-question');
    expect(open(result.outcome.state, result.session, offer('other', 5)).sequence).toBe(2);
    expect({ searchState, session }).toEqual(snapshot);
  });

  // Branch coverage: a rejected current answer must not destroy a valid active question.
  it('keeps the current question after a mismatched action', () => {
    const searchState = state();
    const session = open(searchState);
    expect(processPersonClarificationAction(searchState, session, {
      clarificationRef: 'wrong-group', ref: 'p', sourceRevision: 4, action: 'remove',
    })).toEqual({
      status: 'processed', session,
      outcome: { status: 'rejected', reason: 'question-mismatch' },
    });
  });

  // Branch coverage: stale sessions are retired before processing, without applying an old action to a new state.
  it('rejects a stale action and retains no stale active question', () => {
    const searchState = state();
    const session = open(searchState);
    const changed = { ...searchState, revision: 5 };
    const snapshot = structuredClone({ changed, session });
    expect(processPersonClarificationAction(changed, session, {
      clarificationRef: 'person-question-1', ref: 'p', sourceRevision: 4, action: 'remove',
    })).toEqual({
      status: 'processed', session: { sequence: 1, activeQuestion: null },
      outcome: { status: 'rejected', reason: 'no-active-clarification' },
    });
    expect({ changed, session }).toEqual(snapshot);
  });
});
