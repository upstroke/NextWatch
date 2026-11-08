import { describe, expect, it } from 'vitest';
import { TmdbError, toTmdbHttpError } from '@server/services/tmdb/errors';

describe('TMDb error creation', () => {
  // Statement coverage: preserves the native Error contract and TMDb metadata
  it('creates a native Error with a name, message and code', () => {
    const error = new TmdbError('INVALID_RESPONSE');

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('TmdbError');
    expect(error.message).toBe('INVALID_RESPONSE');
    expect(error.code).toBe('INVALID_RESPONSE');
    expect(error.stack).toEqual(expect.any(String));
  });

  // Statement coverage: creates independent error objects
  it('creates a fresh error for each call', () => {
    const first = new TmdbError('INVALID_RESPONSE');
    const second = new TmdbError('INVALID_RESPONSE');

    expect(first).not.toBe(second);
  });
});

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

  // Statement coverage: maps remaining TMDb errors to a sanitized 502 response
  it.each(['UPSTREAM_FAILED', 'INVALID_RESPONSE'] as const)(
    'maps %s to a sanitized 502 response',
    (code) => {
      expect(toTmdbHttpError(new TmdbError(code))).toEqual({
        statusCode: 502,
        statusMessage: 'TMDb request or response invalid',
      });
    },
  );

  // Branch coverage: handles arbitrary thrown values without exposing details
  it.each([
    new Error('Unexpected failure'),
    null,
    undefined,
    'Unexpected failure',
    42,
    { name: 'TmdbError', code: 'MISSING_TOKEN' },
    Object.assign(new Error('Unexpected failure'), { code: 'MISSING_TOKEN' }),
  ])('maps an unknown error to a sanitized 502 response: %s', (error) => {
    expect(toTmdbHttpError(error)).toEqual({
      statusCode: 502,
      statusMessage: 'TMDb request or response invalid',
    });
  });
});
