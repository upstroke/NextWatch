import { z } from 'zod';

export const TmdbRuntimeConfigSchema = z.object({
  apiReadAccessToken: z.string(),
  baseUrl: z.string(),
});

export type TmdbRuntimeConfig = z.infer<typeof TmdbRuntimeConfigSchema>;
