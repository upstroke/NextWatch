import { z } from 'zod';
import {
  MAX_PARSER_CONTINUATION_BINDINGS,
  MAX_PARSER_CONTINUATION_QUERIES,
} from '@lib/config/domain';
import { ParserInvocationSchema } from './parser';
import { PersonClarificationSchema } from './person-clarification-flow';

const reference = ParserInvocationSchema.shape.requestRef;
const counter = ParserInvocationSchema.shape.baseRevision;
const canonical = z
  .object({
    ownership: z.literal('canonical'),
    criterion: z.enum(['person', 'keyword']),
    queryRef: reference,
  })
  .strict();
const owned = z
  .object({
    ownership: z.literal('continuation'),
    criterion: z.enum(['person', 'keyword', 'genre']),
    intentionRef: reference,
    queryRef: reference,
    queryGeneration: counter,
  })
  .strict();
export const ParserContinuationBindingTargetSchema = z.discriminatedUnion('ownership', [
  canonical,
  owned,
]);
export type ParserContinuationBindingTarget = z.infer<typeof ParserContinuationBindingTargetSchema>;
export const ParserContinuationBindingPurposeSchema = z.enum([
  'query_resolution',
  'question_answer',
]);
export type ParserContinuationBindingPurpose = z.infer<
  typeof ParserContinuationBindingPurposeSchema
>;
const question = z
  .object({
    kind: z.union(PersonClarificationSchema.options.map((option) => option.shape.kind)),
    questionRef: reference,
  })
  .strict();
const personTarget = z.discriminatedUnion('ownership', [
  canonical.extend({ criterion: z.literal('person') }),
  owned.extend({ criterion: z.literal('person') }),
]);
const allocation = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('create') }).strict(),
  z.object({ mode: z.literal('renew'), expectedBindingRef: reference }).strict(),
]);
export const ParserContinuationBindingCommandSchema = z.discriminatedUnion('purpose', [
  z
    .object({
      allocation,
      purpose: z.literal('query_resolution'),
      target: ParserContinuationBindingTargetSchema,
    })
    .strict(),
  z
    .object({ allocation, purpose: z.literal('question_answer'), target: personTarget, question })
    .strict(),
]);
const bindingRef = reference
  .regex(/^continuation-binding-[1-9]\d*$/)
  .refine((value) => Number.isSafeInteger(Number(value.slice('continuation-binding-'.length))));
const base = { bindingRef, sessionRef: reference, epoch: counter, sourceRevision: counter };
export const ParserContinuationBindingSchema = z.discriminatedUnion('purpose', [
  z
    .object({
      ...base,
      purpose: z.literal('query_resolution'),
      target: ParserContinuationBindingTargetSchema,
    })
    .strict(),
  z
    .object({
      ...base,
      purpose: z.literal('question_answer'),
      target: canonical.extend({ criterion: z.literal('person') }),
      question,
    })
    .strict(),
]);
export type ParserContinuationBinding = z.infer<typeof ParserContinuationBindingSchema>;

/** Returns the structured logical target/purpose key, excluding freshness fields. */
export function getParserContinuationBindingKey(value: {
  target: ParserContinuationBindingTarget;
  purpose: ParserContinuationBindingPurpose;
}): string {
  const target = value.target;
  return JSON.stringify([
    target.ownership,
    target.criterion,
    target.queryRef,
    value.purpose,
    target.ownership === 'continuation' ? target.intentionRef : null,
  ]);
}

export const ParserContinuationBindingRegistrySchema = z
  .object({
    sessionRef: reference,
    epoch: counter,
    sequence: counter,
    outstanding: z.array(ParserContinuationBindingSchema).max(MAX_PARSER_CONTINUATION_BINDINGS),
  })
  .strict()
  .superRefine((registry, ctx) => {
    const refs = new Set<string>();
    const keys = new Set<string>();
    for (const binding of registry.outstanding) {
      const key = getParserContinuationBindingKey(binding);
      const sequence = Number(binding.bindingRef.slice('continuation-binding-'.length));
      if (
        binding.sessionRef !== registry.sessionRef ||
        binding.epoch !== registry.epoch ||
        sequence > registry.sequence ||
        refs.has(binding.bindingRef) ||
        keys.has(key)
      ) {
        ctx.addIssue({
          code: 'custom',
          message: 'Inconsistent binding registry association or allocation',
        });
      }
      refs.add(binding.bindingRef);
      keys.add(key);
    }
  });
export type ParserContinuationBindingRegistry = z.infer<
  typeof ParserContinuationBindingRegistrySchema
>;
export const ParserContinuationBindingAssociationSchema = z
  .object({ sessionRef: reference, epoch: counter, bindingRef: reference })
  .strict();
export const ParserContinuationBindingInvalidationsSchema = z
  .array(reference)
  .max(MAX_PARSER_CONTINUATION_QUERIES);
