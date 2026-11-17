import { describe, expect, it } from 'vitest';
import { applyParserProposal } from '@lib/domain/search/apply-parser-proposal';
import { createInitialSearchState } from '@lib/domain/search/create-initial-search-state';

describe('parser proposal scenario', () => {
  // Statement coverage: composed synthetic proposals preserve the complete wish from initial entry through a TV-only follow-up.
  it('applies the example request and changes only media type on follow-up', () => {
    const initial = createInitialSearchState();
    const initialSnapshot = structuredClone(initial);
    // Synthetic catalog IDs; this fixture does not verify TMDb genre data.
    const genreCatalogs = {
      movie: [{ id: 103, name: 'Komödie' }],
      tv: [{ id: 103, name: 'Komödie' }],
    };

    // Prepared output for: Komödien mit Bryan Cranston, ab 2010, mindestens Bewertung 7.
    const firstProposal = {
      status: 'ready',
      changes: [
        { field: 'genreIds', operation: 'add', value: [103] },
        { field: 'minYear', operation: 'set', value: 2010 },
        { field: 'minRating', operation: 'set', value: 7 },
      ],
      people: ['Bryan Cranston'],
    };
    const firstProposalSnapshot = structuredClone(firstProposal);
    const first = applyParserProposal(initial, firstProposal, {
      expectedRevision: initial.revision,
      personRefs: ['person-request-1'],
      keywordRefs: [],
      genreCatalogs,
    });

    expect(first).toEqual({
      status: 'applied',
      state: {
        mode: 'discover',
        revision: 2,
        filters: {
          mediaType: 'all',
          sortBy: 'popularity.desc',
          genreIds: [103],
          keywordIds: [],
          minYear: 2010,
          minRating: 7,
        },
        people: [],
        pendingQueries: {
          personQueries: [
            { ref: 'person-request-1', query: 'Bryan Cranston', operation: 'add' },
          ],
          keywordQueries: [],
        },
      },
    });
    expect(initial).toEqual(initialSnapshot);
    expect(firstProposal).toEqual(firstProposalSnapshot);
    if (first.status !== 'applied') throw new Error('Expected initial proposal to apply');
    const firstStateSnapshot = structuredClone(first.state);

    // Prepared output for: Nur Serien. No new person or keyword is supplied.
    const followUpProposal = {
      status: 'ready',
      changes: [{ field: 'mediaType', operation: 'set', value: 'tv' }],
    };
    const followUpSnapshot = structuredClone(followUpProposal);
    const followUp = applyParserProposal(first.state, followUpProposal, {
      expectedRevision: first.state.revision,
      personRefs: [],
      keywordRefs: [],
      genreCatalogs,
    });

    expect(followUp).toEqual({
      status: 'applied',
      state: {
        ...firstStateSnapshot,
        revision: 3,
        filters: { ...firstStateSnapshot.filters, mediaType: 'tv' },
      },
      mediaChange: {
        from: 'all',
        to: 'tv',
        deactivatedGenreIds: [],
        restoredGenreIds: [],
        genreScopes: { movie: [103], tv: [103] },
      },
    });
    expect(first.state).toEqual(firstStateSnapshot);
    expect(followUpProposal).toEqual(followUpSnapshot);
    expect(initial).toEqual(initialSnapshot);
  });
});
