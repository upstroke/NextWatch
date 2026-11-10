import { expect, test } from '@playwright/test';

test('TMDB-INT-006: GET movie search returns a sanitized 400 for a missing query', async ({
  request,
}) => {
  const response = await request.get('/api/tmdb/search/movie');

  expect(response.status()).toBe(400);
  expect(response.headers()['cache-control']).toBe('no-store');
  expect(response.headers()['content-type']).toContain('application/json');

  const body = await response.json();
  expect(body.statusCode).toBe(400);
  expect(body.statusMessage).toBe('Invalid search query');

  const serialized = JSON.stringify(body);
  expect(serialized).not.toContain('Authorization');
  expect(serialized).not.toContain('Bearer ');
  expect(serialized).not.toContain('stack');
});

test('TMDB-INT-007: GET tv search returns a sanitized 400 for an empty query', async ({
  request,
}) => {
  const response = await request.get('/api/tmdb/search/tv?query=');

  expect(response.status()).toBe(400);
  expect(response.headers()['cache-control']).toBe('no-store');
  expect(response.headers()['content-type']).toContain('application/json');

  const body = await response.json();
  expect(body.statusCode).toBe(400);
  expect(body.statusMessage).toBe('Invalid search query');

  const serialized = JSON.stringify(body);
  expect(serialized).not.toContain('Authorization');
  expect(serialized).not.toContain('Bearer ');
  expect(serialized).not.toContain('stack');
});

test('TMDB-INT-008: GET multi search returns a sanitized 400 for an invalid query type', async ({
  request,
}) => {
  const response = await request.get('/api/tmdb/search/multi?query=123');

  expect(response.status()).toBe(400);
  expect(response.headers()['cache-control']).toBe('no-store');
  expect(response.headers()['content-type']).toContain('application/json');

  const body = await response.json();
  expect(body.statusCode).toBe(400);
  expect(body.statusMessage).toBe('Invalid search query');

  const serialized = JSON.stringify(body);
  expect(serialized).not.toContain('Authorization');
  expect(serialized).not.toContain('Bearer ');
  expect(serialized).not.toContain('stack');
});

test('TMDB-INT-009: GET person search returns a sanitized 400 for a missing query', async ({
  request,
}) => {
  const response = await request.get('/api/tmdb/search/person');

  expect(response.status()).toBe(400);
  expect(response.headers()['cache-control']).toBe('no-store');
  expect(response.headers()['content-type']).toContain('application/json');

  const body = await response.json();
  expect(body.statusCode).toBe(400);
  expect(body.statusMessage).toBe('Invalid search query');

  const serialized = JSON.stringify(body);
  expect(serialized).not.toContain('Authorization');
  expect(serialized).not.toContain('Bearer ');
  expect(serialized).not.toContain('stack');
});

test('TMDB-INT-010: GET keyword search returns a sanitized 400 for a whitespace query', async ({
  request,
}) => {
  const response = await request.get('/api/tmdb/search/keyword?query=%20%20');

  expect(response.status()).toBe(400);
  expect(response.headers()['cache-control']).toBe('no-store');
  expect(response.headers()['content-type']).toContain('application/json');

  const body = await response.json();
  expect(body.statusCode).toBe(400);
  expect(body.statusMessage).toBe('Invalid search query');

  const serialized = JSON.stringify(body);
  expect(serialized).not.toContain('Authorization');
  expect(serialized).not.toContain('Bearer ');
  expect(serialized).not.toContain('stack');
});
