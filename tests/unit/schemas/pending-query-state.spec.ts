import { describe, expect, it } from 'vitest';
import { MAX_KEYWORD_IDS, MAX_PERSON_IDS } from '@lib/config/domain';
import { SearchStateSchema } from '@lib/schemas/search-state';

function personAddition(ref = 'person-1', query = 'Example person') {
  return { ref, query, operation: 'add' };
}

function personReplacement(ref = 'replacement-1', targetPersonId = 501) {
  return { ref, query: 'Replacement person', operation: 'replace', targetPersonId };
}

function stateInput() {
  return {
    mode: 'discover',
    revision: 4,
    filters: { genreIds: [878] },
    people: [{ id: 501, name: 'Accepted person' }],
    pendingQueries: {
      personQueries: [personAddition()],
      keywordQueries: [{ ref: 'keyword-1', query: 'time travel' }],
    },
  };
}

describe('pending-query state contract', () => {
  // Statement coverage: pending references survive query normalization without becoming active IDs.
  it('preserves stable references and accepted criteria while trimming query text', () => {
    const input = stateInput();
    input.pendingQueries.personQueries[0] = personAddition('person-1', ' Another person ');
    input.pendingQueries.keywordQueries[0] = { ref: 'keyword-1', query: ' time travel ' };
    const snapshot = structuredClone(input);
    const result = SearchStateSchema.parse(input);

    expect(result.pendingQueries).toEqual({
      personQueries: [personAddition('person-1', 'Another person')],
      keywordQueries: [{ ref: 'keyword-1', query: 'time travel' }],
    });
    expect(result.people).toEqual(input.people);
    expect(result.filters.genreIds).toEqual([878]);
    expect(result.filters.keywordIds).toEqual([]);
    expect(result.filters).not.toHaveProperty('personIds');
    expect(result.revision).toBe(4);
    expect(input).toEqual(snapshot);
  });

  // Statement coverage: replacements retain their accepted target until a later atomic transition.
  it('represents replacement context without removing the accepted person', () => {
    const input = {
      ...stateInput(),
      pendingQueries: { personQueries: [personReplacement()], keywordQueries: [] },
    };
    const result = SearchStateSchema.parse(input);
    expect(result.people).toEqual([{ id: 501, name: 'Accepted person' }]);
    expect(result.pendingQueries.personQueries).toEqual([personReplacement()]);
  });

  // Branch coverage: legacy string lists are not silently assigned invented references.
  it.each([
    { personQueries: ['Example person'], keywordQueries: [] },
    { personQueries: [], keywordQueries: ['time travel'] },
  ])('rejects legacy pending strings: %j', (pendingQueries) => {
    expect(SearchStateSchema.safeParse({ ...stateInput(), pendingQueries }).success).toBe(false);
  });

  // Branch coverage: one reference cannot identify different pending requests, including across kinds.
  it.each([
    {
      personQueries: [personAddition(), personAddition('person-1', 'Other person')],
      keywordQueries: [],
    },
    {
      personQueries: [],
      keywordQueries: [
        { ref: 'same', query: 'space' },
        { ref: 'same', query: 'time travel' },
      ],
    },
    { personQueries: [personAddition('same')], keywordQueries: [{ ref: 'same', query: 'space' }] },
  ])('rejects duplicate pending references: %j', (pendingQueries) => {
    expect(SearchStateSchema.safeParse({ ...stateInput(), pendingQueries }).success).toBe(false);
  });

  // Branch coverage: equal unresolved names do not prove equal provider identities.
  it('preserves independently referenced requests with the same unresolved name', () => {
    const pendingQueries = {
      personQueries: [personAddition('person-1'), personAddition('person-2')],
      keywordQueries: [],
    };
    expect(SearchStateSchema.parse({ ...stateInput(), pendingQueries }).pendingQueries).toEqual(
      pendingQueries,
    );
  });

  // Branch coverage: replacement context must refer to exactly one currently accepted target.
  it.each([
    [personReplacement('replacement-1', 999)],
    [personReplacement('replacement-1'), personReplacement('replacement-2')],
  ])('rejects missing or multiply reserved replacement targets: %j', (...personQueries) => {
    const input = {
      ...stateInput(),
      pendingQueries: { personQueries, keywordQueries: [] },
    };
    const snapshot = structuredClone(input);
    expect(SearchStateSchema.safeParse(input).success).toBe(false);
    expect(input).toEqual(snapshot);
  });

  // Branch coverage: accepted people and pending additions share the existing person limit.
  it('reserves person slots for additions but not replacements', () => {
    const people = Array.from({ length: MAX_PERSON_IDS - 1 }, (_, index) => ({
      id: index + 1,
      name: `Accepted person ${index + 1}`,
    }));
    const input = {
      ...stateInput(),
      people,
      pendingQueries: {
        personQueries: [personAddition(), personReplacement('replacement-1', 1)],
        keywordQueries: [],
      },
    };
    const snapshot = structuredClone(input);
    expect(SearchStateSchema.safeParse(input).success).toBe(true);
    expect(
      SearchStateSchema.safeParse({
        ...input,
        pendingQueries: {
          ...input.pendingQueries,
          personQueries: [...input.pendingQueries.personQueries, personAddition('extra')],
        },
      }).success,
    ).toBe(false);
    expect(input).toEqual(snapshot);
  });

  // Branch coverage: a full accepted-person set can still request an atomic replacement.
  it('allows a replacement at the accepted-person limit without an additional slot', () => {
    const people = Array.from({ length: MAX_PERSON_IDS }, (_, index) => ({
      id: index + 1,
      name: `Accepted person ${index + 1}`,
    }));
    expect(
      SearchStateSchema.safeParse({
        ...stateInput(),
        people,
        pendingQueries: {
          personQueries: [personReplacement('replacement-1', 1)],
          keywordQueries: [],
        },
      }).success,
    ).toBe(true);
  });

  // Branch coverage: active keyword IDs and pending keyword additions share the keyword limit.
  it('reserves keyword slots without changing accepted keyword IDs', () => {
    const keywordIds = Array.from({ length: MAX_KEYWORD_IDS - 1 }, (_, index) => index + 1);
    const input = {
      ...stateInput(),
      filters: { keywordIds },
      pendingQueries: {
        personQueries: [],
        keywordQueries: [{ ref: 'keyword-1', query: 'space' }],
      },
    };
    const snapshot = structuredClone(input);
    expect(SearchStateSchema.safeParse(input).success).toBe(true);
    expect(
      SearchStateSchema.safeParse({
        ...input,
        pendingQueries: {
          ...input.pendingQueries,
          keywordQueries: [
            ...input.pendingQueries.keywordQueries,
            { ref: 'extra', query: 'time travel' },
          ],
        },
      }).success,
    ).toBe(false);
    expect(input).toEqual(snapshot);
  });
});
