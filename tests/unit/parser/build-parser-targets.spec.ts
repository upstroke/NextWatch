import { describe, expect, it } from 'vitest';
import { createInitialSearchState } from '@lib/domain/search/create-initial-search-state';
import { buildParserInput } from '@lib/parser/build-parser-input';
import { SearchStateSchema } from '@lib/schemas/search-state';

function pendingState() {
  return SearchStateSchema.parse({
    ...createInitialSearchState(),
    mode: 'discover',
    revision: 12,
    people: [{ id: 501, name: 'Accepted Person' }],
    pendingQueries: {
      personQueries: [
        { ref: 'internal-person-add', query: 'Shared text', operation: 'add' },
        {
          ref: 'internal-person-replace', query: 'Shared text',
          operation: 'replace', targetPersonId: 501,
        },
      ],
      keywordQueries: [{ ref: 'internal-keyword', query: 'Shared text' }],
    },
  });
}

function prepare(state = pendingState()) {
  const result = buildParserInput({ userText: 'Die zweite Person präzisieren', state });
  if (result.status !== 'prepared') throw new Error('Expected prepared input');
  return result;
}

describe('parser pending target preparation', () => {
  it('distinguishes equal text by entity and request-local target key', () => {
    const result = prepare();
    expect(result.input.context.pendingTargets).toEqual([
      { targetKey: 'person-1', entity: 'person', query: 'Shared text' },
      { targetKey: 'person-2', entity: 'person', query: 'Shared text' },
      { targetKey: 'keyword-1', entity: 'keyword', query: 'Shared text' },
    ]);
    expect(result.bindings).toEqual({
      expectedRevision: 12,
      pendingTargets: [
        { targetKey: 'person-1', entity: 'person', ref: 'internal-person-add' },
        { targetKey: 'person-2', entity: 'person', ref: 'internal-person-replace' },
        { targetKey: 'keyword-1', entity: 'keyword', ref: 'internal-keyword' },
      ],
    });
    expect(new Set(result.input.context.pendingTargets.map((target) => target.targetKey)).size)
      .toBe(3);
  });

  it('retains replacement presentation without exposing internal association', () => {
    const state = pendingState();
    const before = structuredClone(state);
    const result = prepare(state);
    expect(result.input.context.pendingPeople).toEqual([
      { query: 'Shared text', operation: 'add', replaces: [] },
      { query: 'Shared text', operation: 'replace', replaces: ['Accepted Person'] },
    ]);
    expect(result.input.context.pendingKeywords).toEqual(['Shared text']);
    expect(result.input.context.acceptedPeople).toEqual(['Accepted Person']);
    const serialized = JSON.stringify(result.input);
    for (const excluded of [
      'internal-person-add', 'internal-person-replace', 'internal-keyword',
      'expectedRevision', 'targetPersonId',
    ]) expect(serialized).not.toContain(excluded);
    expect(result.input).not.toHaveProperty('bindings');
    expect(result.input.context).not.toHaveProperty('revision');
    expect(state).toEqual(before);
  });

  it('returns empty catalogs and bindings for a draft without pending requests', () => {
    const state = createInitialSearchState();
    const result = prepare(state);
    expect(result.input.context.pendingTargets).toEqual([]);
    expect(result.bindings).toEqual({ expectedRevision: state.revision, pendingTargets: [] });
  });

  it('derives bindings from validated state rather than supplied outer overrides', () => {
    const result = buildParserInput({
      userText: 'TV',
      state: pendingState(),
      bindings: { expectedRevision: 999, pendingTargets: [{ ref: 'forged-binding' }] },
      pendingTargets: [{ targetKey: 'forged-target' }],
    });
    if (result.status !== 'prepared') throw new Error('Expected prepared input');
    expect(result.bindings).toEqual(prepare().bindings);
    expect(JSON.stringify(result)).not.toContain('forged-binding');
    expect(JSON.stringify(result)).not.toContain('forged-target');
  });

  it('keeps model targets, private bindings and later preparations independent', () => {
    const state = pendingState();
    const before = structuredClone(state);
    const first = prepare(state);
    const firstTarget = first.input.context.pendingTargets[0];
    const firstBinding = first.bindings.pendingTargets[0];
    if (!firstTarget || !firstBinding) throw new Error('Expected target and binding');
    firstTarget.targetKey = 'changed-visible-key';
    firstTarget.query = 'Changed';
    expect(firstBinding.targetKey).toBe('person-1');
    firstBinding.ref = 'changed-private-ref';
    first.bindings.expectedRevision = 999;
    const second = prepare(state);
    expect(second.input.context.pendingTargets[0]).toEqual({
      targetKey: 'person-1', entity: 'person', query: 'Shared text',
    });
    expect(second.bindings.pendingTargets[0]?.ref).toBe('internal-person-add');
    expect(second.bindings.expectedRevision).toBe(12);
    expect(state).toEqual(before);
  });

  it('scopes keys to their original preparation rather than making them stable IDs', () => {
    const original = pendingState();
    const first = prepare(original);
    const changed = SearchStateSchema.parse({
      ...original,
      revision: 13,
      pendingQueries: {
        ...original.pendingQueries,
        personQueries: original.pendingQueries.personQueries.slice(1),
      },
    });
    const second = prepare(changed);
    expect(first.bindings.pendingTargets[0]).toEqual({
      targetKey: 'person-1', entity: 'person', ref: 'internal-person-add',
    });
    expect(second.bindings.pendingTargets[0]).toEqual({
      targetKey: 'person-1', entity: 'person', ref: 'internal-person-replace',
    });
    expect(first.bindings.expectedRevision).toBe(12);
    expect(second.bindings.expectedRevision).toBe(13);
  });

  it('returns neither targets nor bindings for invalid preparation input', () => {
    expect(buildParserInput({ userText: ' ', state: pendingState() })).toEqual({
      status: 'rejected', reason: 'invalid-input',
    });
  });
});
