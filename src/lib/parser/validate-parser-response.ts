import { ParserProposalSchema } from '@lib/schemas/parser-proposal';
import type { ParserProposal } from '@lib/schemas/parser-proposal';

export type ParserResponseValidationResult =
  | { status: 'valid'; proposal: ParserProposal }
  | {
      status: 'rejected';
      reason: 'invalid-response-type' | 'invalid-json' | 'invalid-proposal';
    };

/**
 * Parses one complete JSON response text and validates the existing proposal contract.
 * No Markdown extraction, JSON repair, logging, retry or state application occurs.
 * Clarification/unsupported proposals are valid semantic outcomes, not technical errors.
 * The caller must separately check transport success, completion/refusal metadata
 * and original-request association; valid JSON alone proves none of these.
 * Successful validation does not prove catalog membership, identity provenance,
 * domain applicability or permission to execute a search.
 * @param input Untrusted response text extracted by the future model adapter.
 * @returns A normalized proposal or a sanitized failure without raw response/errors.
 */
export function validateParserResponse(input: unknown): ParserResponseValidationResult {
  if (typeof input !== 'string') {
    return { status: 'rejected', reason: 'invalid-response-type' };
  }

  let decoded: unknown;
  try {
    decoded = JSON.parse(input);
  } catch {
    return { status: 'rejected', reason: 'invalid-json' };
  }

  const parsed = ParserProposalSchema.safeParse(decoded);
  if (!parsed.success) return { status: 'rejected', reason: 'invalid-proposal' };
  return { status: 'valid', proposal: parsed.data };
}
