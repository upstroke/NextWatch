import { vi } from 'vitest';
import type { TmdbHttpClient } from '@server/services/tmdb/http';

export function createTmdbHttpMock() {
  const http = {
    get: vi.fn(),
  };

  return http as unknown as TmdbHttpClient & {
    get: ReturnType<typeof vi.fn>;
  };
}
