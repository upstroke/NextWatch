import { describe, expect, it } from 'vitest';
import { createTmdbError, isTmdbError, toTmdbHttpError } from '@server/services/tmdb/errors';

describe('TMDb error creation', () => {
  // Statement coverage: preserves the native Error contract and TMDb metadata
  it('creates a native Error with a name, message and code', () => {
    const error = createTmdbError('INVALID_RESPONSE');

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('TmdbError');
    expect(error.message).toBe('INVALID_RESPONSE');
    expect(error.code).toBe('INVALID_RESPONSE');
    expect(error.stack).toEqual(expect.any(String));
  });

  // Statement coverage: creates independent error objects
  it('creates a fresh error for each call', () => {
    const first = createTmdbError('INVALID_RESPONSE');
    const second = createTmdbError('INVALID_RESPONSE');

    expect(first).not.toBe(second);
  });
});

describe('TMDb error recognition', () => {
  // Branch coverage: recognizes factory-created errors for every supported code
  it.each([
    'MISSING_TOKEN',
    'INVALID_BASE_URL',
    'INVALID_QUERY',
    'INVALID_FILTER',
    'UPSTREAM_FAILED',
    'INVALID_RESPONSE',
  ] as const)('recognizes a factory-created %s error', (code) => {
    expect(isTmdbError(createTmdbError(code))).toBe(true);
  });

  // Branch coverage: rejects ordinary errors, primitives and lookalike objects
  it.each([
    new Error('Unexpected failure'),
    null,
    undefined,
    'Unexpected failure',
    42,
    { name: 'TmdbError', code: 'MISSING_TOKEN' },
    Object.assign(new Error('MISSING_TOKEN'), {
      name: 'TmdbError',
      code: 'MISSING_TOKEN',
    }),
  ])('rejects an error not created by the factory: %s', (error) => {
    expect(isTmdbError(error)).toBe(false);
  });
});

describe('TMDb error mapping', () => {
  // Branch coverage: maps an invalid Discover query to a sanitized 400 response
  it('maps an invalid Discover query to a sanitized 400 response', () => {
    expect(toTmdbHttpError(createTmdbError('INVALID_QUERY'))).toEqual({
      statusCode: 400,
      statusMessage: 'Invalid Discover query',
    });
  });

  // Branch coverage: maps invalid Discover filters to a sanitized 400 response
  it('maps invalid Discover filters to a sanitized 400 response', () => {
    expect(toTmdbHttpError(createTmdbError('INVALID_FILTER'))).toEqual({
      statusCode: 400,
      statusMessage: 'Invalid Discover filters',
    });
  });

  // Statement coverage: maps TMDb configuration errors to a 503 response
  it('maps TMDb configuration errors to a 503 response', () => {
    expect(toTmdbHttpError(createTmdbError('MISSING_TOKEN'))).toEqual({
      statusCode: 503,
      statusMessage: 'TMDb configuration unavailable',
    });

    expect(toTmdbHttpError(createTmdbError('INVALID_BASE_URL'))).toEqual({
      statusCode: 503,
      statusMessage: 'TMDb configuration unavailable',
    });
  });

  // Statement coverage: maps remaining TMDb errors to a sanitized 502 response
  it.each(['UPSTREAM_FAILED', 'INVALID_RESPONSE'] as const)(
    'maps %s to a sanitized 502 response',
    (code) => {
      expect(toTmdbHttpError(createTmdbError(code))).toEqual({
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
    Object.assign(new Error('MISSING_TOKEN'), {
      name: 'TmdbError',
      code: 'MISSING_TOKEN',
    }),
  ])('maps an unknown error to a sanitized 502 response: %s', (error) => {
    expect(toTmdbHttpError(error)).toEqual({
      statusCode: 502,
      statusMessage: 'TMDb request or response invalid',
    });
  });
});
