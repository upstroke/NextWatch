import { describe, expect, it } from 'vitest';
import { MAX_GENRE_IDS, MAX_KEYWORD_IDS, MAX_PERSON_IDS } from '@lib/config/domain';
import { ParserPreparedContextSchema } from '@lib/schemas/parser';
import { parserInvocationFixture } from '@test-fixtures/parser/contract';

type Criterion = 'person' | 'keyword' | 'genre';
const capacityCases = [
  { criterion: 'person', maximum: MAX_PERSON_IDS },
  { criterion: 'keyword', maximum: MAX_KEYWORD_IDS },
  { criterion: 'genre', maximum: MAX_GENRE_IDS },
] as const;

function capacityContext(criterion: Criterion, maximum: number) {
  const { context } = parserInvocationFixture();
  context.criteria.people = [];
  for (let index = 0; index < maximum; index += 1) {
    const accepted = {
      ref: `accepted-${criterion}-${index}`,
      label: `Accepted ${criterion} ${index}`,
    };
    if (criterion === 'person') context.criteria.people.push(accepted);
    else if (criterion === 'keyword') context.criteria.keywords.push(accepted);
    else context.criteria.genres.push({ ...accepted, activity: 'active' });
  }
  context.pending = [
    {
      scope: 'query',
      ref: 'capacity-query',
      criterion,
      operation: 'add',
      parentRef: null,
      source: null,
      query: { text: 'Another selection', correction: null },
      status: 'unresolved',
    },
  ];
  return {
    ...context,
    activeClarification: {
      kind: 'capacity' as const,
      criterion,
      targets: [{ scope: 'query' as const, ref: 'capacity-query' }],
      occupied: maximum,
      reserved: 0,
      maximum,
    },
  };
}

describe('prepared parser context keyword references', () => {
  // Statement coverage: an accepted keyword can serve as a typed removal source.
  it('accepts a removal intention referencing an accepted keyword', () => {
    const { context } = parserInvocationFixture();
    context.criteria.keywords = [{ ref: 'accepted-keyword', label: 'Time travel' }];
    context.pending = [
      {
        scope: 'intention',
        ref: 'remove-keyword',
        criterion: 'keyword',
        operation: 'remove',
        source: { mode: 'reference', ref: 'accepted-keyword' },
        queryRefs: [],
        blockers: [],
      },
    ];
    expect(ParserPreparedContextSchema.parse(context)).toEqual(context);
  });

  // Branch coverage: accepted keyword and pending references must remain distinct.
  it('rejects a collision between accepted keyword and pending query references', () => {
    const context = capacityContext('keyword', MAX_KEYWORD_IDS);
    context.criteria.keywords[0]!.ref = 'capacity-query';
    expect(ParserPreparedContextSchema.safeParse(context).success).toBe(false);
  });
});

describe('prepared parser context capacity clarifications', () => {
  // Statement/branch coverage: all three criteria accept their configured boundary.
  it.each(capacityCases)(
    'accepts a $criterion clarification at capacity',
    ({ criterion, maximum }) => {
      const context = capacityContext(criterion, maximum);
      const snapshot = structuredClone(context);
      expect(ParserPreparedContextSchema.parse(context)).toEqual(snapshot);
      expect(context).toEqual(snapshot);
    },
  );

  // Branch coverage: a positive but incorrect maximum cannot override domain limits.
  it.each(capacityCases)('rejects an incorrect $criterion maximum', ({ criterion, maximum }) => {
    const context = capacityContext(criterion, maximum);
    context.activeClarification.maximum = maximum + 1;
    expect(ParserPreparedContextSchema.safeParse(context).success).toBe(false);
  });

  // Branch coverage: occupied and reserved slots jointly obey the configured limit.
  it.each(capacityCases)(
    'rejects $criterion occupancy plus reservations above capacity',
    ({ criterion, maximum }) => {
      const context = capacityContext(criterion, maximum);
      context.activeClarification.reserved = 1;
      expect(ParserPreparedContextSchema.safeParse(context).success).toBe(false);
    },
  );

  // Branch coverage: a capacity target must exist in the supplied pending context.
  it('rejects an unknown target reference', () => {
    const context = capacityContext('person', MAX_PERSON_IDS);
    context.activeClarification.targets = [{ scope: 'query', ref: 'unknown-query' }];
    expect(ParserPreparedContextSchema.safeParse(context).success).toBe(false);
  });

  // Branch coverage: a matching reference cannot be addressed under a different scope.
  it('rejects a target with the wrong scope', () => {
    const context = capacityContext('person', MAX_PERSON_IDS);
    const invalid = {
      ...context,
      activeClarification: {
        ...context.activeClarification,
        targets: [{ scope: 'intention' as const, ref: 'capacity-query' }],
      },
    };
    expect(ParserPreparedContextSchema.safeParse(invalid).success).toBe(false);
  });

  // Branch coverage: a person capacity question cannot target a keyword query.
  it('rejects a target belonging to another criterion', () => {
    const context = capacityContext('person', MAX_PERSON_IDS);
    context.pending = context.pending.map((entry) => ({ ...entry, criterion: 'keyword' }));
    expect(ParserPreparedContextSchema.safeParse(context).success).toBe(false);
  });

  // Branch coverage: the same pending target cannot appear twice in one question.
  it('rejects duplicate targets', () => {
    const context = capacityContext('person', MAX_PERSON_IDS);
    context.activeClarification.targets.push({ scope: 'query', ref: 'capacity-query' });
    expect(ParserPreparedContextSchema.safeParse(context).success).toBe(false);
  });

  // Statement coverage: a correctly associated intention can also be a capacity target.
  it('accepts a correctly scoped intention target with its associated child', () => {
    const prepared = capacityContext('person', MAX_PERSON_IDS);
    const { context } = parserInvocationFixture();
    context.criteria = prepared.criteria;
    context.pending = [
      {
        scope: 'intention',
        ref: 'capacity-intention',
        criterion: 'person',
        operation: 'add',
        source: null,
        queryRefs: ['capacity-query'],
        blockers: ['capacity'],
      },
      {
        scope: 'query',
        ref: 'capacity-query',
        criterion: 'person',
        operation: 'add',
        parentRef: 'capacity-intention',
        source: null,
        query: { text: 'Another selection', correction: null },
        status: 'unresolved',
      },
    ];
    context.activeClarification = {
      ...prepared.activeClarification,
      targets: [{ scope: 'intention', ref: 'capacity-intention' }],
    };
    expect(ParserPreparedContextSchema.parse(context)).toEqual(context);
  });
});
