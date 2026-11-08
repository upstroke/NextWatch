import { describe, expect, it } from 'vitest';
import { createTmdbError } from '@server/services/tmdb/errors';
import { sendTmdbError } from '@server/utils/tmdb-errors';

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

describe('TMDb H3 error response', () => {
  // Statement coverage: writes the mapped status code to the response and returns the HTTP error
  it('writes the mapped status code to the response and returns the HTTP error', () => {
    const event = createEvent();
    const error = createTmdbError('INVALID_QUERY');

    expect(sendTmdbError(event as unknown as Parameters<typeof sendTmdbError>[0], error)).toEqual({
      statusCode: 400,
      statusMessage: 'Invalid Discover query',
    });
    expect(event.node.res.statusCode).toBe(400);
  });
});
