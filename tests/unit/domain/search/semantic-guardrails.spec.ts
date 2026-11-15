import { describe, expect, it } from 'vitest';
import { offerSemanticGuardrail, processSemanticGuardrailResponse } from '@lib/domain/search/semantic-guardrails';
import { SemanticGuardrailInputSchema, SemanticGuardrailResponseSchema } from '@lib/schemas/semantic-guardrails';
import { SearchStateSchema } from '@lib/schemas/search-state';

function state() {
  return SearchStateSchema.parse({
    mode: 'discover', revision: 4,
    filters: { genreIds: [878], keywordIds: [10], minRating: 7, minYear: 1980, maxYear: 2020 },
    people: [{ id: 1, name: 'A' }, { id: 2, name: 'B' }, { id: 3, name: 'C' }],
    pendingQueries: {
      personQueries: [{ ref: 'existing', query: 'Other person', operation: 'replace', targetPersonId: 3 }],
      keywordQueries: [{ ref: 'keyword', query: 'space' }],
    },
  });
}
const replacement = { kind: 'replacement-target', sourceRevision: 4, request: { ref: 'new', query: 'New person' } };
const years = { kind: 'year-conflict', sourceRevision: 4, minYear: 2021, maxYear: 2009 };
const keyword = {
  kind: 'keyword-meaning', sourceRevision: 4, request: { ref: 'keyword', query: 'space' },
  options: [
    { optionRef: 'travel', label: 'Space travel', query: 'space travel' },
    { optionRef: 'astronomy', label: 'Astronomy', query: 'astronomy' },
  ],
};
function open(input: unknown, current = state()) {
  const result = offerSemanticGuardrail(current, {}, input);
  if (result.status !== 'active') throw new Error('Expected semantic question');
  return { state: current, session: result.session };
}
function answer(action: string, fields: Record<string, unknown> = {}) {
  return { clarificationRef: 'semantic-question-1', sourceRevision: 4, action, ...fields };
}
function checkRejection(fixture: ReturnType<typeof open>, input: unknown, reason: string) {
  const snapshot = structuredClone(fixture);
  expect(processSemanticGuardrailResponse(fixture.state, fixture.session, input)).toMatchObject({ status: 'rejected', reason });
  expect(fixture).toEqual(snapshot);
}

describe('semantic guardrails', () => {
  // Statement coverage: questions preserve criteria; target selection creates only a pending replacement through real WP 009 transitions.
  it('offers eligible accepted targets and preserves the replaced person until identity acceptance', () => {
    const original = state();
    const snapshot = structuredClone(original);
    const fixture = open(replacement, original);
    expect(fixture.session.activeQuestion).toMatchObject({ targets: [{ id: 1, name: 'A' }, { id: 2, name: 'B' }] });
    expect(original).toEqual(snapshot);
    const result = processSemanticGuardrailResponse(original, fixture.session, answer('select-target', { personId: 2 }));
    expect(result).toEqual({
      status: 'processed', session: { sequence: 1, activeQuestion: null },
      outcome: { status: 'applied', state: {
        ...original, revision: 5, pendingQueries: {
          ...original.pendingQueries,
          personQueries: [...original.pendingQueries.personQueries, { ref: 'new', query: 'New person', operation: 'replace', targetPersonId: 2 }],
        },
      } },
    });
    if (result.status !== 'processed' || result.outcome.status !== 'applied') throw new Error('Expected pending replacement');
    expect(processSemanticGuardrailResponse(result.outcome.state, result.session, answer('select-target', { personId: 2 }))).toMatchObject({ reason: 'no-active-question' });
    result.outcome.state.people.forEach((person) => { person.name = 'Changed'; });
    expect(original).toEqual(snapshot);
  });

  // Statement coverage: real applyIntent applies both corrected bounds atomically and retains unrelated accepted/pending criteria.
  it.each([
    { minYear: 1990, maxYear: 2010 }, { minYear: null, maxYear: 2010 },
    { minYear: 1990, maxYear: null }, { minYear: null, maxYear: null },
  ])('applies explicit year corrections: %j', (bounds) => {
    const fixture = open(years);
    const snapshot = structuredClone(fixture);
    const result = processSemanticGuardrailResponse(fixture.state, fixture.session, answer('correct-years', bounds));
    if (result.status !== 'processed' || result.outcome.status !== 'applied') throw new Error('Expected corrected years');
    expect(result.outcome.state).toEqual({ ...fixture.state, revision: 5, filters: {
      ...fixture.state.filters, minYear: bounds.minYear ?? undefined, maxYear: bounds.maxYear ?? undefined,
    } });
    if (bounds.minYear === null) expect(result.outcome.state.filters).not.toHaveProperty('minYear');
    if (bounds.maxYear === null) expect(result.outcome.state.filters).not.toHaveProperty('maxYear');
    expect(result.session).toEqual({ sequence: 1, activeQuestion: null });
    expect(fixture).toEqual(snapshot);
  });

  // Statement coverage: keyword meaning selection changes only the existing unresolved query, never an accepted keyword ID.
  it('applies an offered keyword meaning while retaining its application reference', () => {
    const fixture = open(keyword);
    const snapshot = structuredClone(fixture);
    const result = processSemanticGuardrailResponse(fixture.state, fixture.session, answer('select-meaning', { optionRef: 'travel' }));
    expect(result).toEqual({ status: 'processed', session: { sequence: 1, activeQuestion: null }, outcome: {
      status: 'applied', state: { ...fixture.state, revision: 5, pendingQueries: {
        ...fixture.state.pendingQueries, keywordQueries: [{ ref: 'keyword', query: 'space travel' }],
      } },
    } });
    expect(fixture).toEqual(snapshot);
  });

  // Branch coverage: effective no-op answers consume the question without incrementing criteria revision.
  it('consumes no-op year and keyword answers without changing revision', () => {
    const yearFixture = open(years);
    expect(processSemanticGuardrailResponse(yearFixture.state, yearFixture.session, answer('correct-years', { minYear: 1980, maxYear: 2020 }))).toMatchObject({
      status: 'processed', session: { activeQuestion: null }, outcome: { status: 'unchanged', reason: 'no-effective-change' },
    });
    const fixture = open({ ...keyword, options: [{ optionRef: 'same', label: 'Current meaning', query: 'space' }, keyword.options[1]] });
    expect(processSemanticGuardrailResponse(fixture.state, fixture.session, answer('select-meaning', { optionRef: 'same' }))).toMatchObject({
      status: 'processed', outcome: { status: 'unchanged', reason: 'no-effective-change' },
    });
  });

  // Branch coverage: unsupported recognition uses the existing intent outcome and retires earlier questions without relaxing criteria.
  it('returns unsupported without manufacturing a question or changing state', () => {
    const fixture = open(years);
    const snapshot = structuredClone(fixture);
    const result = offerSemanticGuardrail(fixture.state, fixture.session, { kind: 'unsupported', sourceRevision: 4, requirement: ' Unsupported feature ' });
    expect(result).toEqual({ status: 'unsupported', requirement: 'Unsupported feature', session: { sequence: 2, activeQuestion: null }, outcome: { status: 'unchanged', reason: 'unsupported' } });
    expect(fixture).toEqual(snapshot);
  });

  // Branch coverage: newer same-revision offers invalidate old question references; original objects remain independent.
  it('rejects old answers after a new same-revision question was issued', () => {
    const fixture = open(replacement);
    const snapshot = structuredClone(fixture);
    const next = offerSemanticGuardrail(fixture.state, fixture.session, years);
    if (next.status !== 'active') throw new Error('Expected replacement question');
    expect(next.session.sequence).toBe(2);
    checkRejection({ ...fixture, session: next.session }, answer('select-target', { personId: 1 }), 'question-mismatch');
    if (fixture.session.activeQuestion?.kind === 'replacement-target') {
      fixture.session.activeQuestion.targets.forEach((target) => { target.name = 'Presentation change'; });
    }
    expect(fixture.state).toEqual(snapshot.state);
  });

  // Branch coverage: malformed structured values are rejected, not automatically converted into semantic questions.
  it.each([
    { ...years, minYear: 2000, maxYear: 2020 }, { ...years, minYear: 2200 },
    { ...years, minYear: '2021' }, { kind: 'unsupported', sourceRevision: 4, requirement: ' ' },
    { ...keyword, options: [keyword.options[0]] },
    { ...keyword, options: [keyword.options[0], keyword.options[0]] },
    { ...keyword, options: [keyword.options[0], { ...keyword.options[0], optionRef: 'different' }] },
  ])('rejects invalid recognized input: %j', (input) => {
    const current = state();
    const snapshot = structuredClone(current);
    expect(SemanticGuardrailInputSchema.safeParse(input).success).toBe(false);
    expect(offerSemanticGuardrail(current, {}, input)).toMatchObject({ reason: 'invalid-input' });
    expect(current).toEqual(snapshot);
  });

  // Branch coverage: application references must remain available and keyword contexts must identify a current pending request.
  it('rejects unavailable replacement and keyword contexts', () => {
    const current = state();
    expect(offerSemanticGuardrail(current, {}, { ...replacement, request: { ref: 'keyword', query: 'Person' } })).toMatchObject({ reason: 'invalid-context' });
    current.people = current.people.filter((person) => person.id !== 2);
    expect(offerSemanticGuardrail(current, {}, replacement)).toMatchObject({ reason: 'invalid-context' });
    expect(offerSemanticGuardrail(current, {}, { ...keyword, request: { ref: 'missing', query: 'space' } })).toMatchObject({ reason: 'invalid-context' });
    expect(offerSemanticGuardrail(current, {}, { ...keyword, request: { ref: 'keyword', query: 'changed' } })).toMatchObject({ reason: 'invalid-context' });
  });

  // Branch coverage: sessions, revision bindings and sequence exhaustion fail closed before issuing or consuming questions.
  it('rejects malformed sessions, exhausted sequences and stale offers', () => {
    expect(offerSemanticGuardrail(state(), { sequence: -1 }, years)).toMatchObject({ reason: 'invalid-session' });
    expect(offerSemanticGuardrail(state(), { sequence: Number.MAX_SAFE_INTEGER }, years)).toMatchObject({ reason: 'sequence-exhausted' });
    expect(offerSemanticGuardrail(state(), {}, { ...years, sourceRevision: 3 })).toMatchObject({ reason: 'stale-revision' });
    expect(processSemanticGuardrailResponse(state(), { sequence: -1 }, {})).toMatchObject({ reason: 'invalid-session' });
    expect(processSemanticGuardrailResponse(state(), {}, {})).toMatchObject({ reason: 'no-active-question' });
    const fixture = open(years);
    expect(processSemanticGuardrailResponse(fixture.state, { ...fixture.session, sequence: 2 }, {})).toMatchObject({ reason: 'invalid-session' });
    checkRejection(fixture, answer('correct-years', { minYear: 1990, maxYear: 2010, sourceRevision: 3 }), 'stale-revision');
    fixture.state.revision = 5;
    checkRejection(fixture, answer('correct-years', { minYear: 1990, maxYear: 2010, sourceRevision: 5 }), 'stale-revision');
  });

  // Branch coverage: answers cannot inject identities, arbitrary query text or contradictory year ranges.
  it.each([
    answer('correct-years', { minYear: 2021, maxYear: 2009 }),
    answer('correct-years', { minYear: 1800, maxYear: 2009 }),
    answer('correct-years', { minYear: 2000 }),
    answer('select-meaning', { optionRef: 'travel', keywordId: 42 }),
    answer('select-target', { personId: 1, query: 'Injected' }),
  ])('rejects malformed or overpowered responses: %j', (input) => {
    expect(SemanticGuardrailResponseSchema.safeParse(input).success).toBe(false);
    checkRejection(open(years), input, 'invalid-response');
  });

  // Branch coverage: structural validity does not authorize a different action or an unoffered option.
  it('rejects mismatched actions and unoffered targets/meanings', () => {
    checkRejection(open(years), answer('select-target', { personId: 1 }), 'action-mismatch');
    checkRejection(open(replacement), answer('select-target', { personId: 3 }), 'option-unavailable');
    checkRejection(open(keyword), answer('select-meaning', { optionRef: 'forged' }), 'option-unavailable');
  });

  // Branch coverage: WP 009 rejection does not consume the question or mutate unrelated criteria.
  it('preserves inputs when a target or pending reference became unavailable', () => {
    const fixture = open(replacement);
    fixture.state.people = fixture.state.people.filter((person) => person.id !== 2);
    checkRejection(fixture, answer('select-target', { personId: 2 }), 'transition-rejected');
    const collision = open(replacement);
    collision.state.pendingQueries.keywordQueries.push({ ref: 'new', query: 'Other keyword' });
    checkRejection(collision, answer('select-target', { personId: 1 }), 'transition-rejected');
  });

  // Branch coverage: keyword questions cannot recreate removed requests or overwrite already modified query context.
  it.each(['removed', 'changed'])('rejects a %s keyword request', (change) => {
    const fixture = open(keyword);
    fixture.state.pendingQueries.keywordQueries = change === 'removed' ? [] : [{ ref: 'keyword', query: 'Changed' }];
    checkRejection(fixture, answer('select-meaning', { optionRef: 'travel' }), 'invalid-context');
  });
});
