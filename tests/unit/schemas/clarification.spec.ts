import { describe, expect, it } from 'vitest';
import {
  PersonClarificationKnownTitleSchema,
  PersonClarificationCandidateSchema,
  PersonSelectionClarificationSchema,
  PersonSelectionAnswerSchema,
} from '@lib/schemas/clarification';

function candidate(id = 1) {
  return { id, name: `Person ${id}` };
}

function clarification() {
  return {
    kind: 'person-selection' as const,
    clarificationRef: 'question-1',
    ref: 'person-1',
    sourceRevision: 4,
    candidates: [candidate()],
    hasMore: false,
  };
}

function answer() {
  return {
    clarificationRef: 'question-1',
    ref: 'person-1',
    sourceRevision: 4,
    personId: 1,
  };
}

describe('person clarification known titles', () => {
  // Statement coverage: both supported selection-aid media types allow an unavailable year.
  it.each(['movie', 'tv'])('accepts a %s title without a year', (mediaType) => {
    const input = { title: 'Example title', mediaType };
    expect(PersonClarificationKnownTitleSchema.parse(input)).toEqual(input);
  });

  // Statement coverage: display titles are normalized while available year information is retained.
  it('trims a known title and preserves its optional year', () => {
    expect(
      PersonClarificationKnownTitleSchema.parse({
        title: ' Example title ',
        mediaType: 'movie',
        year: 2018,
      }),
    ).toEqual({ title: 'Example title', mediaType: 'movie', year: 2018 });
  });

  // Branch coverage: a person entity must not be offered as a known movie or series title.
  it('rejects person media in the identity-selection aids', () => {
    expect(
      PersonClarificationKnownTitleSchema.safeParse({
        title: 'Another person',
        mediaType: 'person',
      }).success,
    ).toBe(false);
  });
});

describe('person clarification candidates', () => {
  // Branch coverage: missing enrichment and explicitly empty enrichment retain the candidate.
  it.each([candidate(), { ...candidate(), knownFor: [] }])(
    'normalizes a candidate without known titles: %j',
    (input) => {
      expect(PersonClarificationCandidateSchema.parse(input)).toEqual({
        ...candidate(),
        knownFor: [],
      });
    },
  );

  // Statement coverage: two known titles and normalized identity names form a usable candidate.
  it('accepts two known titles with mixed media types and optional years', () => {
    const knownFor = [
      { title: 'Example movie', mediaType: 'movie', year: 2018 },
      { title: 'Example series', mediaType: 'tv' },
    ];
    expect(
      PersonClarificationCandidateSchema.parse({ id: 1, name: ' Example person ', knownFor }),
    ).toEqual({ id: 1, name: 'Example person', knownFor });
  });

  // Branch coverage: the approved two-title limit is asserted independently of its configuration constant.
  it('rejects three known titles rather than silently truncating them', () => {
    const knownFor = Array.from({ length: 3 }, (_, index) => ({
      title: `Title ${index + 1}`,
      mediaType: 'movie',
    }));
    expect(PersonClarificationCandidateSchema.safeParse({ ...candidate(), knownFor }).success).toBe(
      false,
    );
  });
});

describe('person selection clarification', () => {
  // Branch coverage: the approved group boundaries are fixed at one and five, independently of configuration.
  it.each([1, 5])('accepts a group of %i distinct candidates', (count) => {
    const candidates = Array.from({ length: count }, (_, index) => candidate(index + 1));
    const input = { ...clarification(), candidates };
    expect(PersonSelectionClarificationSchema.parse(input)).toEqual({
      ...input,
      candidates: candidates.map((person) => ({ ...person, knownFor: [] })),
    });
  });

  // Branch coverage: no-match is not an empty selection and a sixth candidate requires another group.
  it.each([0, 6])('rejects a group of %i candidates', (count) => {
    const candidates = Array.from({ length: count }, (_, index) => candidate(index + 1));
    expect(
      PersonSelectionClarificationSchema.safeParse({ ...clarification(), candidates }).success,
    ).toBe(false);
  });

  // Branch coverage: different display names cannot make a repeated identity a distinct candidate.
  it('rejects duplicate candidate IDs', () => {
    expect(
      PersonSelectionClarificationSchema.safeParse({
        ...clarification(),
        candidates: [candidate(), { id: 1, name: 'Another spelling' }],
      }).success,
    ).toBe(false);
  });

  // Statement coverage: identical display names remain valid alternatives when their identities differ.
  it('accepts different IDs sharing the same display name', () => {
    const parsed = PersonSelectionClarificationSchema.parse({
      ...clarification(),
      candidates: [
        { id: 1, name: 'Same name' },
        { id: 2, name: 'Same name' },
      ],
    });
    expect(parsed.candidates.map((person) => person.id)).toEqual([1, 2]);
  });

  // Statement coverage: group availability is retained independently from the pending-request reference.
  it.each([false, true])('retains hasMore=%s and the offered question binding', (hasMore) => {
    const input = { ...clarification(), hasMore };
    expect(PersonSelectionClarificationSchema.parse(input)).toEqual({
      ...input,
      candidates: [{ ...candidate(), knownFor: [] }],
    });
  });

  // Branch coverage: offered candidates cannot carry active-search mutations alongside presentation state.
  it('rejects embedded active criteria', () => {
    expect(
      PersonSelectionClarificationSchema.safeParse({
        ...clarification(),
        people: [candidate()],
        filters: { minRating: 7 },
      }).success,
    ).toBe(false);
  });
});

describe('person selection answers', () => {
  // Statement coverage: an answer carries the offered question, pending request, revision and chosen identity.
  it('preserves the complete selection binding', () => {
    expect(PersonSelectionAnswerSchema.parse(answer())).toEqual(answer());
  });

  // Branch coverage: selection answers cannot smuggle filter changes or an accepted identity record.
  it.each([
    { changes: [{ field: 'minRating', operation: 'set', value: 8 }] },
    { person: candidate() },
  ])('rejects state-changing data outside the selection contract: %j', (extra) => {
    expect(PersonSelectionAnswerSchema.safeParse({ ...answer(), ...extra }).success).toBe(false);
  });
});
