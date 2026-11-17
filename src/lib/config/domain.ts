/**
 * Maximum distinct genres in the complete search wish, counting active and
 * temporarily inactive genres together. Inactive genres do not create extra slots.
 */
export const MAX_GENRE_IDS = 3;

/**
 * Maximum accepted person identities and maximum canonical pending-person records.
 * Accepted people and pending additions share this capacity; a pending one-to-one
 * replacement retains its accepted source slot. Also bounds accepted-source choices.
 * Compound replacement reservations require separate current-state accounting.
 */
export const MAX_PERSON_IDS = 5;

/**
 * Maximum distinct keyword criteria. Accepted keyword IDs and canonical pending
 * keyword additions share this capacity rather than each receiving a full allowance.
 */
export const MAX_KEYWORD_IDS = 3;

/**
 * Maximum alternative candidates offered in one person-selection question.
 * Alternatives belong to one pending request and do not each reserve a person slot.
 * Still a separate constant pending the agreed migration to MAX_PERSON_IDS.
 */
export const MAX_PERSON_CLARIFICATION_CANDIDATES = 5;

/**
 * Maximum known movie/TV titles displayed per person candidate as identification
 * aids, not search results or filmography. Independent of the candidate-group size.
 */
export const MAX_PERSON_CLARIFICATION_KNOWN_TITLES = 2;

// All text-length limits below count JavaScript UTF-16 code units (.length),
// not Unicode code points, encoded bytes or model tokens.

/** Maximum current user-input length; also bounds each literal input excerpt. */
export const MAX_PARSER_INPUT_LENGTH = 8_000;

/**
 * Maximum length of an individual parser term, correction hint, descriptor label
 * or unresolved source description. Not an aggregate request-text allowance.
 */
export const MAX_PARSER_QUERY_LENGTH = 512;

/** Maximum length of an opaque application reference, not a provider identity ID. */
export const MAX_PARSER_REFERENCE_LENGTH = 128;

/**
 * Maximum interpretation groups in one parser response. Groups express proposed
 * coupling; they do not authorize partial application or automatic execution.
 */
export const MAX_PARSER_GROUPS = 32;

/**
 * Maximum total interpretation items across all groups in one parser response.
 * Individual group arrays use the same cap; response validation enforces the total.
 */
export const MAX_PARSER_ITEMS = 64;

/**
 * Maximum query entries across one complete parser response, also bounding each
 * query list. Refine contributes one query; multi-query operations contribute all
 * their entries. This is an extraction bound, not accepted search-criteria capacity.
 */
export const MAX_PARSER_QUERIES = 64;

/**
 * Maximum serialized model-visible context JSON length at request composition,
 * including capabilities, criteria, pending work, clarification and genre catalogs.
 * Excludes the separately supplied instructions and current user input.
 */
export const MAX_PARSER_CONTEXT_LENGTH = 64_000;

/**
 * Maximum open intentions in ephemeral continuation context, including non-query
 * operations such as removal with an unresolved source. Not a conversation-history cap.
 */
export const MAX_PARSER_CONTINUATION_INTENTIONS = 64;

/**
 * Maximum open queries across canonical pending work and continuation-owned children.
 * Contextual validation counts canonical queries once, including unlinked requests;
 * a continuation link does not allocate another query or accepted-criterion slot.
 */
export const MAX_PARSER_CONTINUATION_QUERIES = 64;

/**
 * Aggregate continuation-text budget: intention excerpts, unresolved source wording
 * and owned query text/corrections. Contextual validation also includes all canonical
 * pending query text, read from SearchState rather than copied into continuation.
 */
export const MAX_PARSER_CONTINUATION_TEXT_LENGTH = 64_000;

/**
 * Shared cap for outstanding query-resolution and question-answer bindings in one
 * registry. Derived from two purpose slots per query budget (currently 128 total),
 * not from accepted-person capacity. It does not enable unsupported question flows.
 */
export const MAX_PARSER_CONTINUATION_BINDINGS = 2 * MAX_PARSER_CONTINUATION_QUERIES;
