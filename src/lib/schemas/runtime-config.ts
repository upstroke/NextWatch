import { z } from 'zod';
import { AppLocaleSchema } from './locale';

export const TmdbRuntimeConfigSchema = z.object({
  apiReadAccessToken: z.string(),
  baseUrl: z.string(),
  defaultLocale: AppLocaleSchema.default('en'),
});

export type TmdbRuntimeConfig = z.infer<typeof TmdbRuntimeConfigSchema>;
