import { describe, expect, it } from 'vitest';
import {
  PersonNoMatchClarificationSchema,
  PersonClarificationSchema,
  PersonResolutionErrorSchema,
  PersonClarificationActionSchema,
  PersonClarificationResponseSchema,
} from '@lib/schemas/person-clarification-flow';

function binding() {
  return { clarificationRef: 'question-1', ref: 'p', sourceRevision: 4 };
}

function noMatch() {
  return { ...binding(), kind: 'person-no-match' };
}

function selection() {
  return {
    ...binding(),
    kind: 'person-selection',
    candidates: [{ id: 503, name: 'Example person' }],
    hasMore: true,
  };
}

function resolutionError() {
  return { kind: 'person-resolution-error', ref: 'p', sourceRevision: 4 };
}

describe('person clarification outcomes', () => {
  // Statement coverage: a no-match question retains its request binding without requiring candidate options.
  it('accepts a no-match clarification without candidates', () => {
    expect(PersonNoMatchClarificationSchema.parse(noMatch())).toEqual(noMatch());
    expect(PersonClarificationSchema.parse(noMatch())).toEqual(noMatch());
  });

  // Statement coverage: the question union retains the existing selection contract and candidate defaults.
  it('accepts existing candidate-selection questions', () => {
    expect(PersonClarificationSchema.parse(selection())).toEqual({
      ...selection(),
      candidates: [{ id: 503, name: 'Example person', knownFor: [] }],
    });
  });

  // Branch coverage: no-match cannot hide a candidate list or masquerade as a provider failure.
  it.each([
    { candidates: [] },
    { candidates: [{ id: 503, name: 'Example person' }] },
    { error: 'timeout' },
  ])('rejects mixed no-match data: %j', (extra) => {
    expect(PersonNoMatchClarificationSchema.safeParse({ ...noMatch(), ...extra }).success).toBe(
      false,
    );
  });

  // Statement coverage: technical failures carry only sanitized request context, not a semantic question.
  it('keeps technical failure separate from both semantic question kinds', () => {
    expect(PersonResolutionErrorSchema.parse(resolutionError())).toEqual(resolutionError());
    expect(PersonClarificationSchema.safeParse(resolutionError()).success).toBe(false);
    expect(PersonResolutionErrorSchema.safeParse(noMatch()).success).toBe(false);
  });

  // Branch coverage: technical feedback cannot leak raw provider errors or carry a selectable question.
  it.each([
    { error: { message: 'Provider internals' } },
    { clarificationRef: 'question-1' },
    { candidates: [] },
  ])('rejects unsafe or semantic technical-feedback data: %j', (extra) => {
    expect(PersonResolutionErrorSchema.safeParse({ ...resolutionError(), ...extra }).success).toBe(
      false,
    );
  });
});

describe('person clarification follow-up actions', () => {
  // Statement coverage: refinement preserves a free-text hint without claiming an accepted identity.
  it('normalizes an additional description and preserves the question binding', () => {
    expect(
      PersonClarificationActionSchema.parse({
        ...binding(),
        action: 'refine',
        text: ' The person from Example movie ',
      }),
    ).toEqual({ ...binding(), action: 'refine', text: 'The person from Example movie' });
  });

  // Branch coverage: whitespace normalization must not turn an unusable hint into an actionable correction.
  it('rejects a blank refinement after trimming', () => {
    expect(
      PersonClarificationActionSchema.safeParse({ ...binding(), action: 'refine', text: '   ' })
        .success,
    ).toBe(false);
  });

  // Statement coverage: navigation, explicit removal and discarding a change remain distinct bound actions.
  it.each(['more-candidates', 'remove', 'discard-change'])(
    'preserves the %s action without embedding a state transition',
    (action) => {
      const input = { ...binding(), action };
      expect(PersonClarificationActionSchema.parse(input)).toEqual(input);
      expect(PersonClarificationResponseSchema.parse(input)).toEqual(input);
    },
  );

  // Branch coverage: follow-up actions cannot inject identities, replacement targets or active filter changes.
  it.each([
    { personId: 503 },
    { person: { id: 503, name: 'Injected identity' } },
    { targetPersonId: 501 },
    { changes: [{ field: 'minRating', operation: 'set', value: 8 }] },
  ])('rejects state-changing data in a follow-up action: %j', (extra) => {
    expect(
      PersonClarificationActionSchema.safeParse({ ...binding(), action: 'remove', ...extra })
        .success,
    ).toBe(false);
  });

  // Statement coverage: the combined response contract keeps existing selections backwards compatible.
  it('accepts the unchanged selection-answer shape', () => {
    const input = { ...binding(), personId: 503 };
    expect(PersonClarificationResponseSchema.parse(input)).toEqual(input);
  });

  // Statement coverage: the combined contract also accepts a descriptive correction without a person ID.
  it('accepts a refinement response without an identity', () => {
    expect(
      PersonClarificationResponseSchema.parse({
        ...binding(),
        action: 'refine',
        text: ' Example hint ',
      }),
    ).toEqual({ ...binding(), action: 'refine', text: 'Example hint' });
  });

  // Branch coverage: a descriptive correction must not simultaneously be accepted as an identity selection.
  it('rejects a response combining a hint and a chosen person', () => {
    expect(
      PersonClarificationResponseSchema.safeParse({
        ...binding(),
        action: 'refine',
        text: 'Example hint',
        personId: 503,
      }).success,
    ).toBe(false);
  });
});
