import { describe, expect, it } from 'vitest';
import { DiscoverQuerySchema } from '@lib/schemas/discover-query';

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

  // Statement coverage: converts comma-separated person IDs into a numeric array
  it('converts comma-separated person IDs into a numeric array', () => {
    const query = DiscoverQuerySchema.parse({ personIds: '101,202' });

    expect(query.personIds).toEqual([101, 202]);
  });

  // Statement coverage: converts a single person ID into a one-item array
  it('converts a single person ID into a one-item array', () => {
    const query = DiscoverQuerySchema.parse({ personIds: '101' });

    expect(query.personIds).toEqual([101]);
  });

  // Branch coverage: accepts person IDs that are already an array
  it('accepts person IDs that are already an array', () => {
    const query = DiscoverQuerySchema.parse({ personIds: [101, 202] });

    expect(query.personIds).toEqual([101, 202]);
  });

  // Statement coverage: converts comma-separated keyword IDs into a numeric array
  it('converts comma-separated keyword IDs into a numeric array', () => {
    const query = DiscoverQuerySchema.parse({ keywordIds: '301,402' });

    expect(query.keywordIds).toEqual([301, 402]);
  });

  // Statement coverage: converts a single keyword ID into a one-item array
  it('converts a single keyword ID into a one-item array', () => {
    const query = DiscoverQuerySchema.parse({ keywordIds: '301' });

    expect(query.keywordIds).toEqual([301]);
  });

  // Branch coverage: accepts keyword IDs that are already an array
  it('accepts keyword IDs that are already an array', () => {
    const query = DiscoverQuerySchema.parse({ keywordIds: [301, 402] });

    expect(query.keywordIds).toEqual([301, 402]);
  });

  // Statement coverage: converts numeric query strings into numbers
  it('converts numeric query strings into numbers', () => {
    const query = DiscoverQuerySchema.parse({
      genreIds: '28,878',
      personIds: '101,202',
      keywordIds: '301,402',
      minRating: '7',
      yearFrom: '2024',
      yearTo: '2024',
      sortBy: 'vote_average.desc',
    });

    expect(query).toEqual({
      genreIds: [28, 878],
      personIds: [101, 202],
      keywordIds: [301, 402],
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
      personIds: [],
      keywordIds: [],
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

  // Branch coverage: rejects more than five person IDs
  it('rejects more than five person IDs', () => {
    expect(() =>
      DiscoverQuerySchema.parse({ personIds: '1,2,3,4,5,6' }),
    ).toThrow();
  });

  // Branch coverage: rejects more than five keyword IDs
  it('rejects more than five keyword IDs', () => {
    expect(() =>
      DiscoverQuerySchema.parse({ keywordIds: '1,2,3,4,5,6' }),
    ).toThrow();
  });

  // Branch coverage: rejects invalid person IDs
  it('rejects invalid person IDs', () => {
    expect(() => DiscoverQuerySchema.parse({ personIds: '0' })).toThrow();
    expect(() => DiscoverQuerySchema.parse({ personIds: 'abc' })).toThrow();
  });

  // Branch coverage: rejects invalid keyword IDs
  it('rejects invalid keyword IDs', () => {
    expect(() => DiscoverQuerySchema.parse({ keywordIds: '0' })).toThrow();
    expect(() => DiscoverQuerySchema.parse({ keywordIds: 'abc' })).toThrow();
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
