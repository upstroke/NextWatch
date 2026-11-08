import type { H3Event, EventHandlerRequest } from 'h3';
import { toTmdbHttpError } from '@server/services/tmdb/errors';

/** Return a controlled JSON error without exposing H3 stack traces or internal details. */
export function sendTmdbError(event: H3Event<EventHandlerRequest>, error: unknown) {
  const httpError = toTmdbHttpError(error);
  event.node.res.statusCode = httpError.statusCode;
  return httpError;
}
