import { expect, test } from '@playwright/test';

test('TMDB-INT-004: GET movie detail returns a sanitized 400 for an invalid ID', async ({
  request,
}) => {
  const response = await request.get('/api/tmdb/movie/invalid');

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

test('TMDB-INT-005: GET tv detail returns a sanitized 400 for an invalid ID', async ({
  request,
}) => {
  const response = await request.get('/api/tmdb/tv/invalid');

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

test('TMDB-INT-011: GET movie detail returns a sanitized 503 when credentials are absent', async ({
  request,
}) => {
  const response = await request.get('/api/tmdb/movie/550');

  expect(response.status()).toBe(503);
  expect(response.headers()['cache-control']).toBe('no-store');
  expect(response.headers()['content-type']).toContain('application/json');

  const body = await response.json();
  expect(body.statusCode).toBe(503);
  expect(body.statusMessage).toBe('TMDb configuration unavailable');

  const serialized = JSON.stringify(body);
  expect(serialized).not.toContain('Authorization');
  expect(serialized).not.toContain('Bearer ');
  expect(serialized).not.toContain('stack');
});

test('TMDB-INT-012: GET tv detail returns a sanitized 503 when credentials are absent', async ({
  request,
}) => {
  const response = await request.get('/api/tmdb/tv/1399');

  expect(response.status()).toBe(503);
  expect(response.headers()['cache-control']).toBe('no-store');
  expect(response.headers()['content-type']).toContain('application/json');

  const body = await response.json();
  expect(body.statusCode).toBe(503);
  expect(body.statusMessage).toBe('TMDb configuration unavailable');

  const serialized = JSON.stringify(body);
  expect(serialized).not.toContain('Authorization');
  expect(serialized).not.toContain('Bearer ');
  expect(serialized).not.toContain('stack');
});
