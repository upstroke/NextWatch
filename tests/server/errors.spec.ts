import { describe, expect, it } from 'vitest';
import {
  TmdbError,
  sendTmdbError,
  toTmdbHttpError,
} from '../../server/services/tmdb/errors';

type TmdbErrorEvent = {
  node: {
    res: {
      statusCode: number;
    };
  };
};

function createEvent(): TmdbErrorEvent {
  return {
    node: {
      res: {
        statusCode: 200,
      },
    },
  };
}

describe('TMDb error mapping', () => {
  // Branch coverage: maps an invalid Discover query to a sanitized 400 response
  it('maps an invalid Discover query to a sanitized 400 response', () => {
    expect(toTmdbHttpError(new TmdbError('INVALID_QUERY'))).toEqual({
      statusCode: 400,
      statusMessage: 'Invalid Discover query',
    });
  });

  // Branch coverage: maps invalid Discover filters to a sanitized 400 response
  it('maps invalid Discover filters to a sanitized 400 response', () => {
    expect(toTmdbHttpError(new TmdbError('INVALID_FILTER'))).toEqual({
      statusCode: 400,
      statusMessage: 'Invalid Discover filters',
    });
  });

  // Statement coverage: maps TMDb configuration errors to a 503 response
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

  // Statement coverage: maps remaining TMDb errors to a 502 response
  it('maps remaining TMDb errors to a 502 response', () => {
    expect(toTmdbHttpError(new TmdbError('UPSTREAM_FAILED'))).toEqual({
      statusCode: 502,
      statusMessage: 'TMDb request or response invalid',
    });
  });

  // Branch coverage: maps unknown errors to a 502 response
  it('maps unknown errors to a 502 response', () => {
    expect(toTmdbHttpError(new Error('Unexpected failure'))).toEqual({
      statusCode: 502,
      statusMessage: 'TMDb request or response invalid',
    });
  });

  // Statement coverage: writes the mapped status code to the response and returns the HTTP error
  it('writes the mapped status code to the response and returns the HTTP error', () => {
    const event = createEvent();
    const error = new TmdbError('INVALID_QUERY');

    expect(
      sendTmdbError(event as unknown as Parameters<typeof sendTmdbError>[0], error),
    ).toEqual({
      statusCode: 400,
      statusMessage: 'Invalid Discover query',
    });
    expect(event.node.res.statusCode).toBe(400);
  });
});
