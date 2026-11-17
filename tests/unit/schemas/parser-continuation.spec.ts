import { describe, expect, it } from 'vitest';
import {
  MAX_PARSER_CONTINUATION_INTENTIONS,
  MAX_PARSER_CONTINUATION_QUERIES,
  MAX_PARSER_INPUT_LENGTH,
} from '@lib/config/domain';
import {
  ParserContinuationSchema,
  validateParserContinuation,
} from '@lib/schemas/parser-continuation';
import type { ParserContinuation } from '@lib/schemas/parser-continuation';
import type { PendingEntityQueries } from '@lib/schemas/search-state';

function replacement() {
  return {
    intentions: [
      {
        ref: 'replace-tom',
        criterion: 'person',
        operation: 'replace',
        generation: 1,
        inputExcerpt: 'Replace Tom with Chris and Brad',
        source: { mode: 'unresolved', description: 'Tom' },
        children: [
          {
            ownership: 'continuation',
            ref: 'chris',
            generation: 1,
            query: { text: 'Chris', correction: null },
          },
          {
            ownership: 'continuation',
            ref: 'brad',
            generation: 0,
            query: { text: 'Brad', correction: null },
          },
        ],
      },
    ],
  } satisfies ParserContinuation;
}

function pending(): PendingEntityQueries {
  return {
    personQueries: [{ ref: 'canonical-chris', query: 'Chris', operation: 'add' }],
    keywordQueries: [{ ref: 'canonical-keyword', query: 'Time travel' }],
  };
}

function linked(criterion: 'person' | 'keyword', ref: string) {
  return {
    intentions: [
      {
        ref: 'linked-addition',
        criterion,
        operation: 'add',
        generation: 0,
        inputExcerpt: 'Add another selection',
        source: null,
        children: [{ ownership: 'canonical', ref }],
      },
    ],
  } satisfies ParserContinuation;
}

describe('parser continuation ownership', () => {
  // Statement coverage: preserve all unresolved destinations and their source without accepting identities.
  it('retains an entire replacement with independent child generations', () => {
    const input = replacement();
    const snapshot = structuredClone(input);
    const result = validateParserContinuation(input, pending());
    expect(result.success).toBe(true);
    if (!result.success) throw new Error('Expected valid continuation');
    expect(result.data).toEqual(snapshot);
    result.data.intentions.length = 0;
    expect(input).toEqual(snapshot);
  });

  // Statement coverage: a source-bound replacement and correction retain original wording.
  it('supports a supplied source reference and spelling hint', () => {
    const input = replacement();
    const entry = input.intentions[0]!;
    const proposal = {
      intentions: [
        {
          ...entry,
          source: { mode: 'reference', ref: 'accepted-tom' },
          children: [
            { ...entry.children[0]!, query: { text: 'Chris Evnas', correction: 'Chris Evans' } },
          ],
        },
      ],
    };
    expect(ParserContinuationSchema.parse(proposal)).toEqual(proposal);
  });

  // Branch coverage: references are unique across intention and child ownership scopes.
  it.each(['replace-tom', 'chris'])('rejects duplicate reference %s', (ref) => {
    const input = replacement();
    input.intentions[0]!.children[1]!.ref = ref;
    expect(ParserContinuationSchema.safeParse(input).success).toBe(false);
  });

  // Branch coverage: one child cannot belong to two intentions.
  it('rejects a child shared by separate parents', () => {
    const input = replacement();
    input.intentions.push({ ...structuredClone(input.intentions[0]!), ref: 'other-parent' });
    expect(ParserContinuationSchema.safeParse(input).success).toBe(false);
  });

  // Branch coverage: a child edit cannot be newer than its owning intention.
  it('rejects a child generation ahead of its parent', () => {
    const input = replacement();
    input.intentions[0]!.children[0]!.generation = 2;
    expect(ParserContinuationSchema.safeParse(input).success).toBe(false);
  });

  // Branch coverage: whole-person selection replacement is not a supported operation.
  it('rejects person replace_all', () => {
    const entry = replacement().intentions[0]!;
    expect(
      ParserContinuationSchema.safeParse({
        intentions: [{ ...entry, operation: 'replace_all', source: null }],
      }).success,
    ).toBe(false);
  });

  // Statement coverage: complete keyword and genre selections can remain owned and unresolved.
  it.each(['keyword', 'genre'])('retains a whole %s selection', (criterion) => {
    const entry = replacement().intentions[0]!;
    const input = { intentions: [{ ...entry, criterion, operation: 'replace_all', source: null }] };
    expect(ParserContinuationSchema.parse(input)).toEqual(input);
  });

  // Statement coverage: unclear removal sources do not require artificial entity queries.
  it('retains a non-query removal intention', () => {
    const entry = replacement().intentions[0]!;
    const input = { intentions: [{ ...entry, operation: 'remove', children: [] }] };
    expect(ParserContinuationSchema.parse(input)).toEqual(input);
  });

  // Branch coverage: distributed children cannot evade the total query bound.
  it('rejects aggregate child overflow across intentions', () => {
    const entry = replacement().intentions[0]!;
    const children = Array.from({ length: MAX_PARSER_CONTINUATION_QUERIES }, (_, index) => ({
      ...entry.children[0]!,
      ref: `child-${index}`,
    }));
    const input = {
      intentions: [
        { ...entry, children },
        { ...entry, ref: 'overflow-parent', children: [entry.children[1]!] },
      ],
    };
    expect(ParserContinuationSchema.safeParse(input).success).toBe(false);
  });

  // Branch coverage: bounded non-query work cannot grow without limit.
  it('rejects intention overflow', () => {
    const entry = replacement().intentions[0]!;
    const intentions = Array.from(
      { length: MAX_PARSER_CONTINUATION_INTENTIONS + 1 },
      (_, index) => ({
        ...entry,
        ref: `remove-${index}`,
        operation: 'remove',
        children: [],
      }),
    );
    expect(ParserContinuationSchema.safeParse({ intentions }).success).toBe(false);
  });

  // Branch coverage: valid individual excerpts still share one retained-text budget.
  it('rejects aggregate retained text overflow', () => {
    const entry = replacement().intentions[0]!;
    const intentions = Array.from({ length: 9 }, (_, index) => ({
      ...entry,
      ref: `remove-${index}`,
      operation: 'remove',
      children: [],
      inputExcerpt: 'x'.repeat(MAX_PARSER_INPUT_LENGTH),
    }));
    expect(ParserContinuationSchema.safeParse({ intentions }).success).toBe(false);
  });
});

describe('parser continuation canonical bindings', () => {
  // Statement coverage: canonical additions keep their sole text owner in SearchState.
  it.each([
    { criterion: 'person', ref: 'canonical-chris' },
    { criterion: 'keyword', ref: 'canonical-keyword' },
  ] as const)('links a canonical $criterion addition without copying it', ({ criterion, ref }) => {
    const canonical = pending();
    const snapshot = structuredClone(canonical);
    const input = linked(criterion, ref);
    const result = validateParserContinuation(input, canonical);
    expect(result.success).toBe(true);
    if (!result.success) throw new Error('Expected valid link');
    expect(result.data).toEqual(input);
    expect(canonical).toEqual(snapshot);
  });

  // Branch coverage: canonical refs must exist and belong to the requested criterion.
  it.each(['missing', 'canonical-keyword'])('rejects an invalid person link to %s', (ref) => {
    expect(validateParserContinuation(linked('person', ref), pending()).success).toBe(false);
  });

  // Branch coverage: a canonical replacement cannot masquerade as an addition.
  it('rejects an operation mismatch', () => {
    const canonical = pending();
    canonical.personQueries = [
      { ref: 'canonical-chris', query: 'Chris', operation: 'replace', targetPersonId: 1 },
    ];
    expect(validateParserContinuation(linked('person', 'canonical-chris'), canonical).success).toBe(
      false,
    );
  });

  // Branch coverage: compound replacement destinations cannot be independent canonical additions.
  it('rejects a canonical child under a replacement', () => {
    const entry = replacement().intentions[0]!;
    const input = {
      intentions: [{ ...entry, children: [{ ownership: 'canonical', ref: 'canonical-chris' }] }],
    };
    expect(validateParserContinuation(input, pending()).success).toBe(false);
  });

  // Branch coverage: canonical refs cannot be reused by a parent or an owned child.
  it.each(['parent', 'child'])('rejects canonical reference reuse by a %s', (scope) => {
    const input = replacement();
    if (scope === 'parent') input.intentions[0]!.ref = 'canonical-chris';
    else input.intentions[0]!.children[0]!.ref = 'canonical-chris';
    expect(validateParserContinuation(input, pending()).success).toBe(false);
  });

  // Branch coverage: unlinked canonical work also counts, but a linked query is not counted twice.
  it('counts canonical queries once alongside owned children', () => {
    const entry = replacement().intentions[0]!;
    const children = Array.from({ length: MAX_PARSER_CONTINUATION_QUERIES - 2 }, (_, index) => ({
      ...entry.children[0]!,
      ref: `owned-${index}`,
    }));
    const linkedEntry = linked('person', 'canonical-chris').intentions[0]!;
    const input = { intentions: [{ ...entry, children }, linkedEntry] };
    expect(validateParserContinuation(input, pending()).success).toBe(true);
    children.push({ ...entry.children[0]!, ref: 'owned-overflow' });
    expect(validateParserContinuation(input, pending()).success).toBe(false);
  });

  // Statement coverage: empty continuation neither discards nor duplicates unrelated canonical work.
  it('accepts no retained intentions while canonical requests remain open', () => {
    expect(validateParserContinuation({ intentions: [] }, pending()).success).toBe(true);
  });
});
