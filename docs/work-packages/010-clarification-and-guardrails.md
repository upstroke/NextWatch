# Clarification and guardrails

## Specification

### Purpose

Define clarification and guardrails for ambiguous, incomplete or invalid requests without silently changing accepted search criteria. Use the state and transition contract in [WP 009](009-search-state-and-filter-catalog.md) and the resolution outcomes in [WP 014](014-entity-resolution.md).

### Scope and boundaries

- Define clarification states, pending clarification requirements and preservation rules.
- Consume unique, ambiguous and no-match entity outcomes from [WP 014](014-entity-resolution.md); do not perform provider lookups here.
- Associate candidate selections with a stable WP 009 pending-request reference and source revision. Reject stale or unrelated selections; validate membership in the offered candidate set.
- For ambiguous people, present candidate names and available known movie/series titles with media type. No profile image is required. Define candidate count and a missing-title fallback before implementation.
- Apply the [WP 014 candidate-enrichment rule](014-entity-resolution.md#scope): known titles are identity-selection aids, not a complete filmography or final search results.
- Do not select the highest-ranked candidate merely to avoid a question.
- For no match, request correction or explicit removal of the condition; do not silently drop a person. Distinguish provider failures from no-match outcomes.
- Preserve independently accepted people, unrelated criteria and pending replacements. A question or candidate retrieval alone does not change criteria or revision.
- Route accepted selections through WP 014 validation and the pure WP 009 acceptance transition. Do not mutate active IDs directly.
- Preserve the complete requested AND condition. Required unresolved people block execution of the new search in WP 012.

### Integration with existing WP 009 code

- Reuse `src/lib/schemas/search-state.ts` and `src/lib/schemas/search-transition.ts`; do not introduce competing accepted-person or pending-request models.
- Pending requests are structured records, not bare strings. Carry the application-owned `ref` and source revision through clarification; a person request distinguishes addition from replacement using its operation and replacement target.
- Reuse `applyPendingQueryCommand()` in `src/lib/domain/search/pending-operations.ts` for accepted corrections/removals. Only effective accepted criteria changes advance revision; showing a question does not.
- After WP 014 establishes identity provenance and candidate membership, reuse `acceptResolvedPerson()` with the matching reference, source revision and ID/name record. Do not reimplement its atomic replacement, limit or deduplication decisions.
- Keep candidate/clarification state separate from active criteria. Reuse existing `applyIntent()` clarification and error outcomes rather than conflating semantic questions with malformed input or technical failure.
- Consume optional `applyIntent()` media-change feedback facts for later clarification/feedback contracts where needed; this does not authorize UI work here or provider execution.

### Out of scope

- Provider entity resolution (WP 014).
- Search execution (WP 012).
- Result rendering, automatic error recovery and full LLM implementation.

### Inputs and outputs

Inputs: user request, existing WP 009 state, filter catalog, validation schemas and WP 014 resolution outcomes. Outputs: clarification states, guardrail outcomes, pending clarification requirements and accepted selections for controlled state application.

### Implementation tasks and acceptance criteria

- Define clarification states and guardrails for ambiguous, incomplete and invalid input.
- Preserve existing filters and revision unless an effective criteria transition is accepted through WP 009.
- Define candidate presentation and selection contracts, no-match correction/removal and safe stale-selection rejection.
- Test preservation, invalid selection, no-match versus technical error and independent handling of multiple people.
- Test integration with existing pending commands and person acceptance without copying domain rules into clarification code.
- Prepare contracts using synthetic outcomes before WP 014 exists; live resolution integration depends on WP 014.

## Execution status

- Specification aligned with the approved person-search requirements on 2026-11-15.
- Replaced the separate requirements-document reference with direct WP links and explicitly linked the selection-aid versus filmography distinction.
- Follow-up integration scope aligned with inspected code at `26aefe9`: structured requests, pure pending operations, person acceptance and intent outcomes already exist; the complete clarification workflow is not thereby implemented.
- This is a documentation-only scope update. No implementation ownership is transferred out of WP 009 to avoid its acceptance criteria.
- No tests, coverage, lint or typecheck were run for this update.
- Recorded the user-approved functional decisions below on 2026-11-15. All ten questionnaire points are decided; the existing Specification section is unchanged. This records requirements, not implemented or validated behavior. No application code or configuration was changed, and no tests, coverage, lint or typecheck were run for this documentation update.
- Implemented separate person-clarification candidate/title limits and the person-selection schemas in `f60a278`; added schema unit tests in `0ee0dea`. These contracts cover offered groups, answer bindings, optional title enrichment and unique candidate IDs, not a complete clarification workflow.
- On 2026-11-15 the user reported the schema/test step fully green locally: tests, coverage meeting the agreed minimum of 80% statements, lint and typecheck. The assistant did not execute these checks. This validation report applies to that earlier step, not to subsequent domain changes.
- Added `validatePersonSelection()` and its domain unit tests in `bb2504b`. It checks the active question, current revision, pending-person association and offered-set membership without mutation or identity acceptance. A successful result is not proof of provider provenance; WP 014 validation and WP 009 acceptance remain separate.
- On 2026-11-15 the user reported the selection-validation step fully green locally, including tests, coverage, lint and typecheck. The assistant did not execute these checks. This report applies to the completed selection-validation step, not to the follow-up contracts below.
- Added person no-match questions, separate sanitized resolution-error feedback, bound refinement/navigation/removal/discard actions and a response union retaining existing selection answers, with schema unit tests in `bbed10f`. These are contracts, not action execution, parsing of descriptive hints or provider retrieval.
- On 2026-11-15 the user reported `bbed10f` fully green locally: tests, coverage meeting the agreed minimum of 80% statements, lint and typecheck. The assistant did not execute these checks.
- Added `applyPersonClarificationAction()` and its unit tests in `9f79097`. It validates the active semantic question, current revision and pending-person association. `more-candidates` is forwarded only for a selection question with `hasMore: true`; `refine` forwards a normalized hint and copied addition/replacement context without changing criteria or revision. Explicit `remove` and `discard-change` delegate to `applyPendingQueryCommand()`, preserving accepted replacement targets and unrelated criteria. Tests exercise the real pending transition without mocking it, including preservation, stale/mismatched input, unavailable navigation, removal of the final condition and replay rejection.
- On 2026-11-15 the user reported `9f79097` fully green locally: tests, coverage meeting the agreed minimum of 80% statements, lint and typecheck. The assistant did not execute these checks.
- Added the session/offer contracts and sequential lifecycle in `07d3615`, with unit tests. `reconcilePersonClarification()` retains only a current question for the first pending person and retires stale questions without rebasing candidates. `offerPersonClarification()` requires current offer data and issues a new session-scoped sequence reference. `processPersonClarificationAction()` delegates existing action rules and closes consumed questions. The session is separate from SearchState; callers must persist its sequence and coordinate session/state updates. Person completion is not permission to execute the whole search.
- On 2026-11-15 the user reported `07d3615` and all preceding implementation/test steps fully green locally: tests, coverage meeting the agreed minimum of 80% statements, lint and typecheck. The assistant did not execute these checks. This report does not validate the new selection-integration code below.
- Added `processPersonSelection()` in this update to reconcile the session, reuse `validatePersonSelection()` and require an injected trusted synchronous identity validator before calling `acceptResolvedPerson()`. The validator must establish provider provenance from application-owned resolution context; neither a client flag nor structural parsing proves provenance. Its acceptance record must match the validated pending reference, source revision and offered candidate ID. Missing validation, errors, malformed results and mismatched results fail closed. The validator receives copies; successful WP 009 acceptance closes the question and returns a copied next pending request for fresh resolution at the resulting revision. No provider implementation, automatic acceptance or duplicated replacement/deduplication rules were added.
- This update implements the requested status documentation and selection-integration code only. The additional tests for `processPersonSelection()` are a separate next step; they have not been added or executed here. No tests, coverage, lint or typecheck were run by the assistant for this new code, and its local validation is pending.
- Correction application after parsing, the production WP 014 identity validator, remaining semantic guardrails and live integration remain open. Provider retrieval, UI, persistence/concurrency implementation and search execution remain outside this step. The Specification and Approved functional decisions sections remain unchanged.

## Approved functional decisions

Approved by the user on 2026-11-15. Numbers correspond to the clarification questionnaire. These decisions concretize the specification without replacing the existing WP 009 state and transition rules. Presentation examples describe the intended interaction; they do not bring UI implementation, provider calls or natural-language parsing into WP 010.

### 1. Candidate group size

- Offer at most five person candidates at a time for one ambiguous person request.
- Introduce a separate candidate-group limit in `src/lib/config/domain.ts` during implementation; do not reuse `MAX_PERSON_IDS`. The number of alternative identities offered for one name and the number of person conditions in a search are independent limits.
- A group-size limit is not a resolution-search cutoff. Do not treat a truncated candidate set as exhaustive or unique, and do not automatically accept the highest-ranked candidate.

### 2. More candidates and refinement

- When more candidates exist, support both requesting further candidate groups and refining the person request.
- The first group must not be the only route to an identity outside that group.
- Actual candidate retrieval and further resolution belong to WP 014; WP 010 prepares the interaction contracts using synthetic outcomes.

### 3. Identity-selection information

- Show each candidate's name and up to two available known movie/series titles.
- Identify the media type of each displayed title and include its release year when available. Missing years are allowed; do not invent them or require a year to offer a candidate.
- No profile image is required.
- Known titles are identity-selection aids, not a complete filmography or final search results. Availability of a title in this aid is not itself proof that it satisfies the final search conditions.
- The inspected `knownFor` candidate contract does not yet carry a release year. Any later year enrichment must be coordinated with WP 014 rather than assumed to exist in WP 010.

### 4. Missing known titles

- Retain possible candidates when usable known titles are missing; do not exclude an identity solely because enrichment is unavailable.
- Explicitly indicate that no known titles are available for disambiguation and allow refinement.
- If names and available information do not distinguish candidates sufficiently, do not pretend that an informed selection is possible. Preserve the unresolved request and allow additional clarification rather than guessing.

### 5. Sequential clarification of multiple people

- Use variant A: clarify one ambiguous person at a time, not all ambiguous people in a combined question.
- Keep every other pending person request independently intact while one question is active.
- After a validated selection is accepted through the WP 009 transition, prepare the next required question against the resulting current revision. Do not reuse an older question's source revision after acceptance changes the state.
- Preserve accepted people, pending replacements and unrelated criteria throughout the sequence.
- A required person remaining unresolved blocks execution of the new search. Never execute a partial substitute for the complete requested AND condition.
- Example: for a request involving ambiguous Alex Smith and Chris Miller, first clarify Alex Smith, then Chris Miller. Accepting Alex Smith does not authorize a search that silently omits Chris Miller. These names are illustrative.

### 6. Selection or additional description

- Allow either selection of an offered candidate or an additional description, such as a known title that helps identify the intended person.
- Additional descriptive text is not an accepted identity and must not directly set a person ID. It prepares a correction/refinement for subsequent parsing and WP 014 resolution.
- Preserve application-owned request references and explicit addition/replacement context through accepted corrections; reuse WP 009 pending commands rather than introducing parallel mutation rules.

### 7. No-match correction or explicit removal

- For a genuine no-match outcome, offer correction of the person request or explicit removal of that specific person condition.
- Never silently remove an unresolved person, relax the AND condition or report a provider failure as no match.
- Preserve unrelated filters, accepted people and other pending requests.
- This decision does not introduce an action that discards or resets the whole search. Removing a pending replacement removes that pending request; it does not implicitly remove its accepted replacement target.

### 8. Discard this change

- Use the meaning of variant A for cancellation: discard the specific pending change, not the entire search and not merely the visible question.
- For a pending addition, remove that pending addition.
- For a pending replacement, remove that pending replacement and retain the previously accepted target person.
- Preserve all unrelated criteria and pending requests. Use an explicit action meaning such as "Discard this change" rather than an ambiguous cancellation label.
- Route effective removals through `applyPendingQueryCommand()`. The accepted removal may advance revision under WP 009; merely displaying or dismissing presentation content must not bypass those rules.

### 9. Stale selections

- Reject a selection whose source revision is stale; do not silently apply it to the current state, bypass the revision check or make it current by merely rewriting its revision.
- If the associated person request is still pending, prepare its clarification again in a controlled way for the current state. If it no longer exists, do not recreate it from the stale answer.
- Preserve current criteria on rejection. Re-establish valid request association and the offered candidate context before accepting a later selection.
- This is a clarification lifecycle requirement, not authorization for general automatic technical-error recovery or provider execution in WP 010.

### 10. Other clarification and guardrail cases

#### 10a. Unclear replacement target

- If a replacement request does not identify which accepted person to replace, ask for that target before preparing a concrete replacement.
- Example: "Replace him with person C" is insufficient when several accepted people are plausible targets. Do not choose a target implicitly.

#### 10b. Contradictory year conditions

- Prepare a semantic clarification case for contradictory requested year conditions, such as "after 2020 but before 2010".
- Preserve the previously accepted search state while clarification is pending.
- Do not automatically convert every schema validation failure or malformed input into a semantic question. Keep recognized semantic conflicts distinct from invalid structured input and technical failure.

#### 10c. Ambiguous keywords

- Prepare clarification reasons and answer-option contracts for an ambiguous keyword meaning.
- Keyword entity resolution remains in WP 014. Reuse the existing pending keyword request model rather than adding a competing one.

#### 10d. Unsupported requests

- Explain unsupported search requirements as unsupported when no meaningful clarification can make them actionable.
- Do not invent a question or candidate choice merely to avoid an unsupported outcome.

### Integration and validation boundaries

- Bind candidate selection to the specific pending request, source revision and actually offered candidate set. A structurally valid ID/name pair alone is not proof of provider provenance or membership.
- WP 010 owns the clarification/answer association; WP 014 establishes trusted identity provenance and resolution validity; WP 009 applies accepted corrections, removals and identities through its existing pure transitions.
- Clarification/candidate state remains separate from active search criteria. Questions, candidate retrieval and presentation alone do not change criteria or revision; effective accepted WP 009 transitions can do so.
- Natural-language recognition of hints, unclear replacement references or contradictory years belongs to later parser/integration work. WP 010 prepares contracts for already recognized situations.
- Verify these requirements with synthetic resolution outcomes and integration tests for preservation, offered-set membership, stale answers, sequential handling of multiple people, no-match versus provider failure, correction/removal and replacement cancellation. This list records planned validation, not tests already executed.
