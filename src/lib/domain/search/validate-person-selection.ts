import {
  PersonSelectionAnswerSchema,
  PersonSelectionClarificationSchema,
} from '@lib/schemas/clarification';
import type { PersonClarificationCandidate } from '@lib/schemas/clarification';
import type { SearchState } from '@lib/schemas/search-state';

export type ValidatePersonSelectionResult =
  | {
      status: 'validated';
      clarificationRef: string;
      ref: string;
      sourceRevision: number;
      candidate: PersonClarificationCandidate;
    }
  | {
      status: 'rejected';
      reason:
        | 'no-active-clarification'
        | 'invalid-clarification'
        | 'invalid-answer'
        | 'stale-revision'
        | 'question-mismatch'
        | 'unknown-request'
        | 'candidate-not-offered';
    };

/**
 * Checks an untrusted answer against the application's currently offered question.
 * state must already be validated; activeClarification must come from application
 * storage, never from the answer's caller. Parsing it checks structure, not trust.
 * A validated result proves only question association and offered-set membership;
 * WP 014 must still establish identity provenance before WP 009 acceptance.
 * No state, question or answer is mutated, and no search or provider call occurs.
 * @param state Current, previously validated search state.
 * @param activeClarification Application-owned active question, or null/undefined.
 * @param input Untrusted selection answer.
 * @returns A copied offered candidate or a rejection without a state transition.
 */
export function validatePersonSelection(
  state: SearchState,
  activeClarification: unknown,
  input: unknown,
): ValidatePersonSelectionResult {
  if (activeClarification === null || activeClarification === undefined) {
    return { status: 'rejected', reason: 'no-active-clarification' };
  }
  const question = PersonSelectionClarificationSchema.safeParse(activeClarification);
  if (!question.success) return { status: 'rejected', reason: 'invalid-clarification' };
  const answer = PersonSelectionAnswerSchema.safeParse(input);
  if (!answer.success) return { status: 'rejected', reason: 'invalid-answer' };

  if (
    question.data.sourceRevision !== state.revision ||
    answer.data.sourceRevision !== state.revision
  ) {
    return { status: 'rejected', reason: 'stale-revision' };
  }
  if (
    answer.data.clarificationRef !== question.data.clarificationRef ||
    answer.data.ref !== question.data.ref
  ) {
    return { status: 'rejected', reason: 'question-mismatch' };
  }
  if (!state.pendingQueries.personQueries.some((request) => request.ref === question.data.ref)) {
    return { status: 'rejected', reason: 'unknown-request' };
  }
  const candidate = question.data.candidates.find((entry) => entry.id === answer.data.personId);
  if (!candidate) return { status: 'rejected', reason: 'candidate-not-offered' };

  return {
    status: 'validated',
    clarificationRef: question.data.clarificationRef,
    ref: question.data.ref,
    sourceRevision: question.data.sourceRevision,
    candidate,
  };
}
