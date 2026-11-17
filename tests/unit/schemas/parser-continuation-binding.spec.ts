import { describe, expect, it } from 'vitest';
import { MAX_PARSER_CONTINUATION_BINDINGS } from '@lib/config/domain';
import {
  ParserContinuationBindingRegistrySchema,
  ParserContinuationBindingCommandSchema,
} from '@lib/schemas/parser-continuation-binding';

function registry() {
  return {
    sessionRef: 'session',
    epoch: 0,
    sequence: 2,
    outstanding: [
      {
        bindingRef: 'continuation-binding-2',
        sessionRef: 'session',
        epoch: 0,
        sourceRevision: 4,
        purpose: 'query_resolution',
        target: { ownership: 'canonical', criterion: 'person', queryRef: 'p' },
      },
    ],
  };
}

describe('continuation binding structural invariants', () => {
  // Statement coverage: consumed sequence gaps are valid but lifetime membership remains authoritative.
  it('allows gaps and exposes no initialization defaults', () => {
    expect(ParserContinuationBindingRegistrySchema.safeParse(registry()).success).toBe(true);
    const { sessionRef: _sessionRef, ...missingLifetime } = registry();
    expect(ParserContinuationBindingRegistrySchema.safeParse(missingLifetime).success).toBe(false);
  });

  // Branch coverage: malformed allocations and lifetime/counter associations cannot revive bindings.
  it.each([
    { bindingRef: 'continuation-binding-02' },
    { bindingRef: 'continuation-binding-3' },
    { bindingRef: 'continuation-binding-9007199254740992' },
    { sessionRef: 'other' },
    { epoch: 1 },
  ])('rejects inconsistent stored binding %j', (change) => {
    const value = registry();
    value.outstanding = value.outstanding.map((binding) => ({ ...binding, ...change }));
    expect(ParserContinuationBindingRegistrySchema.safeParse(value).success).toBe(false);
  });

  // Branch coverage: freshness changes cannot reserve a second logical target slot.
  it('rejects duplicate logical keys even with distinct issued references', () => {
    const value = registry();
    value.outstanding.push({
      ...value.outstanding[0]!,
      bindingRef: 'continuation-binding-1',
      sourceRevision: 3,
    });
    expect(ParserContinuationBindingRegistrySchema.safeParse(value).success).toBe(false);
  });

  // Branch coverage: registry capacity is derived and enforced without truncating entries.
  it('accepts the exact bound and rejects an extra entry', () => {
    const value = registry();
    value.sequence = MAX_PARSER_CONTINUATION_BINDINGS + 1;
    value.outstanding = Array.from({ length: MAX_PARSER_CONTINUATION_BINDINGS }, (_, index) => ({
      ...value.outstanding[0]!,
      bindingRef: `continuation-binding-${index + 1}`,
      target: { ownership: 'canonical', criterion: 'person', queryRef: `p-${index}` },
    }));
    expect(ParserContinuationBindingRegistrySchema.safeParse(value).success).toBe(true);
    value.outstanding.push({
      ...value.outstanding[0]!,
      bindingRef: `continuation-binding-${value.sequence}`,
      target: { ownership: 'canonical', criterion: 'person', queryRef: 'extra' },
    });
    expect(ParserContinuationBindingRegistrySchema.safeParse(value).success).toBe(false);
  });

  // Branch coverage: unsupported owned question commands are representable, but not legitimate issued records.
  it('distinguishes issuance capability from stored question authority', () => {
    const target = {
      ownership: 'continuation',
      criterion: 'person',
      intentionRef: 'parent',
      queryRef: 'child',
      queryGeneration: 0,
    };
    const question = { kind: 'person-no-match', questionRef: 'person-question-1' };
    expect(
      ParserContinuationBindingCommandSchema.safeParse({
        allocation: { mode: 'create' },
        purpose: 'question_answer',
        target,
        question,
      }).success,
    ).toBe(true);
    const value = registry();
    expect(
      ParserContinuationBindingRegistrySchema.safeParse({
        ...value,
        outstanding: [{ ...value.outstanding[0], purpose: 'question_answer', target, question }],
      }).success,
    ).toBe(false);
    expect(
      ParserContinuationBindingCommandSchema.safeParse({
        allocation: { mode: 'create', expectedBindingRef: 'old' },
        purpose: 'query_resolution',
        target,
        question,
      }).success,
    ).toBe(false);
  });
});
