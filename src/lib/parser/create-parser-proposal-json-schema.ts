import { z } from 'zod';
import { ParserProposalSchema } from '@lib/schemas/parser-proposal';

/**
 * Derives a fresh provider-neutral JSON Schema for unparsed model proposals.
 * Input mode follows the existing contract without removing its transformations.
 * JSON Schema does not execute trimming, genre normalization or domain checks;
 * responses must still pass ParserProposalSchema and controlled application.
 * Unsupported conversion fails rather than silently replacing constraints with
 * an unconstrained schema. Provider-specific Structured Outputs compatibility
 * is not established by this export, especially for unions and optional fields.
 * @returns A draft-2020-12 input schema, not a provider request or a validator.
 */
export function createParserProposalJsonSchema() {
  return z.toJSONSchema(ParserProposalSchema, {
    target: 'draft-2020-12',
    io: 'input',
  });
}
