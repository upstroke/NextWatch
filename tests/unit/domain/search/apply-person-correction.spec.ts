import { describe, expect, it } from 'vitest';
import { applyPersonCorrection } from '@lib/domain/search/apply-person-correction';
import {
  offerPersonClarification,
  processPersonClarificationAction,
  reconcilePersonClarification,
} from '@lib/domain/search/person-clarification-lifecycle';
import { validatePersonSelection } from '@lib/domain/search/validate-person-selection';
import { SearchStateSchema } from '@lib/schemas/search-state';

function setup(operation: 'add' | 'replace' = 'add') {
  const request = operation === 'add'
    ? { ref: 'p', query: 'Original name', operation }
    : { ref: 'p', query: 'Original name', operation, targetPersonId: 501 };
  const state = SearchStateSchema.parse({
    mode: 'discover', revision: 4,
    filters: { genreIds: [878], minRating: 7 },
    people: [{ id: 501, name: 'Accepted A' }, { id: 502, name: 'Accepted B' }],
    pendingQueries: {
      personQueries: [request, { ref: 'other', query: 'Other person', operation: 'add' }],
      keywordQueries: [{ ref: 'k', query: 'space' }],
    },
  });
  const opened = offerPersonClarification(state, {}, {
    kind: 'person-selection', ref: 'p', sourceRevision: 4,
    candidates: [{ id: 503, name: 'Old candidate' }], hasMore: true,
  });
  if (opened.status !== 'active') throw new Error('Expected an active question');
  const refined = processPersonClarificationAction(state, opened.session, {
    clarificationRef: 'person-question-1', ref: 'p', sourceRevision: 4,
    action: 'refine', text: 'The person from Example movie',
  });
  if (refined.status !== 'processed' || refined.outcome.status !== 'follow-up' || refined.outcome.action.action !== 'refine') {
    throw new Error('Expected an authorized refinement');
  }
  return {
    state, session: refined.session, oldSession: opened.session,
    context: { action: refined.outcome.action, request: refined.outcome.request },
    correction: { clarificationRef: 'person-question-1', ref: 'p', sourceRevision: 4, query: ' Corrected name ' },
  };
}

function apply(fixture: ReturnType<typeof setup>) {
  return applyPersonCorrection(fixture.state, fixture.session, fixture.context, fixture.correction);
}

describe('bound person correction acceptance', () => {
  // Statement coverage: real refinement output authorizes query-only changes while WP 009 preserves addition/replacement context.
  it.each(['add', 'replace'] satisfies ('add' | 'replace')[])(
    'corrects a pending %s without changing accepted people or unrelated requests',
    (operation) => {
      const fixture = setup(operation);
      const snapshot = structuredClone(fixture);
      const result = apply(fixture);
      expect(result).toEqual({
        status: 'applied',
        state: {
          ...fixture.state, revision: 5,
          pendingQueries: {
            ...fixture.state.pendingQueries,
            personQueries: fixture.state.pendingQueries.personQueries.map((request) =>
              request.ref === 'p' ? { ...request, query: 'Corrected name' } : request),
          },
        },
      });
      expect(fixture).toEqual(snapshot);
      if (result.status !== 'applied') throw new Error('Expected a correction');
      expect(reconcilePersonClarification(result.state, fixture.session)).toMatchObject({
        status: 'needs-question', session: { sequence: 1, activeQuestion: null },
        request: { ref: 'p', query: 'Corrected name', operation },
      });
      expect(validatePersonSelection(result.state, fixture.oldSession.activeQuestion, {
        clarificationRef: 'person-question-1', ref: 'p', sourceRevision: 4, personId: 503,
      })).toEqual({ status: 'rejected', reason: 'stale-revision' });
      expect(applyPersonCorrection(result.state, fixture.session, fixture.context, fixture.correction)).toEqual({
        status: 'rejected', reason: 'stale-revision',
      });
      result.state.filters.genreIds.push(28);
      result.state.people.forEach((person) => { person.name = 'Changed'; });
      expect(fixture).toEqual(snapshot);
    },
  );

  // Branch coverage: normalized no-op corrections retain revision, including harmless repeated submission.
  it('does not advance revision when correction text is unchanged', () => {
    const fixture = setup();
    fixture.correction.query = ' Original name ';
    const snapshot = structuredClone(fixture);
    expect(apply(fixture)).toEqual({ status: 'unchanged', reason: 'no-effective-change' });
    expect(apply(fixture)).toEqual({ status: 'unchanged', reason: 'no-effective-change' });
    expect(fixture).toEqual(snapshot);
  });

  // Branch coverage: a parser cannot introduce identity IDs, replacement targets or operation changes.
  it.each([{ personId: 503 }, { targetPersonId: 502 }, { operation: 'replace' }])(
    'rejects non-text parser changes: %j',
    (extra) => {
      const fixture = setup('replace');
      const input = { ...fixture.correction, ...extra };
      const snapshot = structuredClone({ fixture, input });
      expect(applyPersonCorrection(fixture.state, fixture.session, fixture.context, input)).toEqual({
        status: 'rejected', reason: 'invalid-correction',
      });
      expect({ fixture, input }).toEqual(snapshot);
    },
  );

  // Branch coverage: independently bound correction responses must match both the captured question and pending reference.
  it.each([{ clarificationRef: 'other-question' }, { ref: 'other' }])(
    'rejects an unrelated parser response: %j',
    (extra) => {
      const fixture = setup();
      expect(applyPersonCorrection(fixture.state, fixture.session, fixture.context, { ...fixture.correction, ...extra })).toEqual({
        status: 'rejected', reason: 'refinement-mismatch',
      });
    },
  );

  // Branch coverage: later questions invalidate in-flight refinement even if the search revision did not change.
  it.each([
    { sequence: 0, activeQuestion: null },
    { sequence: 2, activeQuestion: null },
  ])('rejects an obsolete refinement sequence: %j', (session) => {
    const fixture = setup();
    expect(applyPersonCorrection(fixture.state, session, fixture.context, fixture.correction)).toEqual({
      status: 'rejected', reason: 'obsolete-refinement',
    });
  });

  // Branch coverage: a still-active question is not evidence that its refinement has been authorized and consumed.
  it('rejects correction before the visible question was closed', () => {
    const fixture = setup();
    expect(applyPersonCorrection(fixture.state, fixture.oldSession, fixture.context, fixture.correction)).toEqual({
      status: 'rejected', reason: 'obsolete-refinement',
    });
  });

  // Branch coverage: both captured and parsed revisions must still match current search criteria.
  it.each([
    { stateRevision: 5, contextRevision: 4, correctionRevision: 4 },
    { stateRevision: 4, contextRevision: 3, correctionRevision: 4 },
    { stateRevision: 4, contextRevision: 4, correctionRevision: 3 },
    { stateRevision: 4, contextRevision: 4, correctionRevision: 5 },
  ])('rejects stale or future correction context: %j', (revisions) => {
    const fixture = setup();
    fixture.state.revision = revisions.stateRevision;
    fixture.context.action.sourceRevision = revisions.contextRevision;
    fixture.correction.sourceRevision = revisions.correctionRevision;
    const snapshot = structuredClone(fixture);
    expect(apply(fixture)).toEqual({ status: 'rejected', reason: 'stale-revision' });
    expect(fixture).toEqual(snapshot);
  });

  // Branch coverage: malformed sessions, unauthorized follow-ups and blank parser output fail closed.
  it('rejects invalid boundary data before applying a pending command', () => {
    const fixture = setup();
    expect(applyPersonCorrection(fixture.state, { sequence: -1 }, fixture.context, fixture.correction)).toEqual({
      status: 'rejected', reason: 'invalid-session',
    });
    expect(applyPersonCorrection(fixture.state, fixture.session, {
      ...fixture.context, action: { ...fixture.context.action, ref: 'other' },
    }, fixture.correction)).toEqual({ status: 'rejected', reason: 'invalid-context' });
    expect(applyPersonCorrection(fixture.state, fixture.session, {
      ...fixture.context, action: { ...fixture.context.action, action: 'more-candidates' },
    }, fixture.correction)).toEqual({ status: 'rejected', reason: 'invalid-context' });
    expect(applyPersonCorrection(fixture.state, fixture.session, fixture.context, {
      ...fixture.correction, query: '   ',
    })).toEqual({ status: 'rejected', reason: 'invalid-correction' });
  });

  // Branch coverage: removed person requests cannot be recreated from their former refinement context.
  it('rejects correction of a removed request', () => {
    const fixture = setup();
    fixture.state.pendingQueries.personQueries = fixture.state.pendingQueries.personQueries.filter((request) => request.ref !== 'p');
    expect(apply(fixture)).toEqual({ status: 'rejected', reason: 'unknown-request' });
  });

  // Branch coverage: captured query text and operation context remain binding even if inconsistent state kept the same revision.
  it.each([
    { capturedOperation: 'add', currentOperation: 'replace', targetPersonId: 501 },
    { capturedOperation: 'replace', currentOperation: 'add' },
    { capturedOperation: 'replace', currentOperation: 'replace', targetPersonId: 502 },
  ] satisfies {
    capturedOperation: 'add' | 'replace';
    currentOperation: 'add' | 'replace';
    targetPersonId?: number;
  }[])('rejects changed request context: %j', (testCase) => {
    const fixture = setup(testCase.capturedOperation);
    fixture.state.pendingQueries.personQueries = fixture.state.pendingQueries.personQueries.map((request) => {
      if (request.ref !== 'p') return request;
      return testCase.currentOperation === 'add'
        ? { ref: 'p', query: 'Original name', operation: 'add' }
        : { ref: 'p', query: 'Original name', operation: 'replace', targetPersonId: testCase.targetPersonId ?? 501 };
    });
    const snapshot = structuredClone(fixture);
    expect(apply(fixture)).toEqual({ status: 'rejected', reason: 'request-changed' });
    expect(fixture).toEqual(snapshot);
  });

  // Branch coverage: changed query text or first-request ordering cannot reuse an older captured refinement.
  it.each(['query', 'order'])('rejects changed request %s without mutation', (change) => {
    const fixture = setup();
    if (change === 'query') {
      fixture.state.pendingQueries.personQueries.forEach((request) => {
        if (request.ref === 'p') request.query = 'Already corrected';
      });
    } else {
      fixture.state.pendingQueries.personQueries.reverse();
    }
    const snapshot = structuredClone(fixture);
    expect(apply(fixture)).toEqual({ status: 'rejected', reason: 'request-changed' });
    expect(fixture).toEqual(snapshot);
  });
});
