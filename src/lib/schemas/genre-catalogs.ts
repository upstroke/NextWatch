import { z } from 'zod';

const genreSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().trim().min(1),
}).strict();

const genreListSchema = z.array(genreSchema).refine(
  (genres) => new Set(genres.map((genre) => genre.id)).size === genres.length,
  { message: 'Genre catalog IDs must be unique' },
);

/**
 * Complete, already fetched Movie and TV genre lists from the application boundary.
 * Presence of both lists distinguishes loaded catalogs from missing data.
 * Structural validation does not prove successful retrieval or completeness;
 * the supplying server boundary must establish these, never the language model.
 */
export const GenreCatalogsSchema = z.object({
  movie: genreListSchema,
  tv: genreListSchema,
}).strict();

export type GenreCatalogs = z.infer<typeof GenreCatalogsSchema>;
