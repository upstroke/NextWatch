# LLM parser contract

## Specification

### Purpose

Define validated parser input/output for LLM-assisted extraction of filters and entity queries. Follow the [WP 009 state-application contract](009-search-state-and-filter-catalog.md) and [WP 012 participation semantics](012-search-execution-and-discover.md#scope) rather than introducing a second state model.

### Scope

- Define parser inputs, outputs, filter fields, entity-query fields and validation boundaries.
- Extract single/multiple person names, keyword queries and requested media type. Preserve common acting participation when people are joined by AND; do not reinterpret it as crew work or appearances as oneself.
- With no explicit media type, preserve the contract default permitting movies and series.
- Distinguish additions, replacements, removals and clarification refinements for subsequent validated domain application.
- Define the application adapter and coordination of mixed filter/entity changes, preserving unrelated accepted criteria, inactive genre wishes and pending requests.
- Define only the downstream interfaces required for resolution, clarification and explicit search confirmation; do not implement live resolution, execution or UI here.
- Make necessary, explicitly planned schema/domain extensions directly required by this contract. List affected files, reused transitions and tests in the implementation plan and obtain approval before coding. WP 010 remains complete; targeted follow-up changes do not reopen it.
- Remove `MAX_PERSON_CLARIFICATION_CANDIDATES` and replace all application/test imports and usages with `MAX_PERSON_IDS`; update descriptions/documentation and verify no references remain.
- Apply the shared behavior rules to all suitable supported criteria; investigate only genuine criterion-specific differences and contract gaps, not already settled general rules.

### Integration with existing WP 009 code

- Reuse `SearchState`, accepted ID/name records and structured pending person/keyword requests from `src/lib/schemas/search-state.ts`. Do not invent a parallel domain-state model or resolved IDs.
- Define a validated application adapter to `PendingQueryCommandSchema` in `src/lib/schemas/search-transition.ts`, with approved extensions where existing commands cannot represent the agreed behavior.
- The application supplies internal references and base revisions. Resolve replacement sources against accepted state; never trust model-generated IDs or references.
- Apply pending changes through `applyPendingQueryCommand()` and supported filter intents through `applyIntent()`. Preserve operation-level atomicity and specify mixed-change coordination.
- Do not expand chat filter changes to edit `people` or `personIds`; validated identity acceptance remains a separate trusted boundary.
- Reuse existing acceptance, correction, compatibility and stale-response guards rather than implementing competing transitions.
- Complete genre catalogs are application-supplied inputs, not model-generated lists or evidence of provider identity.

### Out of scope

- Live person/keyword lookup, candidate retrieval and identity-resolution implementation: WP 014.
- Title-search execution and execution retries: WP 012.
- Wizard/result rendering and UI integration: deferred UI task.
- Automatic parser recovery, autonomous repair loops and full LLM/provider implementation.
- Inventing provider IDs, selecting popular candidates as a substitute for identity validation, or applying unvalidated model output.

### Inputs and outputs

Inputs: user request, relevant existing search state and revision, supported filter catalog, validation schemas and explicit active-clarification context where applicable.

Outputs: validated parser contracts, proposed filter changes, unresolved entity queries and clarification interpretation ready for controlled application. Outputs are not search-execution authorization.

## Agreed behavior — 2026-11-16

This record consolidates the recovered conversation and subsequent decisions. WP 010 is complete in its agreed contract/domain scope. WP 011 is the current planning package. These are requirements, not claims of implemented behavior. Implementation still requires an approved technical plan.

### A. Mixed requests and preserved context

- Apply unambiguous, independent filter changes while unrelated requests remain pending.
- Preserve each pending request's intent and context; never display pending values as accepted criteria.
- Example: “Only TV series and replace Tom Hanks with another Tom” applies the TV change, retains a replacement query using “Tom”, and keeps Tom Hanks until successful replacement.
- Preserve unrelated accepted criteria and pending requests. An unresolved part must not erase independently accepted changes.
- Applying criteria does not execute a title search.

### B. Person extraction, refinement and resolution

- Incomplete names such as “Tom” are valid. Preserve the supplied query without inventing surnames, identities or IDs.
- Accept a successfully and unambiguously resolved person without an additional person-confirmation step. Represent the accepted person as a pill below the search input; do not restore the input alongside an already active wizard merely to show it.
- Use clarification when identity remains ambiguous or no match was found. A single returned candidate alone is not proof of uniqueness. WP 014 defines the technical uniqueness policy; WP 011 distinguishes resolved, ambiguous/no-match and technical-error outcomes.
- During an active clarification, a bare person reference corrects/refines that request. “Tom Cruise” replaces unresolved “Tom” and invalidates its old candidate group; it does not remove accepted people merely offered as candidates.
- “And Brad Pitt” adds a separate request and leaves the Tom request pending.
- Explicit reference to another pending request takes precedence: “By Chris I mean Chris Evans” refines Chris without discarding Tom.
- Clarify person requests in mention order by default. When more candidates are available, offer both additional candidates and free-text refinement.
- Report no match explicitly and retain the same pending request for correction. No match is not a technical failure. Only explicit discard ends the request without resolution.

### C. Replacement and identity duplicates

- Keep the accepted source person until the replacement is successfully resolved or explicitly selected. Intermediate candidates and no-match outcomes do not remove the source.
- If multiple accepted people match the replacement source, clarify the source first. With Tom Hanks and Tom Hardy accepted, “Replace Tom with Tom Cruise” first asks which accepted Tom to replace.
- Preserve “Tom Cruise” and the complete replacement intent during that question. After source selection, resolve the replacement and remove the source only upon successful validated acceptance.
- Deduplicate by resolved person ID, not display name. Equal names with different IDs are not duplicates.
- An addition resolving to an accepted ID closes the pending request, retains the person once and briefly reports that the person is already included.
- Replacing A with already accepted B removes A, retains B once and closes the replacement without an extra duplication question.
- Keep unrelated people and wishes unchanged; reuse existing domain acceptance transitions.

### D. Shared person limit and overflow

- Use `MAX_PERSON_IDS`, agreed value five, for both the person-condition limit and the clarification candidate-group limit. The concepts remain distinct despite the shared configuration.
- Accepted persons occupy one slot each. Pending additions reserve one slot each. Multiple candidates for one request do not reserve separate slots. Replacements use the source person's slot; refinements do not add slots.
- Explain limit overflow and that pending additions count. Ask whom to add/replace or which wish to discard. Do not select an arbitrary subset or silently remove existing wishes.
- Retain a related overflowing addition command as a separate clarification request outside the bounded accepted-person/pending-addition collection. Do not insert an invalid sixth bounded entry.
- Example: with four occupied slots and two requested additions, ask which person to add, whom to replace, or which wish/addition command to discard.
- Selecting one person does not discard the other requested additions. Retain unselected wishes until resolved or explicitly discarded. Transfer chosen changes into regular state only after the required decision and validation.
- Independent unambiguous changes may still proceed. Specify the bounded schema, references, revisions and adapter mapping in the approved plan, not as an unbounded alternative state.
- WP 011 owns the planned removal of `MAX_PERSON_CLARIFICATION_CANDIDATES`, including code/test/documentation references and validation.

### E. Shared rules across supported criteria

- Reuse unambiguous independent changes, preserved pending intent, refinement versus explicit addition, deliberate replacement, mention-order clarification and non-arbitrary limit handling wherever meaningful.
- Use the relevant `MAX_GENRE_IDS`, `MAX_PERSON_IDS` or `MAX_KEYWORD_IDS` limit and criterion-specific identity/normalization rules.
- Do not require candidate selection for a criterion that needs no identity lookup. Preserve prior values during unresolved replacements where appropriate.
- Verify existing genre/keyword contracts and transitions; reuse supported behavior and identify missing interfaces, especially controlled keyword acceptance/replacement.
- Do not copy person-slot accounting blindly. The inspected state already counts active keywords plus pending keyword additions, and active plus inactive genres, against their respective bounds.
- Known supported catalog fields are `mediaType`, `personIds` derived from accepted people, `keywordIds`, `genreIds`, `minRating`, `minYear`, `maxYear` and `sortBy`. This is a contract inventory, not proof of complete end-to-end execution support.
- The inspected limits are five persons, three keywords and three genres. Rating supports 0–10; year bounds support 1900–2100; sorting supports `popularity.desc` and `vote_average.desc`.
- Do not infer additional supported search filters merely from concept text or provider endpoints. Runtime, provider selection, language and exclusion lists are not fields in the inspected current search-filter schemas.
- Only genuine unresolved differences require a new product decision. The later examples concerning genre/keyword AND versus OR, conflicting year bounds, and strict/non-exact numeric descriptions were raised for verification, not approved as new behavior. Check existing specifications first; do not silently add support or substitute another meaning.

### F. Cancellation and deliberate continuation

- When no processing/search is running, “Stop” or “Cancel” does not immediately mutate filters/pending wishes or start a search.
- Show accepted filters separately from pending changes. Offer discard of the current/specified wish, discard all pending wishes while retaining filters, reset the entire search, or return unchanged.
- With no pending wishes, clarify whether to reset the entire search.
- Execute only the selected scope and confirm it. Retain and show unaffected filters and wishes.
- After a confirmed cancellation, do not automatically search, retry or activate another question. No clarification remains active until deliberately resumed.
- Use labelled buttons for workflow control rather than requiring free-text commands. A new bare name must not accidentally answer a closed question; explicit pending-request references retain their meaning.
- Never execute a search by silently omitting pending wishes. Resolve or explicitly discard them first.

### G. Processing locks and bounded retries

- Lock new input during parser processing, person/keyword resolution and title-search execution. Lock state-changing actions during processing/retries and show status.
- Release input when user clarification is needed, processing completes or a terminal error/timeout is reached. Preserve pending wishes.
- For transient technical person/keyword-resolution and title-search errors, allow at most three attempts TOTAL per affected processing step and cycle. Show progress and stop immediately on success.
- After three failures, unlock input, report the terminal failure and offer “Try again” and cancellation options. Explicit retry starts a new cycle of at most three attempts for these retryable operations.
- Parser/LLM failures receive NO automatic repeat call. An explicit “Try again” is required for another model call; the three-attempt automatic policy does not apply to it. Account for actual model calls in the applicable budget.
- Invalid parser output, domain-invalid changes and permanent errors are not automatically retried or repaired. No match and ambiguity follow normal clarification, not retries.
- Retain accepted criteria and pending wishes on failure. Do not omit the failed criterion.
- Prevent nested retry layers from multiplying the agreed attempts. WP 014 owns resolution retries; WP 012 owns execution retries. WP 011 defines parser error outcomes; the later UI task presents progress/actions.
- Concrete transient-error classification, transport coordination and timing belong in the relevant implementation plans. Existing automatic-recovery exclusions must be explicitly aligned before downstream retry implementation.

### H. Wizard and explicit search confirmation

- The wizard replaces the search input completely, shows one question per step and is not a modal. The earlier default continuation-card layout with per-item Clarify buttons is superseded; its underlying cancellation/resumption rules remain.
- During a question, allow option selection or “Refine request” to open a free-text refinement inside the wizard. The normal search input remains hidden.
- “Cancel” opens cancellation-scope choices inside the wizard. Returning unchanged resumes the existing clarification; executing cancellation leaves no active question.
- After confirmed cancellation, show retained filters and remaining wishes in the wizard. “Continue clarification” deliberately resumes. When no wishes remain, proceed to filter review through the deliberate continuation/review flow, without automatically starting a search.
- Both ready interpretations and clarified requests require final review and explicit “Search now”. Finishing the last answer never executes a title search.
- After search confirmation, hide the wizard/review and restore the search input with a readable representation matching the executed criteria. Show titles below using the existing result view. Do not claim skipped/unsupported wishes were fulfilled.
- Retain original request context while clarifying. Buttons trigger structured application actions, not prompts. Action names discussed in chat were illustrative, not established APIs.
- Validate action/request/revision association and reject stale actions. Support keyboard access, visible focus and accessible status announcements.
- Deferred UI task reported by the user: `tasks/clarificaton-flow.md` (recorded as supplied; file not verified in this update).

### I. Edited criteria versus executed search

- Apply independent validated changes to the criteria currently being edited, while unresolved replacements keep their accepted source values.
- Keep the last executed search and its results associated with their own executed criteria. Do not relabel prior results as matching the edited criteria or update them merely because a criterion was accepted.
- Example: after movie results with Tom Hanks, “Only TV series and replace Tom Hanks with Chris” changes the edited media type to TV, keeps Tom Hanks during clarification and does not run a new title search.
- Only “Search now”, after readiness and validation, executes the new criteria and updates the result view.
- Define ownership, revision/snapshot association and stale-confirmation handling in the technical plan using existing boundaries. This decision does not authorize a competing domain-state model.

### J. Work-package allocation and follow-up

- WP 011: extraction/response contracts and adapter; mixed-change coordination; retained clarification context for refinements, replacements and overflow; shared-rule verification across current filters; directly necessary approved schema/domain extensions; shared-constant cleanup.
- WP 014: live person/keyword resolution, technical uniqueness policy, candidate retrieval/continuation and validated acceptance integration, including transient technical-resolution retries.
- WP 012: execution readiness and explicit confirmation integration, results associated with executed criteria/revisions, Movie/TV execution paths and transient technical-search retries.
- WP 013: title disambiguation and providers; no additional transfer is required from this discussion.
- Later UI/integration task: wizard/review, pills, input replacement/restoration and locks, cancellation/resumption, progress/errors and result presentation. No new package number is assigned here.
- Necessary WP 011 domain changes must be listed and approved before coding, reuse existing logic and receive tests. Do not pull live WP 014 resolution, WP 012 execution or UI implementation into WP 011. WP 010 remains complete.
- Movie person search and TV person search have different execution paths already assigned to WP 012. Preserve person intent for TV; do not reject/drop it because the Discover cast path is unsuitable. WP 012 specifies a verified TV-credits route with role checks, deduplicated series IDs and intersection across required people; it also flags the existing unguarded `with_cast` mapping. These are planned requirements, not verified implementation claims.
- Dependency order remains WP 011 → WP 014 → WP 012.
- This update changes WP 011 only. Mirror approved requirements into WP 012/WP 014 and the UI task in a separately reviewed documentation change; align older automatic-search and automatic-recovery statements. Do not treat downstream files as already updated.

## Decision status and remaining technical work

Original discussion numbers are retained to avoid reopening settled questions.

1. Decided: no additional confirmation for successfully unambiguously resolved persons; otherwise clarify. Technical uniqueness policy remains with WP 014.
2. Decided: preserve overflowing related additions in a separate clarification request; retain every unresolved/un-discarded wish. Concrete schema/adapter mapping is implementation planning.
3. Decided: clarify an ambiguous accepted replacement source first, retain the replacement query, then resolve and accept it before removing the source.
4. Decided: separate edited criteria from the last executed search/results; execute only after “Search now”. Concrete revision/state ownership is implementation planning.
5. Decided: transient resolution/search errors receive up to three total attempts; no automatic LLM repeat, invalid-output repair, permanent-error retry or nested multiplication. Concrete policies belong to the assigned implementation packages.
6. Decided: transfer shared rules across suitable criteria; verify existing contracts and seek approval only for actual exceptions/extensions. This is not approval of every possible filter operation.
7. Decided: refinement, cancellation and deliberate resumption remain inside the wizard, with processing locks and no automatic post-cancellation search/question.
8. Allocation recorded in J: WP 011 includes bounded necessary domain extensions and constant cleanup; downstream implementation remains assigned separately.

The decisions do not constitute an approved technical implementation plan. Remaining work:

- Read current schemas, transitions, guardrails and relevant tests before proposing changes.
- Specify mixed-command coordination, unresolved replacement-source context, overflow representation and reference/revision ownership.
- Specify interfaces for edited/executed search separation without prematurely implementing WP 012 or UI.
- Audit genre/keyword behavior against existing specifications. Identify real gaps such as keyword acceptance/replacement, list AND/OR semantics, contradictory bounds and strict/non-exact numeric requests. Do not invent answers or reopen general rules; ask targeted questions only where a previously undecided case blocks implementation.
- Confirm which details may remain deferred behind explicit contracts and update downstream documentation separately.
- Present a file-level implementation plan with reused transitions, proposed schema extensions and tests. Obtain approval before coding.

## Validation and acceptance

- Validate parser extraction and application contracts with synthetic fixtures and mocked boundaries, not live entity lookup or a full LLM integration.
- Cover incomplete names, multiple people and AND intent, media-type preservation, mixed changes, addition versus refinement, explicit references to another pending request, no-match retention and replacement-source preservation.
- Cover ambiguous source selection context, ID deduplication, replacements to accepted identities, mention order, limits/overflow and retained unselected wishes where owned by WP 011.
- Cover reference/revision ownership, stale-action rejection, criterion compatibility and preservation of unrelated accepted/pending/inactive values.
- Test parser error outcomes and absence of implicit search authorization; assign full retry, wizard and execution tests to their implementation owners.
- Test constant migration and verify no references to the removed constant remain.
- Run relevant tests, coverage (project statement target at least 80%), lint and typecheck during implementation; report actual outcomes separately from plans.

## Execution status

- Specification initially aligned on 2026-11-15; entity resolution assigned to WP 014.
- Earlier integration review at `26aefe9` identified existing WP 009 pending commands and person acceptance; this historical review is not proof of current implementation completeness.
- Decisions recovered and saved on 2026-11-16; points 1–3 subsequently recorded, followed by this consolidation of points 4–8 and shared-filter rules.
- WP 010 is complete in its agreed contract/domain scope. WP 011 remains in planning; technical implementation is not authorized by this documentation update.
- Documentation only: no application code, other work-package files or UI task changed. No tests, coverage, lint or typecheck were run for this update. No merge is included.
