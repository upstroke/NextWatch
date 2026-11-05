import { describe, expect, it, vi } from 'vitest';
import type { H3Event, EventHandlerRequest } from 'h3';
import {
  TmdbError,
  sendTmdbError,
  toTmdbHttpError,
} from '../../server/services/tmdb/errors';

function createEvent() {
  return {
    node: {
      res: {
        statusCode: 200,
      },
    },
  } as unknown as H3Event<EventHandlerRequest>;
}

describe('TMDb error mapping', () => {
  it('maps an invalid Discover query to a sanitized 400 response', () => {
    expect(toTmdbHttpError(new TmdbError('INVALID_QUERY'))).toEqual({
      statusCode: 400,
      statusMessage: 'Invalid Discover query',
    });
  });

  it('maps invalid Discover filters to a sanitized 400 response', () => {
    expect(toTmdbHttpError(new TmdbError('INVALID_FILTER'))).toEqual({
      statusCode: 400,
      statusMessage: 'Invalid Discover filters',
    });
  });

  it('maps TMDb configuration errors to a 503 response', () => {
    expect(toTmdbHttpError(new TmdbError('MISSING_TOKEN'))).toEqual({
      statusCode: 503,
      statusMessage: 'TMDb configuration unavailable',
    });

    expect(toTmdbHttpError(new TmdbError('INVALID_BASE_URL'))).toEqual({
      statusCode: 503,
      statusMessage: 'TMDb configuration unavailable',
    });
  });

  it('maps remaining TMDb errors to a 502 response', () => {
    expect(toTmdbHttpError(new TmdbError('UPSTREAM_FAILED'))).toEqual({
      statusCode: 502,
      statusMessage: 'TMDb request or response invalid',
    });
  });

  it('maps unknown errors to a 502 response', () => {
    expect(toTmdbHttpError(new Error('Unexpected failure'))).toEqual({
      statusCode: 502,
      statusMessage: 'TMDb request or response invalid',
    });
  });

  it('writes the mapped status code to the response and returns the HTTP error', () => {
    const event = createEvent();
    const error = new TmdbError('INVALID_QUERY');

    expect(sendTmdbError(event, error)).toEqual({
      statusCode: 400,
      statusMessage: 'Invalid Discover query',
    });
    expect(event.node.res.statusCode).toBe(400);
  });
});
