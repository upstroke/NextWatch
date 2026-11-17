# WP 011 — Parser contract decision supplement

## Status and authority

- Recorded: 2026-11-16; approved R02/R06 policy decisions added 2026-11-17.
- Supplements [WP 011 — LLM parser contract](011-llm-parser-contract.md) and informs the [draft implementation plan](../../tasks/011-llm-parser-contract-plan.md).
- Records the explicitly approved internal-reference, one-to-many person replacement and whole-selection replacement decisions, plus the R02 reservation and R06 staged-result policies. These are requirements, not implemented capabilities.
- Sections 1–3 were consolidated into the parent specification in `5fa186d`. Sections 4–5 record subsequently accepted decisions pending their technical integration into the main plan/specification. Do not treat this record as a competing state model or a completed contract review.
- Where older WP 011 text appears to prohibit returning any internal reference, the supplied-reference distinction below controls. Where older singular replacement wording assumes one source slot is always sufficient, the one-to-many capacity rule below controls.
- Documentation only. Does not approve application implementation, the full technical plan, provider integration, UI, PR or merge.

## Specification

### 1. Application-issued references

The application may provide opaque references for relevant accepted criteria and pending requests in model-visible context. The model may return only references actually supplied for that request and appropriate to the proposed operation.

References identify the existing criterion or request affected by an interpretation. They do not prove a provider identity, authorize a state change or replace domain validation. The model must not allocate references, invent provider IDs or set authoritative revisions.

The application retains the authoritative association between the parser request, its context and the underlying state/session. Before applying a response, validate reference membership, target kind, allowed operation and current request/state association. Reject stale responses; do not rebind them to a newer context.

Technical references and operation names must not appear in user-facing messages, questions or choices. Render names and meaningful descriptions instead. Users must not need to type or recognize references.

For example, an internal reference can distinguish a pending replacement of Tom Hanks with an unresolved Chris from a separate pending addition of Chris. The visible question remains: “Should Chris Evans replace Tom Hanks or be added as another person?”

If the user's meaning is ambiguous, ask a meaningful clarification. A technically valid reference is not evidence that the intended target was understood correctly.

This decision concerns target association, not genre selection. Genre catalog supply remains governed by the parent specification; it is not introduced or removed by choosing reference-based targeting.

### 2. One-to-many person replacement

A single accepted person may be replaced by one or more people. Preserve the source and all requested replacements as one replacement intention rather than silently converting it into unrelated removal/addition operations.

The existing person limit remains binding. Validate the resulting accepted identities after removing the source and deduplicating resolved identities, together with applicable pending-addition reservations. Do not assume that a replacement with several people always consumes only the original source slot. Recompute capacity against current state at the application boundary.

Keep the accepted source while the replacement is unresolved. Do not silently select a subset of replacements, discard a requested person or exceed the bounded collection when the requested replacement cannot fit. Retain the complete intention and use the existing overflow/clarification principles.

The parent specification's identity-provenance, source-ambiguity, deduplication and unrelated-state preservation rules continue to apply. Supporting this product rule may require extensions to existing singular acceptance contracts; do not claim those extensions already exist.

### 3. Whole-selection replacement for genres and keywords

Distinguish a targeted replacement from replacement of the complete selection for a criterion.

- “Replace Horror with Thriller” changes the identified genre and preserves unrelated genres.
- “Instead of all previous genres, only Comedy and Thriller” replaces the entire genre selection.
- The same distinction applies to keywords.

Use `replace_all` as the internal operation name in the contract draft. Never expose the technical name in the UI.

Preserve the previous selection until the complete requested new selection is clarified, supported and valid. Apply the replacement together; do not first clear the previous selection or accept only a resolvable subset.

The operation covers the whole selection for that criterion, not merely a silently chosen active subset. Preserve the existing active/inactive genre compatibility model when specifying the exact mapping. Existing genre/keyword limits, trusted identity boundaries and compatibility rules remain binding.

Keyword support is an approved product requirement, not evidence that controlled keyword acceptance or replacement transitions are implemented. Inspect and explicitly plan the necessary extensions before coding.

### 4. R02 — Protect existing reservations

Explicitly accepted by the user on 2026-11-17 as decision A.

- Existing scheduled wishes retain their valid capacity reservations. A later wish must not silently displace them; if it cannot fit, retain it for capacity clarification.
- When new related wishes compete for capacity within the same submitted request, do not schedule an arbitrary subset merely because of processing order. Preserve the competing intentions for an explicit capacity decision.
- Count unresolved identities conservatively. Account for identity duplicates only after trusted resolution, not from similar names or model guesses.
- A one-to-many replacement reserves the additional capacity needed by the common operation while retaining its accepted source. Existing criterion limits and the complete-result deduplication rule remain binding.
- This decision approves reservation precedence and conservative accounting. The exact reservation calculation, interactions between simultaneous operations and atomic transfer/acceptance mappings must still be integrated and checked under R02/R03; the conversational formula is not a verified implementation.

Example: if four people are accepted and an existing replacement of one person by two has a valid reservation for the remaining slot, a later unrelated addition does not take that slot. If both competing wishes arrive together as a new related group, do not silently choose one.

### 5. R06 — Retain validated results for unchanged child queries

Explicitly accepted by the user on 2026-11-17 as decision B.

- Distinguish a result already validated under a valid request association from an incoming response whose association has become stale.
- An already validated staged identity result may be retained for an unchanged child query. It is not yet an accepted criterion and does not authorize later mutation by itself.
- Refining a child invalidates that child's previous result and candidates. Preserve unrelated unchanged child information subject to its own valid bindings.
- Before atomic acceptance, recheck the current source, full replacement/selection, capacity, provenance and all relevant request/session associations. Do not bypass existing domain acceptance guards.
- Reject stale incoming responses rather than making them current by changing their source revision. Retaining a previously validated fact is not permission to relabel an old asynchronous response.
- Confirmed interruption closes the active question and outstanding response authorizations, but retains already validated information for unchanged child queries. Resume deliberately with fresh bindings where needed.
- Discard removes the corresponding open work and its associated staged results/bindings, without undoing unrelated already accepted criteria.
- Session lifetime, child generations, invocation consumption, invalidation and current-state acceptance mapping still require concrete technical integration under R06. This decision does not assert those mechanisms already exist or approve an automatic new lookup/model call.

Example: in a replacement of Tom Hanks with Chris Evans and Brad Pitt, a validated Chris Evans result may remain while the other child is refined. The changed child's old candidates/results are invalid. The source stays accepted until the full current operation passes controlled atomic acceptance.

## Technical draft consolidation — not an approved schema

The following records the direction discussed around the approved decisions. Exact field names, bounds, discriminants and adapter mappings still require the pre-code design review. Illustrative structures in conversation are not implemented APIs.

### Request composition

Keep fixed instructions, serialized application context and current untrusted user input logically separate. Context describes relevant accepted criteria, pending intentions, the active clarification and supported capabilities/catalog information. Supply application-issued target references where needed.

Keep authoritative request/revision binding in the application. Do not send credentials, result caches or full conversation history by default. Names and user text are data, not instructions that override parser rules.

### Response direction

Use a versioned proposal containing ordered interpreted parts rather than a single global success flag that cannot represent mixed supported and unresolved wishes.

Discussed part categories are direct filters, unresolved persons/keywords, genres, clarification-needed interpretations and unsupported requirements. A workflow interpretation category was proposed but its exact shape and allowed scope remain unapproved. It must not authorize reset, cancellation execution or search by itself.

Distinguish setting scalar values, adding values, refining pending requests, replacing accepted values, removing accepted values, discarding pending requests and replacing an entire supported selection. Missing input is not a removal or an instruction to restore defaults.

Preserve coupled intentions explicitly. Mention order alone must not encode hidden execution dependencies. Keep contradictory extracted year bounds representable so the existing application-owned year-conflict guardrail can handle them; do not weaken accepted-state validation.

A genre display label is not by itself a trusted identity. Final genre catalog projection and mapping remain technical design work under the parent specification.

### Failure and application boundaries

Malformed, incomplete, refused or technically failed responses are handled outside valid interpretation parts. Preserve accepted criteria and pending intentions; no automatic model repair or repeat call.

Validate the complete external response and its application-owned association before applying anything. Independently valid changes may proceed while unrelated intentions remain pending, but coupled replacements must not be split in a way that changes the user's meaning. Unexpected internal inconsistencies are not ordinary partial success.

Criteria edits do not execute a title search. Provider resolution, UI rendering and explicit search execution remain assigned to their existing owners.

## Remaining implementation-plan work

- Finalize exact input/output fields, operation-specific required and forbidden fields, bounds and JSON-Schema-compatible shapes.
- Specify supplied-reference projection, membership validation and stale/replay protection without creating a competing state model.
- Inspect affected callers/tests and define the minimal one-to-many acceptance and genre/keyword whole-selection extensions.
- Specify coupled-intention representation and capacity accounting, including unresolved identities and pending reservations.
- Add synthetic valid/invalid examples and deterministic contract/adapter tests in the approved implementation scope.
- Sections 1–3 were consolidated into the parent specification in `5fa186d`; integrate the subsequent decisions in sections 4–5 into the concrete plan/specification without reopening them. R01 follow-up wording and R03–R05 technical completion remain separate unfinished consolidation work.

## Execution status

Documentation decision record only. The 2026-11-17 update records accepted A/R02 and B/R06 and updates their review references; it does not complete the R01–R06 consolidation or close any finding. No prompt, runtime schema, domain transition, provider connection, UI or tests changed. No tests, coverage, ESLint or typecheck run for this record. No PR or merge included.
