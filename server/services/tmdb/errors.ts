import type { H3Event, EventHandlerRequest } from 'h3';

export type TmdbErrorCode =
  | 'MISSING_TOKEN'
  | 'INVALID_BASE_URL'
  | 'INVALID_QUERY'
  | 'INVALID_FILTER'
  | 'UPSTREAM_FAILED'
  | 'INVALID_RESPONSE';

export class TmdbError extends Error {
  constructor(public readonly code: TmdbErrorCode) {
    super(code);
    this.name = 'TmdbError';
  }
}

export function toTmdbHttpError(error: unknown) {
  const code = error instanceof TmdbError ? error.code : undefined;

  if (code === 'INVALID_QUERY') {
    return { statusCode: 400, statusMessage: 'Invalid Discover query' };
  }

  if (code === 'INVALID_FILTER') {
    return { statusCode: 400, statusMessage: 'Invalid Discover filters' };
  }

  if (code === 'MISSING_TOKEN' || code === 'INVALID_BASE_URL') {
    return { statusCode: 503, statusMessage: 'TMDb configuration unavailable' };
  }

  return { statusCode: 502, statusMessage: 'TMDb request or response invalid' };
}

/** Return a controlled JSON error without exposing H3 stack traces or internal details. */
export function sendTmdbError(event: H3Event<EventHandlerRequest>, error: unknown) {
  const httpError = toTmdbHttpError(error);
  event.node.res.statusCode = httpError.statusCode;
  return httpError;
}
