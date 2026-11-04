export class TmdbError extends Error {
  constructor(
    public readonly code: 'MISSING_TOKEN' | 'INVALID_BASE_URL' | 'UPSTREAM_FAILED' | 'INVALID_RESPONSE'
  ) {
    super(code);
    this.name = 'TmdbError';
  }
}

export function toTmdbHttpError(error: unknown) {
  const configurationError =
    error instanceof TmdbError &&
    (error.code === 'MISSING_TOKEN' || error.code === 'INVALID_BASE_URL');

  return {
    statusCode: configurationError ? 503 : 502,
    statusMessage: configurationError
      ? 'TMDb configuration unavailable'
      : 'TMDb request or response invalid'
  };
}
