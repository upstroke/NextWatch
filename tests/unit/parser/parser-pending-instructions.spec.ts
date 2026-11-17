import { describe, expect, it } from 'vitest';
import { MAX_KEYWORD_IDS, MAX_PERSON_IDS } from '@lib/config/domain';
import { applyParserProposal } from '@lib/domain/search/apply-parser-proposal';
import { createInitialSearchState } from '@lib/domain/search/create-initial-search-state';
import { buildParserInput } from '@lib/parser/build-parser-input';
import { PARSER_INSTRUCTIONS, PARSER_INSTRUCTIONS_VERSION } from '@lib/parser/instructions';
import { validateParserResponse } from '@lib/parser/validate-parser-response';
import { ParserPendingOperationSchema } from '@lib/schemas/parser-proposal';
import { SearchStateSchema } from '@lib/schemas/search-state';

function prepare() {
  const state = SearchStateSchema.parse({
    ...createInitialSearchState(), mode: 'discover', revision: 4,
    people: [{ id: 501, name: 'Accepted Person' }],
    pendingQueries: {
      personQueries: [{
        ref: 'private-person-request', query: 'Open person',
        operation: 'replace', targetPersonId: 501,
      }],
      keywordQueries: [{ ref: 'private-keyword-request', query: 'Open keyword' }],
    },
  });
  const result = buildParserInput({ userText: 'Die offene Ersetzung verwerfen', state });
  if (result.status !== 'prepared') throw new Error('Expected prepared input');
  return { state, prepared: result };
}

describe('pending operation instructions and capabilities', () => {
  it('versions the updated fixed contract and removes the obsolete addition-only rule', () => {
    expect(PARSER_INSTRUCTIONS_VERSION).toBe('1.1.0');
    expect(PARSER_INSTRUCTIONS).not.toContain('addition-only output');
    for (const rule of [
      'Select targetKey only from context.pendingTargets for this input',
      'Each entry has operation and targetKey',
      'refine also requires a nonempty query',
      'discard has no query',
      'Mention each targetKey at most once per proposal',
      'it does not remove its accepted source person',
      'return needs_clarification with a specific question',
      'without translating them into discard-plus-add',
    ]) expect(PARSER_INSTRUCTIONS).toContain(rule);
  });

  it('projects pending operation names and fields from the actual schema', () => {
    const { prepared } = prepare();
    expect(prepared.input.instructionVersion).toBe(PARSER_INSTRUCTIONS_VERSION);
    expect(prepared.input.instructions).toBe(PARSER_INSTRUCTIONS);
    expect(prepared.input.context.capabilities.pendingOperations).toEqual([
      { operation: 'refine', fields: ['targetKey', 'query'] },
      { operation: 'discard', fields: ['targetKey'] },
    ]);
    expect(prepared.input.context.capabilities.pendingOperations).toEqual(
      ParserPendingOperationSchema.options.map((option) => ({
        operation: option.shape.operation.value,
        fields: Object.keys(option.shape).filter((field) => field !== 'operation'),
      })),
    );
    expect(prepared.input.context.capabilities.pendingOperationLimit)
      .toBe(MAX_PERSON_IDS + MAX_KEYWORD_IDS);
    const serialized = JSON.stringify(prepared.input);
    expect(serialized).not.toContain('private-person-request');
    expect(serialized).not.toContain('private-keyword-request');
    expect(serialized).not.toContain('expectedRevision');
  });

  it('keeps person target order aligned with existing replacement presentation', () => {
    const { prepared } = prepare();
    const people = prepared.input.context.pendingTargets.filter((target) => target.entity === 'person');
    expect(people.map((target) => target.query)).toEqual(
      prepared.input.context.pendingPeople.map((entry) => entry.query),
    );
    expect(prepared.input.context.pendingPeople).toEqual([{
      query: 'Open person', operation: 'replace', replaces: ['Accepted Person'],
    }]);
    expect(prepared.input.context.pendingTargets.filter((target) => target.entity === 'keyword')
      .map((target) => target.query)).toEqual(prepared.input.context.pendingKeywords);
  });

  it('prepares an empty offered set without inventing an actionable target', () => {
    const result = buildParserInput({ userText: 'Korrigieren', state: createInitialSearchState() });
    if (result.status !== 'prepared') throw new Error('Expected prepared input');
    expect(result.input.context.pendingTargets).toEqual([]);
    expect(result.bindings.pendingTargets).toEqual([]);
    expect(result.input.context.capabilities.pendingOperations).toHaveLength(2);
  });

  it('does not share capability arrays across preparations', () => {
    const first = prepare().prepared;
    const operation = first.input.context.capabilities.pendingOperations[0];
    if (!operation) throw new Error('Expected operation');
    operation.fields.push('forged-authority-field');
    const second = prepare().prepared;
    expect(second.input.context.capabilities.pendingOperations.flatMap((entry) => entry.fields))
      .not.toContain('forged-authority-field');
  });

  // Scripted responses verify composition, not live model extraction or instruction adherence.
  it('composes the advertised discard contract with real bound application', () => {
    const { state, prepared } = prepare();
    const before = structuredClone(state);
    const target = prepared.input.context.pendingTargets.find((entry) => entry.entity === 'person');
    if (!target) throw new Error('Expected person target');
    const response = validateParserResponse(JSON.stringify({
      status: 'ready', pendingOperations: [{ operation: 'discard', targetKey: target.targetKey }],
    }));
    if (response.status !== 'valid') throw new Error('Expected valid response');
    const result = applyParserProposal(state, response.proposal, {
      expectedRevision: prepared.bindings.expectedRevision,
      pendingBindings: prepared.bindings, personRefs: [], keywordRefs: [],
    });
    expect(result).toMatchObject({ status: 'applied', state: {
      revision: 5, people: before.people,
      pendingQueries: { personQueries: [], keywordQueries: before.pendingQueries.keywordQueries },
    } });
    expect(state).toEqual(before);
  });

  it('retains an ambiguous scripted request as clarification without changing the draft', () => {
    const { state, prepared } = prepare();
    const before = structuredClone(state);
    const response = validateParserResponse(JSON.stringify({
      status: 'needs_clarification',
      message: 'Soll die offene Ersetzung oder die akzeptierte Person entfernt werden?',
    }));
    if (response.status !== 'valid') throw new Error('Expected valid response');
    expect(applyParserProposal(state, response.proposal, {
      expectedRevision: prepared.bindings.expectedRevision,
      pendingBindings: prepared.bindings, personRefs: [], keywordRefs: [],
    })).toMatchObject({ status: 'blocked', reason: 'clarification' });
    expect(state).toEqual(before);
  });
});
