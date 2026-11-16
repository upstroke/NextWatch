# LLM parser contract

## Specification

### Purpose and authority

Define validated LLM parser input/output and a pure application adapter. Reuse [WP 009](009-search-state-and-filter-catalog.md), completed [WP 010](010-clarification-and-guardrails.md) and [WP 012 participation semantics](012-search-execution-and-discover.md#scope), not a competing state model.

This is the authoritative consolidated product specification. The [implementation plan](../../tasks/011-llm-parser-contract-plan.md) contains proposed fields, bounds and examples pending technical review. The [2026-11-16 decision supplement](011-parser-contract-decisions.md), committed in `1374785`, remains a historical decision record; its request for future consolidation is fulfilled by this revision. Product decisions are requirements, not evidence of implementation or approval of the full code plan.

### Scope and ownership

- WP 011: parser contracts, fixed instruction/context composition, JSON-schema response contract, deterministic validation, pure mixed-change adapter, directly necessary separately approved schema/domain extensions and shared person-limit cleanup.
- Reuse `SearchState`, accepted identity records, pending operations, controlled acceptance, correction, genre compatibility and stale-response guards. Apply supported filters through `applyIntent()` and pending commands through `applyPendingQueryCommand()`; extend only concrete gaps through an approved file-level plan.
- Keep `ChatIntentSchema` as the existing filter-application boundary. Do not weaken it to apply arbitrary changes under clarification status, or permit chat intents to set accepted people/person IDs.
- WP 014: live person/keyword resolution, uniqueness policy, candidate continuation and transient resolution retries.
- WP 012: explicit execution readiness/confirmation, separate Movie/TV execution paths, executed snapshots/results and transient search retries.
- WP 013: title disambiguation and providers. UI/wizard rendering remains the [deferred task](../../tasks/clarificaton-flow.md).
- No live provider client, parser HTTP endpoint, CLI implementation, network side effects, retry timers, persistence, UI or title execution in this documentation task. Dependency order remains WP 011 → WP 014 → WP 012.
- Remove `MAX_PERSON_CLARIFICATION_CANDIDATES` during approved implementation; migrate all actual application/test references to `MAX_PERSON_IDS`, keeping value five and the separate known-title limit unchanged. Verify the reference inventory rather than assuming it complete.

### Extraction and preserved meaning

- Extract supported criteria and unresolved person/keyword queries. Incomplete names such as Tom are valid; do not invent surnames, identities or IDs.
- Preserve common acting participation when people are joined by AND, not crew work or appearances as oneself. TV person intent remains valid despite its different execution route; do not drop it because the Movie Discover cast path is unsuitable. WP 012 owns the planned verified TV-credit route, role checks, deduplication and intersection, and the unguarded cast-mapping follow-up.
- Missing criteria imply no change. For a new search the application supplies the default including movies and series; follow-ups preserve the current media type unless explicitly changed.
- Preserve mention order and explicit relationships. Do not invent OR support, numeric approximations, sorting modes or new filter capabilities.
- Relevant existing fields are media type, person IDs derived from accepted people, keywords, genres, minimum rating, year bounds and sorting. Inspected limits are five people, three keywords and three genres; rating 0–10; years 1900–2100; sorting `popularity.desc` or `vote_average.desc`. Reuse the current catalog/value schemas rather than duplicating domain constants.
- Runtime, provider selection, language and exclusions are not current filter fields. Check existing specifications before treating strict/non-exact numeric wording or list AND/OR as a new supported capability.

### Mixed requests and clarification

- Apply unambiguous independent changes while unrelated wishes remain pending. Pending values are not accepted criteria. Preserve all unapplied intentions and unrelated accepted/pending/inactive values.
- Example: switching to TV while replacing Tom Hanks with Chris may apply TV, but retains Tom Hanks and the complete unresolved replacement.
- During active clarification a bare name refines that request; an explicit addition creates another. An explicit reference to another pending wish takes precedence over the active question.
- Clarify in mention order by default. Preserve original context, offer additional candidates and free-text refinement when available, and invalidate old candidates/questions after correction.
- No match retains the same request for correction; only explicit discard ends it without resolution. No match, ambiguity and technical failure are different outcomes.
- A uniquely and successfully resolved person is accepted without an additional confirmation. One returned candidate alone is not proof of uniqueness; WP 014 defines the policy.

### Internal references and trust

- The application may supply opaque references for relevant accepted criteria and pending requests. The model may return supplied references appropriate to the operation, but must never allocate references or invent provider IDs or authoritative revisions.
- The application validates membership, target kind, allowed operation and request/state/session association. Keep authoritative request/revision binding outside model control; reject stale/replayed responses, including obsolete questions where criteria revision did not change.
- References only identify the target of an interpretation. They neither prove identity nor authorize acceptance or mutation. Do not replace genuine semantic ambiguity with a guessed technically valid reference.
- All visible questions, choices and messages use names and meaningful descriptions, not technical references or operation names. Buttons invoke structured application actions without an LLM call.
- Reference targeting is separate from genre catalog supply. Complete genre catalogs are application-supplied input, not model-generated lists or provider identity evidence; labels alone are not trusted IDs.

### Replacement and duplicates

- A person may be replaced by one or several people. Preserve the source and the entire replacement set as one intention. Keep the accepted source until all replacements are resolved and the complete replacement is valid; apply the accepted replacement together.
- If the source is ambiguous, clarify the source first while retaining every replacement query. Offer only application-validated eligible source choices. Do not silently choose a source or a replacement subset.
- Deduplicate by resolved ID, not display name. Duplicate additions close their request and retain the accepted identity once, with a brief explanation. A replacement to an already accepted identity removes the source and retains the destination once; no extra duplicate question is needed. Preserve the source if it is itself a member of the final replacement set.
- A targeted genre/keyword replacement preserves unrelated values. Explicit whole-selection replacement, internally `replace_all`, replaces the complete selection of that criterion. Keep the previous selection until the entire new selection is clarified, supported and valid; never clear first or apply a partial resolvable subset.
- Whole genre selection includes the complete active/inactive wish. Reapply existing compatibility rules rather than silently retaining excluded old inactive genres or losing new incompatible wishes.
- These product rules do not assert that one-to-many acceptance, controlled keyword replacement or whole-selection continuation already exists.

### Capacity and overflow

- Accepted people occupy slots; pending additions reserve slots; candidate alternatives for one request do not reserve extra slots. Refinement adds no slot.
- One-to-one replacement reuses its source slot. One-to-many replacement must account for the entire resulting deduplicated accepted set and applicable pending-addition reservations; it is not automatically a one-slot operation. Recompute against current state at acceptance.
- Related overflowing wishes remain in bounded ephemeral continuation context outside the bounded accepted/pending-addition collection, not as an invalid sixth entry or hidden accepted slot.
- Explain overflow and pending reservations. Ask whom to add/replace or which wish to discard. Never choose an arbitrary subset. Selecting one addition does not discard unselected wishes; retain them until resolved or explicitly discarded.
- Use criterion-specific limits/accounting: active keywords plus pending additions, and active plus inactive genres, already share their respective bounds. Do not blindly copy person accounting.
- Full continuation-context behavior and bounds require technical review; there is no unbounded alternative state. Preserve existing work on failure.

### Spelling mistakes

- Obvious spelling mistakes in ordinary language may be interpreted without an extra question when meaning is clear and the resulting operation is supported.
- For names and keyword terms retain the original supplied term and optionally a proposed corrected search form. A correction is a resolution hint, not an accepted identity or proof of uniqueness. Do not rely on guaranteed provider typo tolerance.
- Do not expand incomplete names or rewrite an unfamiliar valid name to a more popular one. Resolve identities through the trusted boundary; clarify ambiguity/no match normally.
- Do not guess numeric corrections, missing digits, negation, replacement targets or operation scope. Rating 88 is not silently 8/8.8; year 202 is not silently 2020.
- Retain original terms only in necessary ephemeral processing context, not permanent real-conversation storage. No automatic extra model call. WP 014 must explicitly plan any bounded additional lookup strategy.

### Cancellation, locks and retries

- Stop/Cancel while idle does not directly mutate criteria or execute a search. Present scope choices: discard current/specified wish, discard all pending while retaining filters, reset everything, or return unchanged. Without pending wishes clarify whether to reset.
- Execute only the selected scope and confirm it. After confirmed cancellation do not automatically search, retry or activate another question. Deliberate continuation resumes clarification; a new bare name cannot answer a closed question.
- Lock new input and state-changing actions during parser/resolution/search processing and retries; show status. Unlock for clarification, completion or terminal failure while retaining wishes.
- Transient resolution/search failures allow at most three attempts total per step and cycle, stop on success, then offer explicit retry/cancellation after terminal failure. Explicit retry starts a new bounded cycle. Do not multiply attempts through nested retry layers.
- Parser failures receive no automatic model repeat. No automatic invalid-output repair, permanent-error retry or provider/model failover. Another model call requires explicit retry. Concrete timing/error classification belongs to the responsible later implementation.

### Wizard and execution separation

- The wizard replaces the normal search input, shows one question at a time and is not a modal. Refine request opens free text inside it; normal input stays hidden. Accepted people appear as pills without restoring input alongside an active wizard.
- Cancellation choices stay inside the wizard; returning unchanged resumes the question. Confirmed cancellation shows retained filters/wishes with deliberate continuation. Preserve keyboard access, focus and accessible status.
- All ready/clarified requests require final review and explicit Search now. Never execute by silently omitting pending/unsupported work, or automatically upon the last answer.
- Edited criteria and the last executed snapshot/results remain distinct. Old results must not be relabelled as matching edited criteria. Only confirmed ready execution updates results and restores the readable executed query/input.

### Prompt, JSON and failure boundary

- Maintain the fixed English Markdown prompt only in `src/lib/parser/instructions.ts`. Version instructions separately from input/output contract versions. Compose trusted instructions, minimal serialized application context and current untrusted user input separately.
- User text and names cannot override rules. Do not send secrets, result lists or full histories by default, or persist real conversations.
- Use one dedicated Zod-compatible response contract and derive JSON Schema consistently. Provider-side Structured Outputs complement local validation; a request for JSON alone is not the boundary. Provider capability/fallback requires separate review; do not weaken domain schemas or remove transforms to export them.
- Validate normalized completion/status, JSON, external schema, application request association and domain semantics before mutation. Allow supplied target references, never fabricated references, provider identity assertions or model-controlled revisions/search authorization.
- Distinguish refusal, truncation, transport/timeout, malformed JSON and schema-invalid responses from valid clarification/unsupported interpretations. Technical failures need not contain valid success JSON and preserve state.
- Independent domain-valid groups may proceed while other intentions are retained; coupled changes cannot partially apply. Unexpected internal inconsistency rejects the adapter result without committing a partial working copy. Never silently omit a failed wish.
- The first later interactive surface is a real-LLM CLI with initially mocked search data/execution. Automated tests remain deterministic. NVIDIA Build, OpenRouter and Google AI Studio/Gemini API are unselected options, not verified integrations. Provider/CLI work requires its own approval.

## Validation and acceptance

Test synthetic composition/validation and pure adapter scenarios with real internal transitions and mocked external boundaries. Cover mixed requests, incomplete names, AND intent, unchanged media type, targeting/refinement, no-match retention, source ambiguity, duplicates, multi-replacement capacity, whole-selection atomicity, active/inactive genres, typo hints, overflow retention, reference/revision/replay checks and absence of implicit execution/retry. Test constant migration through a real reference inventory. Do not duplicate generic Zod behavior or already covered domain rules.

During implementation run relevant suites, `pnpm test`, `pnpm test:coverage`, `pnpm lint` and `pnpm typecheck`; preserve at least 80% statement coverage including unimported application modules. Report commands actually run, not inferred success. HTTP/browser/live-provider work is not authorized here.

## Execution status

- WP 010 remains complete; WP 011 is in technical design, not runtime completion.
- Consolidated the 2026-11-16 decisions, including the `1374785` supplement and subsequently approved spelling policy. This revision supersedes older blanket reference prohibitions and one-slot assumptions for multi-replacement.
- English instruction draft `0.1.1-draft` exists at `166e144`; it is not connected to runtime or automatically aligned with the concrete draft.
- Field-level design, examples, file map and remaining gates are in the linked plan. Documentation approval is not application-code approval.
- Prior review history: integration review `26aefe9`, initial read-only baseline `5c85d69`, follow-up `a6fe74b`, prompt/JSON specification `a8dbca0`. These do not establish current passing tests or exhaustive caller coverage.
- This revision changes documentation only. No validation commands, application changes, live lookups, PR or merge. Remote inspection does not prove local cleanliness or absence of unpushed work.
- Downstream WP 012/WP 014 and wizard-task alignment remains a separately reviewed documentation follow-up; do not claim those files were updated.
