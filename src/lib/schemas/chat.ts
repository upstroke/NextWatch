import { z } from 'zod';

export const ChatStatusSchema = z.enum(['ready', 'needs_clarification', 'unsupported', 'error']);

export const FilterOperationSchema = z.enum(['set', 'add', 'remove', 'replace']);

export const FilterChangeSchema = z.object({
  field: z.string().min(1),
  operation: FilterOperationSchema,
  value: z.unknown()
});

export const ChatIntentSchema = z
  .object({
    status: ChatStatusSchema,
    baseRevision: z.number().int().nonnegative(),
    changes: z.array(FilterChangeSchema).default([]),
    clarification: z
      .object({
        questionKey: z.string().min(1),
        options: z.array(z.string().min(1)).default([])
      })
      .optional(),
    evidence: z
      .object({
        messageId: z.string().min(1),
        excerpt: z.string().min(1)
      })
      .optional()
  })
  .strict();

export type ChatStatus = z.infer<typeof ChatStatusSchema>;
export type FilterOperation = z.infer<typeof FilterOperationSchema>;
export type FilterChange = z.infer<typeof FilterChangeSchema>;
export type ChatIntent = z.infer<typeof ChatIntentSchema>;
