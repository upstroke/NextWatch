# LLM parser contract

## Specification

### Purpose and authority

Define validated LLM parser input/output and a pure application adapter. Reuse [WP 009](009-search-state-and-filter-catalog.md), completed [WP 010](010-clarification-and-guardrails.md) and [WP 012 participation semantics](012-search-execution-and-discover.md#scope), not a competing state model.

This is the authoritative consolidated product specification. The [implementation plan](../../tasks/011-llm-parser-contract-plan.md) contains proposed fields, bounds and examples pending technical review. The [decision supplement](011-parser-contract-decisions.md) remains the decision history: sections 1–3 were consolidated in `5fa186d`; the subsequently approved R02/R06 policies in sections 4–5, recorded in `a2c548e`, are incorporated below. Product decisions are requirements, not evidence of implementation, technical review closure or approval of the full code plan.

### Scope and ownership

- WP 011: parser contracts, fixed instruction/context composition, JSON-schema response contract, deterministic validation, pure mixed-change adapter and directly necessary separately approved schema/domain extensions.
- Reuse `SearchState`, accepted identity records, pending operations, controlled acceptance, correction, genre compatibility and stale-response guards. Apply supported filters through `applyIntent()` and pending commands through `applyPendingQueryCommand()`; extend only concrete gaps through an approved file-level plan.
- Keep `ChatIntentSchema` as the existing filter-application boundary. Do not weaken it to apply arbitrary changes under clarification status, or permit chat intents to set accepted people/person IDs.
- WP 014: live person/keyword resolution, uniqueness policy, candidate continuation and transient resolution retries.
- WP 012: explicit execution readiness/confirmation, separate Movie/TV execution paths, executed snapshots/results and transient search retries.
- WP 013: title disambiguation and providers. UI/wizard rendering remains the [deferred task](../../tasks/clarificaton-wizzard-flow.md).
- No live provider client, parser HTTP endpoint, CLI implementation, network side effects, retry timers, persistence, UI or title execution in this documentation task. Dependency order remains WP 011 → WP 014 → WP 012.
- Keep `MAX_PERSON_IDS` and `MAX_PERSON_CLARIFICATION_CANDIDATES` independent, currently five each: search-state capacity differs from alternatives offered for one pending request. Keep `MAX_PERSON_CLARIFICATION_KNOWN_TITLES` at two. The user withdrew the former migration requirement on 2026-11-17; it is not an outstanding implementation or removal-oriented reference-inventory task.

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
- Existing scheduled wishes retain their valid reservations. Later wishes must not silently displace them; wishes that cannot fit remain available for capacity clarification.
- When new related wishes compete for capacity within the same submitted request, do not schedule an arbitrary subset merely because of processing order. Preserve the competing intentions for an explicit capacity decision.
- Count unresolved identities conservatively. Recognize identity duplicates only through trusted resolution, not name similarity or model guesses. A multi-person replacement reserves the additional capacity needed by the common operation while retaining its accepted source.
- Example: with four accepted people, an existing replacement of one person by two may validly reserve the remaining slot. A later unrelated addition cannot take that reservation. If both competing wishes arrive together as a new related group, do not silently choose one.
- Related overflowing wishes remain in bounded ephemeral continuation context outside the bounded accepted/pending-addition collection, not as an invalid sixth entry or hidden accepted slot.
- Explain overflow and pending reservations. Ask whom to add/replace or which wish to discard. Never choose an arbitrary subset. Selecting one addition does not discard unselected wishes; retain them until resolved or explicitly discarded.
- Use criterion-specific limits/accounting: active keywords plus pending additions, and active plus inactive genres, already share their respective bounds. Do not blindly copy person accounting.
- Exact reservation arithmetic, interactions between simultaneous operations and atomic transfer mappings belong in the technical plan and its tests. Acceptance of the policy does not certify the conversational formula or existing runtime support.
- Full continuation-context behavior and bounds require technical review; there is no unbounded alternative state. Preserve existing work on failure.

### Staged resolution results and current-state acceptance

- Distinguish an identity result already validated under a valid request association from an incoming response whose association has become stale.
- An already validated result for an unchanged child query may remain staged. It is not yet an accepted criterion, a capacity reservation or permission to mutate the current state.
- Refining a child invalidates that child's previous result and candidates. Preserve unrelated unchanged child information only under its own valid bindings.
- Before atomic acceptance, recheck the current source, complete replacement/selection, capacity, provenance and all relevant request/session associations. Do not bypass existing domain acceptance guards or accept compound replacements through independently committed singular replacements.
- Reject stale incoming responses; never make them current by changing their source revision. Retaining a previously validated fact does not authorize relabelling an old asynchronous response.
- Confirmed interruption closes the active question and outstanding response authorizations, while retaining already validated information for unchanged child queries. Resume deliberately with fresh bindings where needed; interruption does not itself start another lookup, model call or search.
- Discard removes the corresponding open work and its associated staged results/bindings, without undoing unrelated already accepted criteria.
- Example: when Tom Hanks is to be replaced by Chris Evans and Brad Pitt, a validated Chris Evans result may remain while the other child is refined. The changed child's old candidates/results are invalid; Tom Hanks stays accepted until the complete current operation passes controlled atomic acceptance.
- Concrete session lifetime, generations, invocation consumption, invalidation rules and current-state acceptance mappings remain technical-plan work. WP 014 establishes trusted resolution/provenance; the pure domain boundary controls acceptance. These requirements do not claim an implemented staging mechanism or authorize automatic retries.

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

Test synthetic composition/validation and pure adapter scenarios with real internal transitions and mocked external boundaries. Cover mixed requests, incomplete names, AND intent, unchanged media type, targeting/refinement, no-match retention, source ambiguity, duplicates, multi-replacement capacity, whole-selection atomicity, active/inactive genres, typo hints, overflow retention, reference/revision/replay checks and absence of implicit execution/retry. Preserve the independent person-capacity, candidate-group and known-title limits. Do not duplicate generic Zod behavior or already covered domain rules.

Add focused acceptance coverage for protected existing reservations versus later wishes, new related capacity competition without arbitrary subsets, retained validated unchanged-child facts, invalidation after refinement, stale incoming responses, interruption/resumption and current-state revalidation before atomic acceptance. These are required implementation checks, not tests executed by this specification update.

During implementation run relevant suites, `pnpm test`, `pnpm test:coverage`, `pnpm lint` and `pnpm typecheck`; preserve at least 80% statement coverage including unimported application modules. Report commands actually run, not inferred success. HTTP/browser/live-provider work is not authorized here.

## Execution status

- Updated 2026-11-17: active branch is `feat/011-shared-change-adapter`, created at `b742dd84b52a3a3d710d9a7e86a4cf23734bb7ae` immediately before `db830a50`. The former branch remains a reference; its later implementation is not imported here.
- The original shared-adapter direction remains valid. This update does not replace the implementation plan or review, or declare the original product specification incorrect. Their earlier branch/status references describe their historical design context; current implementation evidence is in the [active-branch progress record](../../tasks/011-llm-parser-contract-progress.md).
- WP 010 remains accepted. Parser schemas/export code, pure request composition, response validation and synthetic unit suites are present through `b2e8407`, `0400ce4`, `4eac220` and baseline formatting `b742dd8`. The complete shared mixed-change adapter remains open.
- English instruction draft is `0.1.2-draft` from `348091d`; it is not provider-connected. Existing schema/composition code does not prove every modeled capability or downstream mapping is implemented.
- The later constant migration was withdrawn. The separate existing constants and known-title limit remain unchanged. Historical migration instructions, including in the retained plan, are superseded; the preparatory inventory is not claimed complete.
- Accepted A/R02 and B/R06 policies remain binding. Existing technical designs and R01–R06 verification gates are not automatically approved or closed. Continue by reviewing the full shared-adapter scenario and actual affected APIs, not by automatically restoring later criterion-specific wrappers.
- This status/decision alignment changes only documentation. No runtime code, schemas, tests, constants, prompt, wizard UI, provider/HTTP/CLI, persistence, retries or title execution changed. No validation commands ran, no PR or merge. Remote access does not prove local cleanliness or unpushed work.
- Downstream WP 012/WP 014 and wizard-task wording alignment remain separately scoped where concrete integration requires it.
