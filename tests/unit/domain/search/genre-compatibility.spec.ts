import { describe, expect, it } from 'vitest';
import type { GenreCatalogs } from '@lib/schemas/genre-catalogs';
import { SearchStateSchema } from '@lib/schemas/search-state';
import { applyIntent } from '@lib/domain/search/apply-intent';
import type { ApplyIntentResult } from '@lib/domain/search/apply-intent';

// Synthetic catalogs; these numbers are not a production TMDb genre table.
const catalogs = {
  movie: [
    { id: 1, name: 'Western' },
    { id: 2, name: 'Crime' },
    { id: 3, name: 'Movie only' },
  ],
  tv: [
    { id: 1, name: 'Western' },
    { id: 2, name: 'Crime' },
    { id: 4, name: 'TV only' },
  ],
} satisfies GenreCatalogs;

function search(genreIds = [1]) {
  return SearchStateSchema.parse({
    mode: 'discover',
    revision: 0,
    filters: { mediaType: 'movie', genreIds, minRating: 7 },
    people: [{ id: 501, name: 'Accepted person' }],
    pendingQueries: { personQueries: [{ ref: 'p', query: 'Unresolved person', operation: 'add' }] },
  });
}

function applied(result: ApplyIntentResult) {
  expect(result.status).toBe('applied');
  if (result.status !== 'applied') throw new Error('Expected an applied intent');
  return result;
}

describe('genre compatibility across media changes', () => {
  // Statement coverage: the user's shared-genre sequence retains the latest wish and never substitutes IDs.
  it('keeps Western across media and then keeps the replacement Crime genre', () => {
    const initial = search();
    const snapshot = structuredClone(initial);
    const tv = applied(
      applyIntent(
        initial,
        {
          status: 'ready',
          baseRevision: 0,
          changes: [{ field: 'mediaType', operation: 'set', value: 'tv' }],
        },
        catalogs,
      ),
    );
    expect(tv.state.filters.genreIds).toEqual([1]);
    const crime = applied(
      applyIntent(tv.state, {
        status: 'ready',
        baseRevision: 1,
        changes: [{ field: 'genreIds', operation: 'replace', value: [2] }],
      }),
    );
    const movie = applied(
      applyIntent(
        crime.state,
        {
          status: 'ready',
          baseRevision: 2,
          changes: [{ field: 'mediaType', operation: 'set', value: 'movie' }],
        },
        catalogs,
      ),
    );
    expect(movie.state.filters).toEqual({ ...initial.filters, genreIds: [2] });
    expect(movie.state.revision).toBe(3);
    expect(movie.state).not.toHaveProperty('inactiveGenres');
    expect(initial).toEqual(snapshot);
  });

  // Statement coverage: known incompatibility is remembered and restored in its original position without mutation.
  it('deactivates an incompatible genre and restores it on return', () => {
    const initial = search([3, 1]);
    const snapshot = structuredClone(initial);
    const tv = applied(
      applyIntent(
        initial,
        {
          status: 'ready',
          baseRevision: 0,
          changes: [{ field: 'mediaType', operation: 'set', value: 'tv' }],
        },
        catalogs,
      ),
    );
    expect(tv.state.filters.genreIds).toEqual([1]);
    expect(tv.state.inactiveGenres).toEqual([{ id: 3, position: 0 }]);
    expect(tv.mediaChange).toMatchObject({
      from: 'movie',
      to: 'tv',
      deactivatedGenreIds: [3],
      restoredGenreIds: [],
    });
    expect(tv.state.people).toEqual(initial.people);
    expect(tv.state.pendingQueries).toEqual(initial.pendingQueries);
    const tvSnapshot = structuredClone(tv.state);
    const movie = applied(
      applyIntent(
        tv.state,
        {
          status: 'ready',
          baseRevision: 1,
          changes: [{ field: 'mediaType', operation: 'set', value: 'movie' }],
        },
        catalogs,
      ),
    );
    expect(movie.state.filters.genreIds).toEqual([3, 1]);
    expect(movie.state.revision).toBe(2);
    expect(movie.state).not.toHaveProperty('inactiveGenres');
    expect(movie.mediaChange).toMatchObject({ deactivatedGenreIds: [], restoredGenreIds: [3] });
    expect(tv.state).toEqual(tvSnapshot);
    expect(initial).toEqual(snapshot);
  });

  // Branch coverage: explicit genre replacement addresses the complete wish, including inactive values.
  it('does not resurrect a remembered genre after an explicit replacement', () => {
    const tv = applied(
      applyIntent(
        search([3, 1]),
        {
          status: 'ready',
          baseRevision: 0,
          changes: [{ field: 'mediaType', operation: 'set', value: 'tv' }],
        },
        catalogs,
      ),
    );
    const crime = applied(
      applyIntent(tv.state, {
        status: 'ready',
        baseRevision: 1,
        changes: [{ field: 'genreIds', operation: 'replace', value: [2] }],
      }),
    );
    expect(crime.state).not.toHaveProperty('inactiveGenres');
    const movie = applied(
      applyIntent(
        crime.state,
        {
          status: 'ready',
          baseRevision: 2,
          changes: [{ field: 'mediaType', operation: 'set', value: 'movie' }],
        },
        catalogs,
      ),
    );
    expect(movie.state.filters.genreIds).toEqual([2]);
    expect(movie.mediaChange?.restoredGenreIds).toEqual([]);
  });

  // Branch coverage: removing a remembered criterion is effective even when active genre IDs stay the same.
  it('removes an explicitly discarded inactive genre without requiring a catalog refresh', () => {
    const tv = applied(
      applyIntent(
        search([3, 1]),
        {
          status: 'ready',
          baseRevision: 0,
          changes: [{ field: 'mediaType', operation: 'set', value: 'tv' }],
        },
        catalogs,
      ),
    );
    const removed = applied(
      applyIntent(tv.state, {
        status: 'ready',
        baseRevision: 1,
        changes: [{ field: 'genreIds', operation: 'remove', value: [3] }],
      }),
    );
    expect(removed.state.filters.genreIds).toEqual([1]);
    expect(removed.state).not.toHaveProperty('inactiveGenres');
    expect(removed.state.revision).toBe(2);
    const movie = applied(
      applyIntent(
        removed.state,
        {
          status: 'ready',
          baseRevision: 2,
          changes: [{ field: 'mediaType', operation: 'set', value: 'movie' }],
        },
        catalogs,
      ),
    );
    expect(movie.state.filters.genreIds).toEqual([1]);
  });

  // Branch coverage: unavailable, malformed or non-covering catalogs never produce a false incompatibility event.
  it('preserves state instead of guessing compatibility from insufficient catalog data', () => {
    const initial = search([3]);
    const snapshot = structuredClone(initial);
    const intent = {
      status: 'ready',
      baseRevision: 0,
      changes: [{ field: 'mediaType', operation: 'set', value: 'tv' }],
    };
    for (const example of [
      { data: undefined, reason: 'genre-catalogs-required' },
      { data: { movie: [] }, reason: 'invalid-genre-catalogs' },
      { data: { movie: [], tv: [] }, reason: 'unknown-genre' },
    ]) {
      expect(applyIntent(initial, intent, example.data)).toEqual({
        status: 'rejected',
        reason: example.reason,
      });
    }
    expect(initial).toEqual(snapshot);
  });

  // Statement coverage: all restores eligible wishes and exposes per-branch scopes without executing queries.
  it('restores remembered genres for all while retaining their supported media scope', () => {
    const tv = applied(
      applyIntent(
        search([3, 1]),
        {
          status: 'ready',
          baseRevision: 0,
          changes: [{ field: 'mediaType', operation: 'set', value: 'tv' }],
        },
        catalogs,
      ),
    );
    const all = applied(
      applyIntent(
        tv.state,
        {
          status: 'ready',
          baseRevision: 1,
          changes: [{ field: 'mediaType', operation: 'set', value: 'all' }],
        },
        catalogs,
      ),
    );
    expect(all.state.filters.genreIds).toEqual([3, 1]);
    expect(all.state).not.toHaveProperty('inactiveGenres');
    expect(all.mediaChange).toMatchObject({
      restoredGenreIds: [3],
      genreScopes: { movie: [3, 1], tv: [1] },
    });
  });

  // Branch coverage: remembered criteria cannot be bypassed to exceed the complete genre-wish limit.
  it('rejects an over-limit addition atomically while retaining remembered criteria', () => {
    const tv = applied(
      applyIntent(
        search([3, 1, 2]),
        {
          status: 'ready',
          baseRevision: 0,
          changes: [{ field: 'mediaType', operation: 'set', value: 'tv' }],
        },
        catalogs,
      ),
    );
    const snapshot = structuredClone(tv.state);
    expect(
      applyIntent(
        tv.state,
        {
          status: 'ready',
          baseRevision: 1,
          changes: [{ field: 'genreIds', operation: 'add', value: [4] }],
        },
        catalogs,
      ),
    ).toMatchObject({ status: 'rejected', reason: 'invalid-value' });
    expect(tv.state).toEqual(snapshot);
  });
});
