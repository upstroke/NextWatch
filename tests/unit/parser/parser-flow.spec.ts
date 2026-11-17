import { describe, expect, it, vi } from 'vitest';
import { applyParserProposal } from '@lib/domain/search/apply-parser-proposal';
import { createInitialSearchState } from '@lib/domain/search/create-initial-search-state';
import { buildParserInput } from '@lib/parser/build-parser-input';
import { createParserProposalJsonSchema } from '@lib/parser/create-parser-proposal-json-schema';
import { validateParserResponse } from '@lib/parser/validate-parser-response';
import type { SearchState } from '@lib/schemas/search-state';

// Synthetic shared genre; no live catalog or identity lookup is involved.
const genreCatalogs = {
  movie: [{ id: 103, name: 'Komödie' }],
  tv: [{ id: 103, name: 'Komödie' }],
};

function requestFor(userText: string, state: SearchState) {
  const prepared = buildParserInput({ userText, state, genreCatalogs });
  if (prepared.status !== 'prepared') throw new Error('Expected prepared input');
  return { input: prepared.input, responseSchema: createParserProposalJsonSchema() };
}

function proposalFrom(text: string) {
  const result = validateParserResponse(text);
  if (result.status !== 'valid') throw new Error('Expected valid scripted response');
  return result.proposal;
}

describe('parser flow composition', () => {
  // Statement coverage: actual preparation, export, validation and transitions compose across initial and follow-up requests.
  it('preserves the complete example wish through a TV-only follow-up', () => {
    const initial = createInitialSearchState();
    const initialSnapshot = structuredClone(initial);
    const firstText = 'Komödien mit Bryan Cranston, ab 2010 und mindestens Bewertung 7.';
    // Scripted model replies do not interpret user text or enforce a provider schema.
    const model = vi.fn<(request: ReturnType<typeof requestFor>) => string>()
      .mockReturnValueOnce(JSON.stringify({
        status: 'ready',
        changes: [
          { field: 'genreIds', operation: 'add', value: [103] },
          { field: 'minYear', operation: 'set', value: 2010 },
          { field: 'minRating', operation: 'set', value: 7 },
        ],
        people: [' Bryan Cranston '],
      }))
      .mockReturnValueOnce(JSON.stringify({
        status: 'ready',
        changes: [{ field: 'mediaType', operation: 'set', value: 'tv' }],
      }));

    const firstRevision = initial.revision;
    const firstRequest = requestFor(firstText, initial);
    expect(firstRequest.input.userText).toBe(firstText);
    expect(firstRequest.input.context.filters).toEqual(initial.filters);
    expect(firstRequest.responseSchema).toHaveProperty('$schema', 'https://json-schema.org/draft/2020-12/schema');
    const first = applyParserProposal(initial, proposalFrom(model(firstRequest)), {
      expectedRevision: firstRevision,
      personRefs: ['person-request-1'],
      keywordRefs: [],
      genreCatalogs,
    });
    expect(first).toEqual({
      status: 'applied',
      state: {
        ...initialSnapshot,
        mode: 'discover',
        revision: 2,
        filters: { ...initialSnapshot.filters, genreIds: [103], minYear: 2010, minRating: 7 },
        pendingQueries: {
          personQueries: [{ ref: 'person-request-1', query: 'Bryan Cranston', operation: 'add' }],
          keywordQueries: [],
        },
      },
    });
    if (first.status !== 'applied') throw new Error('Expected first application');
    const firstSnapshot = structuredClone(first.state);

    const followUpRevision = first.state.revision;
    const followUpRequest = requestFor('Nur Serien', first.state);
    expect(followUpRequest.input.userText).toBe('Nur Serien');
    expect(followUpRequest.input.context.filters).toEqual(firstSnapshot.filters);
    expect(followUpRequest.input.context.pendingPeople).toEqual([
      { query: 'Bryan Cranston', operation: 'add', replaces: [] },
    ]);
    const followUp = applyParserProposal(first.state, proposalFrom(model(followUpRequest)), {
      expectedRevision: followUpRevision, personRefs: [], keywordRefs: [], genreCatalogs,
    });
    if (followUp.status !== 'applied') throw new Error('Expected follow-up application');
    expect(followUp.state).toEqual({
      ...firstSnapshot,
      revision: 3,
      filters: { ...firstSnapshot.filters, mediaType: 'tv' },
    });
    expect(model).toHaveBeenCalledTimes(2);
    expect(model).toHaveBeenNthCalledWith(1, firstRequest);
    expect(model).toHaveBeenNthCalledWith(2, followUpRequest);
    expect(first.state).toEqual(firstSnapshot);
    expect(initial).toEqual(initialSnapshot);
    expect(firstRequest.input.context.filters).toEqual(initialSnapshot.filters);
  });

  // Branch coverage: structurally valid model JSON still requires application-owned catalog checks.
  it('rejects a valid proposal containing a genre outside the supplied catalog', () => {
    const initial = createInitialSearchState();
    const before = structuredClone(initial);
    const request = requestFor('Eine Komödie', initial);
    const model = vi.fn<(input: ReturnType<typeof requestFor>) => string>()
      .mockReturnValue(JSON.stringify({
        status: 'ready', changes: [{ field: 'genreIds', operation: 'add', value: [999] }],
      }));
    const proposal = proposalFrom(model(request));
    const result = applyParserProposal(initial, proposal, {
      expectedRevision: initial.revision, personRefs: [], keywordRefs: [], genreCatalogs,
    });
    expect(result).toMatchObject({ status: 'rejected', reason: 'unknown-genre', proposal });
    expect(result).not.toHaveProperty('state');
    expect(initial).toEqual(before);
    expect(model).toHaveBeenCalledTimes(1);
  });

  // Branch coverage: a scripted valid reply retains its original revision binding after another accepted change.
  it('does not apply a late response by rebasing it to current state', () => {
    const initial = createInitialSearchState();
    const expectedRevision = initial.revision;
    const request = requestFor('Bewertung mindestens 7', initial);
    const intervening = applyParserProposal(initial, {
      status: 'ready', changes: [{ field: 'minYear', operation: 'set', value: 2010 }],
    }, { expectedRevision, personRefs: [], keywordRefs: [], genreCatalogs });
    if (intervening.status !== 'applied') throw new Error('Expected intervening change');
    const before = structuredClone(intervening.state);
    const model = vi.fn<(input: ReturnType<typeof requestFor>) => string>()
      .mockReturnValue(JSON.stringify({
        status: 'ready', changes: [{ field: 'minRating', operation: 'set', value: 7 }],
      }));
    const result = applyParserProposal(intervening.state, proposalFrom(model(request)), {
      expectedRevision, personRefs: [], keywordRefs: [], genreCatalogs,
    });
    expect(result).toMatchObject({ status: 'rejected', reason: 'stale-revision' });
    expect(result).not.toHaveProperty('state');
    expect(intervening.state).toEqual(before);
    expect(model).toHaveBeenCalledTimes(1);
  });
});
