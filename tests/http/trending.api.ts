import { expect, test } from '@playwright/test';

test('GET trending returns a sanitized 503 when credentials are absent', async ({ request }) => {
  const response = await request.get('/api/tmdb/trending');
  expect(response.status()).toBe(503);
  expect(response.headers()['cache-control']).toBe('no-store');
  expect(response.headers()['content-type']).toContain('application/json');
  const body = await response.json();
  expect(body.statusCode).toBe(503);
  expect(body.statusMessage).toBe('TMDb configuration unavailable');
  expect(JSON.stringify(body)).not.toContain('Authorization');
  expect(JSON.stringify(body)).not.toContain('Bearer ');
});
