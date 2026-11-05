import { describe, expect, it } from 'vitest';
import { DiscoverQuerySchema } from '../../../src/lib/schemas/discover-query';

describe('Discover query schema', () => {
  // Statement coverage: converts comma-separated genre IDs into a numeric array
  it('converts comma-separated genre IDs into a numeric array', () => {
    const query = DiscoverQuerySchema.parse({ genreIds: '28,878' });

    expect(query.genreIds).toEqual([28, 878]);
  });

  // Statement coverage: converts a single genre ID into a one-item array
  it('converts a single genre ID into a one-item array', () => {
    const query = DiscoverQuerySchema.parse({ genreIds: '28' });

    expect(query.genreIds).toEqual([28]);
  });

  // Branch coverage: accepts genre IDs that are already an array
  it('accepts genre IDs that are already an array', () => {
    const query = DiscoverQuerySchema.parse({ genreIds: [28, 878] });

    expect(query.genreIds).toEqual([28, 878]);
  });

  // Statement coverage: converts numeric query strings into numbers
  it('converts numeric query strings into numbers', () => {
    const query = DiscoverQuerySchema.parse({
      genreIds: '28,878',
      minRating: '7',
      yearFrom: '2024',
      yearTo: '2024',
      sortBy: 'vote_average.desc',
    });

    expect(query).toEqual({
      genreIds: [28, 878],
      minRating: 7,
      yearFrom: 2024,
      yearTo: 2024,
      sortBy: 'vote_average.desc',
    });
  });

  // Branch coverage: leaves absent optional filters undefined and applies the default sort order
  it('leaves absent optional filters undefined and applies the default sort order', () => {
    const query = DiscoverQuerySchema.parse({ genreIds: '28' });

    expect(query).toEqual({
      genreIds: [28],
      minRating: undefined,
      yearFrom: undefined,
      yearTo: undefined,
      sortBy: 'popularity.desc',
    });
  });

  // Branch coverage: treats empty optional query values as absent
  it('treats empty optional query values as absent', () => {
    const query = DiscoverQuerySchema.parse({
      genreIds: '28',
      minRating: '',
      yearFrom: '',
      yearTo: '',
    });

    expect(query.minRating).toBeUndefined();
    expect(query.yearFrom).toBeUndefined();
    expect(query.yearTo).toBeUndefined();
  });

  // Branch coverage: rejects more than three genre IDs
  it('rejects more than three genre IDs', () => {
    expect(() => DiscoverQuerySchema.parse({ genreIds: '1,2,3,4' })).toThrow();
  });

  // Branch coverage: rejects ratings outside the supported range
  it('rejects ratings outside the supported range', () => {
    expect(() => DiscoverQuerySchema.parse({ genreIds: '28', minRating: '11' })).toThrow();
    expect(() => DiscoverQuerySchema.parse({ genreIds: '28', minRating: '-1' })).toThrow();
  });

  // Branch coverage: rejects years outside the supported range
  it('rejects years outside the supported range', () => {
    expect(() => DiscoverQuerySchema.parse({ genreIds: '28', yearFrom: '1899' })).toThrow();
    expect(() => DiscoverQuerySchema.parse({ genreIds: '28', yearTo: '2101' })).toThrow();
  });

  // Branch coverage: rejects an unknown sort option
  it('rejects an unknown sort option', () => {
    expect(() => DiscoverQuerySchema.parse({ genreIds: '28', sortBy: 'unknown' })).toThrow();
  });
});
