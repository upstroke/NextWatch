import { z } from 'zod';

const rawWatchProviderSchema = z.object({
  provider_id: z.number().int().positive(),
  provider_name: z.string().min(1),
  logo_path: z.string().nullable().optional(),
  display_priority: z.number().int().nonnegative().optional(),
});

const rawWatchProviderCategorySchema = z.object({
  link: z.string().optional(),
  flatrate: z.array(rawWatchProviderSchema).optional(),
  rent: z.array(rawWatchProviderSchema).optional(),
  buy: z.array(rawWatchProviderSchema).optional(),
});

export const TmdbWatchProvidersRawSchema = z.object({
  id: z.number().int().positive(),
  results: z.record(z.string(), rawWatchProviderCategorySchema).optional(),
});

export type TmdbWatchProvidersRaw = z.infer<typeof TmdbWatchProvidersRawSchema>;

const watchProviderSchema = z
  .object({
    id: z.number().int().positive(),
    name: z.string().min(1),
    logoPath: z.string().nullable().optional(),
    displayPriority: z.number().int().nonnegative().optional(),
  })
  .strict();

export const WatchProviderAvailabilitySchema = z
  .object({
    mediaId: z.number().int().positive(),
    region: z.string().regex(/^[A-Z]{2}$/),
    stream: z.array(watchProviderSchema),
    rent: z.array(watchProviderSchema),
    buy: z.array(watchProviderSchema),
  })
  .strict();

export type WatchProvider = z.infer<typeof watchProviderSchema>;
export type WatchProviderAvailability = z.infer<typeof WatchProviderAvailabilitySchema>;
