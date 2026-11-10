import { expect, test } from '@playwright/test';

test('TMDB-INT-013: GET movie watch providers returns a sanitized 400 for an invalid ID', async ({
  request,
}) => {
  const response = await request.get('/api/tmdb/movie/invalid/watch-providers');

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

test('TMDB-INT-014: GET movie watch providers returns a sanitized 400 for an invalid region', async ({
  request,
}) => {
  const response = await request.get('/api/tmdb/movie/550/watch-providers?region=D');

  expect(response.status()).toBe(400);
  expect(response.headers()['cache-control']).toBe('no-store');
  expect(response.headers()['content-type']).toContain('application/json');

  const body = await response.json();
  expect(body.statusCode).toBe(400);
  expect(body.statusMessage).toBe('Invalid watch provider region');

  const serialized = JSON.stringify(body);
  expect(serialized).not.toContain('Authorization');
  expect(serialized).not.toContain('Bearer ');
  expect(serialized).not.toContain('stack');
});

test('TMDB-INT-015: GET tv watch providers returns a sanitized 400 for an invalid ID', async ({
  request,
}) => {
  const response = await request.get('/api/tmdb/tv/invalid/watch-providers');

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

test('TMDB-INT-016: GET tv watch providers returns a sanitized 400 for an invalid region', async ({
  request,
}) => {
  const response = await request.get('/api/tmdb/tv/1399/watch-providers?region=D');

  expect(response.status()).toBe(400);
  expect(response.headers()['cache-control']).toBe('no-store');
  expect(response.headers()['content-type']).toContain('application/json');

  const body = await response.json();
  expect(body.statusCode).toBe(400);
  expect(body.statusMessage).toBe('Invalid watch provider region');

  const serialized = JSON.stringify(body);
  expect(serialized).not.toContain('Authorization');
  expect(serialized).not.toContain('Bearer ');
  expect(serialized).not.toContain('stack');
});
