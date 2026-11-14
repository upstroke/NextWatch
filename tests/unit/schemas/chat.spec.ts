import { describe, expect, it } from 'vitest';
import { ChatIntentSchema } from '@lib/schemas/chat';

const clarification = { questionKey: 'keyword-ambiguous', options: ['Time travel'] };
const change = { field: 'minRating', operation: 'set', value: 8 };

describe('chat intent status contract', () => {
  it.each(['ready', 'needs_clarification', 'unsupported', 'error'])(
    'accepts the minimal %s intent and defaults changes',
    (status) => {
      // Statement coverage: each status has a usable canonical payload.
      const input =
        status === 'needs_clarification'
          ? { status, baseRevision: 0, clarification }
          : { status, baseRevision: 0 };

      expect(ChatIntentSchema.parse(input)).toEqual({ ...input, changes: [] });
    },
  );

  // Branch coverage: clarification status and payload must agree.
  it('requires clarification data for clarification status', () => {
    expect(
      ChatIntentSchema.safeParse({
        status: 'needs_clarification',
        baseRevision: 0,
        changes: [],
      }).success,
    ).toBe(false);
  });

  // Branch coverage: non-clarification statuses cannot carry a question.
  it.each(['ready', 'unsupported', 'error'])(
    'rejects clarification data on %s intents',
    (status) => {
      expect(
        ChatIntentSchema.safeParse({
          status,
          baseRevision: 0,
          changes: [],
          clarification,
        }).success,
      ).toBe(false);
    },
  );

  // Branch coverage: non-ready statuses must not hide proposed changes.
  it.each(['needs_clarification', 'unsupported', 'error'])(
    'rejects filter changes on %s intents',
    (status) => {
      const input =
        status === 'needs_clarification'
          ? { status, baseRevision: 0, changes: [change], clarification }
          : { status, baseRevision: 0, changes: [change] };

      expect(ChatIntentSchema.safeParse(input).success).toBe(false);
    },
  );

  // Statement coverage: actionable filter changes remain supported.
  it('accepts changes only on ready intents', () => {
    const input = { status: 'ready', baseRevision: 0, changes: [change] };
    expect(ChatIntentSchema.parse(input)).toEqual(input);
  });

  // Statement coverage: usable question keys and labels are trimmed.
  it('normalizes surrounding whitespace in clarification data', () => {
    const parsed = ChatIntentSchema.parse({
      status: 'needs_clarification',
      baseRevision: 0,
      clarification: { questionKey: ' keyword-ambiguous ', options: [' Time travel '] },
    });

    expect(parsed).toEqual({
      status: 'needs_clarification',
      baseRevision: 0,
      changes: [],
      clarification,
    });
  });

  // Branch coverage: a pending clarification needs a usable key and choices.
  it.each([
    { questionKey: '   ', options: ['Time travel'] },
    { questionKey: 'keyword-ambiguous', options: ['   '] },
    { questionKey: 'keyword-ambiguous', options: [] },
  ])('rejects unusable clarification data: %j', (invalidClarification) => {
    expect(
      ChatIntentSchema.safeParse({
        status: 'needs_clarification',
        baseRevision: 0,
        clarification: invalidClarification,
      }).success,
    ).toBe(false);
  });
});
