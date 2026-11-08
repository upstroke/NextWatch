export type TmdbErrorCode =
  | 'MISSING_TOKEN'
  | 'INVALID_BASE_URL'
  | 'INVALID_QUERY'
  | 'INVALID_FILTER'
  | 'UPSTREAM_FAILED'
  | 'INVALID_RESPONSE';

const tmdbErrors = new WeakSet<Error>();

export function createTmdbError(code: TmdbErrorCode) {
  const error = Object.assign(new Error(code), { name: 'TmdbError', code } as const);
  tmdbErrors.add(error);
  return error;
}

export type TmdbError = ReturnType<typeof createTmdbError>;

/** Recognize only errors created by this module, not lookalike external values. */
export function isTmdbError(error: unknown): error is TmdbError {
  return error instanceof Error && tmdbErrors.has(error);
}

export function toTmdbHttpError(error: unknown) {
  const code = isTmdbError(error) ? error.code : undefined;

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
