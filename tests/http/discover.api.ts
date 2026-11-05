import { expect, test } from '@playwright/test';

test('GET movie discover returns a sanitized 400 for an invalid rating', async ({ request }) => {
  const response = await request.get('/api/tmdb/discover/movie?minRating=11');

  expect(response.status()).toBe(400);
  expect(response.headers()['cache-control']).toBe('no-store');
  expect(response.headers()['content-type']).toContain('application/json');

  const body = await response.json();
  expect(body.statusCode).toBe(400);
  expect(body.statusMessage).toBe('Invalid Discover query');

  const serialized = JSON.stringify(body);
  expect(serialized).not.toContain('Authorization');
  expect(serialized).not.toContain('Bearer ');
  expect(serialized).not.toContain('stack');
});

test('GET TV discover returns a sanitized 400 for a reversed year range', async ({ request }) => {
  const response = await request.get('/api/tmdb/discover/tv?yearFrom=2024&yearTo=2020');

  expect(response.status()).toBe(400);
  expect(response.headers()['cache-control']).toBe('no-store');
  expect(response.headers()['content-type']).toContain('application/json');

  const body = await response.json();
  expect(body.statusCode).toBe(400);
  expect(body.statusMessage).toBe('Invalid Discover filters');

  const serialized = JSON.stringify(body);
  expect(serialized).not.toContain('Authorization');
  expect(serialized).not.toContain('Bearer ');
  expect(serialized).not.toContain('stack');
});
