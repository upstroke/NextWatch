import { describe, expect, it, vi } from 'vitest';
import { processPersonSelection } from '@lib/domain/search/process-person-selection';
import type {
  PersonSelectionIdentityValidator,
  ProcessPersonSelectionResult,
} from '@lib/domain/search/process-person-selection';
import { offerPersonClarification } from '@lib/domain/search/person-clarification-lifecycle';
import { SearchStateSchema } from '@lib/schemas/search-state';

function setup(operation: 'add' | 'replace' = 'add', personId = 503, withNext = true) {
  const request =
    operation === 'add'
      ? { ref: 'p', query: 'Ambiguous person', operation }
      : { ref: 'p', query: 'Replacement person', operation, targetPersonId: 501 };
  const state = SearchStateSchema.parse({
    mode: 'discover',
    revision: 4,
    filters: { genreIds: [878], keywordIds: [100], minRating: 7 },
    people: [{ id: 501, name: 'Accepted A' }, { id: 502, name: 'Accepted B' }],
    pendingQueries: {
      personQueries: [
        request,
        ...(withNext
          ? [
              { ref: 'other', query: 'Other person', operation: 'add' },
              { ref: 'other-replacement', query: 'Another replacement', operation: 'replace', targetPersonId: 502 },
            ]
          : []),
      ],
      keywordQueries: [{ ref: 'k', query: 'space' }],
    },
  });
  const offered = offerPersonClarification(state, {}, {
    kind: 'person-selection',
    ref: 'p',
    sourceRevision: 4,
    candidates: [
      { id: 900, name: 'Higher-ranked candidate' },
      { id: personId, name: 'Presentation name', knownFor: [{ title: 'Example movie', mediaType: 'movie' }] },
    ],
    hasMore: false,
  });
  if (offered.status !== 'active') throw new Error('Expected an active question');
  return {
    state,
    session: offered.session,
    input: { clarificationRef: 'person-question-1', ref: 'p', sourceRevision: 4, personId },
  };
}

function acceptance(id = 503) {
  return { ref: 'p', sourceRevision: 4, person: { id, name: 'Provider canonical name' } };
}

function expectRejection(result: ProcessPersonSelectionResult, reason: string, session: unknown) {
  expect(result).toEqual({ status: 'processed', session, outcome: { status: 'rejected', reason } });
}

describe('controlled person selection processing', () => {
  // Statement coverage: additions and replacements accept the chosen provider-validated identity through real WP 009 rules.
  it.each(['add', 'replace'] satisfies ('add' | 'replace')[])(
    'accepts a validated %s, preserves unrelated requests and prepares the next person',
    (operation) => {
      const fixture = setup(operation);
      const snapshot = structuredClone(fixture);
      const validator = vi.fn(() => acceptance());
      const result = processPersonSelection(fixture.state, fixture.session, fixture.input, validator);
      expect(result).toEqual({
        status: 'processed',
        session: { sequence: 1, activeQuestion: null },
        outcome: {
          status: 'applied',
          state: {
            ...fixture.state,
            revision: 5,
            people: operation === 'add'
              ? [...fixture.state.people, acceptance().person]
              : [acceptance().person, { id: 502, name: 'Accepted B' }],
            pendingQueries: {
              ...fixture.state.pendingQueries,
              personQueries: fixture.state.pendingQueries.personQueries.filter((request) => request.ref !== 'p'),
            },
          },
        },
        nextRequest: { ref: 'other', query: 'Other person', operation: 'add' },
      });
      expect(validator).toHaveBeenCalledTimes(1);
      expect(validator).toHaveBeenCalledWith({
        selection: {
          status: 'validated', clarificationRef: 'person-question-1', ref: 'p', sourceRevision: 4,
          candidate: {
            id: 503, name: 'Presentation name',
            knownFor: [{ title: 'Example movie', mediaType: 'movie' }],
          },
        },
        request: fixture.state.pendingQueries.personQueries[0],
      });
      expect(fixture).toEqual(snapshot);
      if (result.status !== 'processed' || result.outcome.status !== 'applied' || !result.nextRequest) {
        throw new Error('Expected acceptance with a next request');
      }
      const next = offerPersonClarification(result.outcome.state, result.session, {
        kind: 'person-no-match', ref: result.nextRequest.ref, sourceRevision: result.outcome.state.revision,
      });
      expect(next.status).toBe('active');
      result.nextRequest.query = 'Changed next request';
      result.outcome.state.filters.genreIds.push(28);
      result.outcome.state.people.forEach((person) => { person.name = 'Changed'; });
      expect(result.outcome.state.pendingQueries.personQueries[0]?.query).toBe('Other person');
      expect(fixture).toEqual(snapshot);
    },
  );

  // Branch coverage: already accepted IDs preserve existing names and deduplicate additions or replacements atomically.
  it.each([
    { operation: 'add', id: 502, expectedIds: [501, 502] },
    { operation: 'replace', id: 502, expectedIds: [502] },
    { operation: 'replace', id: 501, expectedIds: [501, 502] },
  ] satisfies { operation: 'add' | 'replace'; id: number; expectedIds: number[] }[])(
    'deduplicates $operation resolving to $id without changing accepted display names',
    ({ operation, id, expectedIds }) => {
      const fixture = setup(operation, id);
      const snapshot = structuredClone(fixture);
      const result = processPersonSelection(fixture.state, fixture.session, fixture.input, () => acceptance(id));
      if (result.status !== 'processed' || result.outcome.status !== 'applied') throw new Error('Expected acceptance');
      expect(result.outcome.state.people).toEqual(fixture.state.people.filter((person) => expectedIds.includes(person.id)));
      expect(result.outcome.state.revision).toBe(5);
      expect(result.outcome.state.pendingQueries.personQueries.map((request) => request.ref)).toEqual(['other', 'other-replacement']);
      expect(result.session.activeQuestion).toBeNull();
      expect(fixture).toEqual(snapshot);
    },
  );

  // Branch coverage: accepting the final person does not fabricate another request or imply keyword resolution is complete.
  it('omits nextRequest when no pending people remain', () => {
    const fixture = setup('add', 503, false);
    const result = processPersonSelection(fixture.state, fixture.session, fixture.input, () => acceptance());
    if (result.status !== 'processed' || result.outcome.status !== 'applied') throw new Error('Expected acceptance');
    expect(result).not.toHaveProperty('nextRequest');
    expect(result.outcome.state.pendingQueries.personQueries).toEqual([]);
    expect(result.outcome.state.pendingQueries.keywordQueries).toEqual(fixture.state.pendingQueries.keywordQueries);
    expect(result.session).toEqual({ sequence: 1, activeQuestion: null });
  });

  // Branch coverage: absent provenance validation never falls back to accepting the offered display record.
  it('fails closed when the trusted validator is missing', () => {
    const fixture = setup();
    const snapshot = structuredClone(fixture);
    expectRejection(
      processPersonSelection(fixture.state, fixture.session, fixture.input),
      'resolution-validation-required', fixture.session,
    );
    expect(fixture).toEqual(snapshot);
  });

  // Branch coverage: inconsistent stored sessions are rejected before reaching the trusted resolution boundary.
  it('rejects an invalid session without invoking the validator', () => {
    const fixture = setup();
    const validator = vi.fn(() => acceptance());
    expect(processPersonSelection(fixture.state, { sequence: -1 }, fixture.input, validator)).toEqual({
      status: 'rejected', reason: 'invalid-session',
    });
    expect(validator).not.toHaveBeenCalled();
  });

  // Branch coverage: malformed, mismatched, stale and unoffered selections cannot invoke identity validation.
  it.each([
    { extra: { personId: 999 }, reason: 'candidate-not-offered' },
    { extra: { clarificationRef: 'previous-group' }, reason: 'question-mismatch' },
    { extra: { ref: 'other' }, reason: 'question-mismatch' },
    { extra: { sourceRevision: 3 }, reason: 'stale-revision' },
    { extra: { verified: true }, reason: 'invalid-answer' },
    { extra: { person: { id: 503, name: 'Client supplied' } }, reason: 'invalid-answer' },
  ])('rejects unsafe selection data: $reason', ({ extra, reason }) => {
    const fixture = setup();
    const input = { ...fixture.input, ...extra };
    const snapshot = structuredClone({ fixture, input });
    const validator = vi.fn(() => acceptance());
    expectRejection(processPersonSelection(fixture.state, fixture.session, input, validator), reason, fixture.session);
    expect(validator).not.toHaveBeenCalled();
    expect({ fixture, input }).toEqual(snapshot);
  });

  // Branch coverage: no-match questions cannot be converted into identity selections merely by submitting an ID.
  it('rejects selection against an active no-match question', () => {
    const fixture = setup();
    const offered = offerPersonClarification(fixture.state, fixture.session, {
      kind: 'person-no-match', ref: 'p', sourceRevision: 4,
    });
    if (offered.status !== 'active') throw new Error('Expected a no-match question');
    const validator = vi.fn(() => acceptance());
    expectRejection(processPersonSelection(fixture.state, offered.session, {
      ...fixture.input, clarificationRef: 'person-question-2',
    }, validator), 'invalid-clarification', offered.session);
    expect(validator).not.toHaveBeenCalled();
  });

  // Branch coverage: obsolete questions are retired before selection, with no provider-validation attempt or criteria change.
  it('retires a stale question without accepting its old selection', () => {
    const fixture = setup();
    const changed = { ...fixture.state, revision: 5 };
    const snapshot = structuredClone({ fixture, changed });
    const validator = vi.fn(() => acceptance());
    expectRejection(processPersonSelection(changed, fixture.session, fixture.input, validator),
      'no-active-clarification', { sequence: 1, activeQuestion: null });
    expect(validator).not.toHaveBeenCalled();
    expect({ fixture, changed }).toEqual(snapshot);
  });

  // Branch coverage: booleans, approval flags and malformed records are not provider-validated acceptance inputs.
  it.each([true, false, null, {}, { verified: true }, { ...acceptance(), verified: true }])(
    'rejects an unusable trusted-boundary result: %j',
    (resolution) => {
      const fixture = setup();
      const snapshot = structuredClone(fixture);
      const validator = vi.fn(() => resolution);
      expectRejection(processPersonSelection(fixture.state, fixture.session, fixture.input, validator),
        'invalid-resolution', fixture.session);
      expect(validator).toHaveBeenCalledTimes(1);
      expect(fixture).toEqual(snapshot);
    },
  );

  // Branch coverage: technical validator exceptions preserve the current question and expose no raw error details.
  it('sanitizes a validator exception without mutating criteria', () => {
    const fixture = setup();
    const snapshot = structuredClone(fixture);
    const validator = vi.fn(() => { throw new Error('Private provider details'); });
    expectRejection(processPersonSelection(fixture.state, fixture.session, fixture.input, validator),
      'resolution-validation-error', fixture.session);
    expect(fixture).toEqual(snapshot);
  });

  // Branch coverage: valid-shaped resolution data cannot switch request, revision or chosen identity.
  it.each([
    { ...acceptance(), ref: 'other' },
    { ...acceptance(), sourceRevision: 3 },
    { ...acceptance(), sourceRevision: 5 },
    acceptance(900),
  ])('rejects a mismatched acceptance record: %j', (resolution) => {
    const fixture = setup();
    const snapshot = structuredClone(fixture);
    expectRejection(processPersonSelection(fixture.state, fixture.session, fixture.input, () => resolution),
      'resolution-mismatch', fixture.session);
    expect(fixture).toEqual(snapshot);
  });

  // Statement coverage: callback arguments are copies and cannot rewrite the internally validated selection binding.
  it('isolates mutable validator context from inputs and the selected identity', () => {
    const fixture = setup('replace');
    const snapshot = structuredClone(fixture);
    const validator: PersonSelectionIdentityValidator = ({ selection, request }) => {
      selection.ref = 'other';
      selection.sourceRevision = 99;
      selection.candidate.id = 900;
      selection.candidate.name = 'Changed';
      selection.candidate.knownFor.push({ title: 'Changed title', mediaType: 'tv' });
      request.query = 'Changed';
      if (request.operation === 'replace') request.targetPersonId = 502;
      return acceptance();
    };
    const result = processPersonSelection(fixture.state, fixture.session, fixture.input, validator);
    if (result.status !== 'processed' || result.outcome.status !== 'applied') throw new Error('Expected acceptance');
    expect(result.outcome.state.people).toEqual([acceptance().person, { id: 502, name: 'Accepted B' }]);
    expect(fixture).toEqual(snapshot);
  });

  // Branch coverage: replaying an accepted selection with either the retired or old session cannot accept it twice.
  it('rejects replay after acceptance before invoking the validator again', () => {
    const fixture = setup();
    const validator = vi.fn(() => acceptance());
    const accepted = processPersonSelection(fixture.state, fixture.session, fixture.input, validator);
    if (accepted.status !== 'processed' || accepted.outcome.status !== 'applied') throw new Error('Expected acceptance');
    const snapshot = structuredClone(accepted);
    validator.mockClear();
    for (const session of [accepted.session, fixture.session]) {
      expectRejection(processPersonSelection(accepted.outcome.state, session, fixture.input, validator),
        'no-active-clarification', accepted.session);
    }
    expect(validator).not.toHaveBeenCalled();
    expect(accepted).toEqual(snapshot);
  });
});
