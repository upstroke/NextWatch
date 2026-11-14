import { z } from 'zod';

export const ChatStatusSchema = z.enum(['ready', 'needs_clarification', 'unsupported', 'error']);

export const FilterOperationSchema = z.enum(['set', 'add', 'remove', 'replace']);

export const FilterChangeSchema = z.object({
  field: z.string().min(1),
  operation: FilterOperationSchema,
  value: z.unknown(),
});

const ClarificationSchema = z
  .object({
    questionKey: z.string().trim().min(1),
    options: z.array(z.string().trim().min(1)).min(1),
  })
  .strict();

const IntentBaseSchema = z.object({
  baseRevision: z.number().int().nonnegative(),
  evidence: z
    .object({
      messageId: z.string().min(1),
      excerpt: z.string().min(1),
    })
    .optional(),
});

export const ChatIntentSchema = z.discriminatedUnion('status', [
  IntentBaseSchema.extend({
    status: z.literal(ChatStatusSchema.enum.ready),
    changes: z.array(FilterChangeSchema).default([]),
  }).strict(),
  IntentBaseSchema.extend({
    status: z.literal(ChatStatusSchema.enum.needs_clarification),
    changes: z.array(FilterChangeSchema).max(0).default([]),
    clarification: ClarificationSchema,
  }).strict(),
  IntentBaseSchema.extend({
    status: z.literal(ChatStatusSchema.enum.unsupported),
    changes: z.array(FilterChangeSchema).max(0).default([]),
  }).strict(),
  IntentBaseSchema.extend({
    status: z.literal(ChatStatusSchema.enum.error),
    changes: z.array(FilterChangeSchema).max(0).default([]),
  }).strict(),
]);

export type ChatStatus = z.infer<typeof ChatStatusSchema>;
export type FilterOperation = z.infer<typeof FilterOperationSchema>;
export type FilterChange = z.infer<typeof FilterChangeSchema>;
export type ChatIntent = z.infer<typeof ChatIntentSchema>;
