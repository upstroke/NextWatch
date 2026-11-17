# WP 011 — continuation request and question binding plan

Date: 2026-11-17. Target branch: `feat/011-llm-parser-contract`. Initial inspection baseline: `8348747`; targeted consistency review and clarifications: `8be4d87`.

Status: clarified technical proposal, not implemented runtime behavior or completed review of all WP 011 gates. Approval to commit this document records the plan; application-code changes require a separate resolved write approval.

Product authority: [WP 011](../docs/work-packages/011-llm-parser-contract.md). Related design: [implementation plan](011-llm-parser-contract-plan.md), especially continuation ownership and invocation association. Implementation evidence and user-reported checks remain in the [progress ledger](011-llm-parser-contract-progress.md). This supplement does not close R01–R06 or supersede product policy. The large implementation-plan tool response was truncated; this document does not claim a fresh full review of its remaining sections.

## 1. Existing implementation and purpose

- `db830a5`: bounded continuation ownership; canonical children hold references only, owned children hold their query and generation.
- `4e2a719`: pure refine/discard transition returning validated state/continuation and invalidated intention/query references.
- `da318aa`: application wrapper retiring affected or stale canonical person questions, retaining session sequence and returning state/continuation/person session together.
- `876de47`: progress and user test reports recorded. Subsequent formatting changes are not replaced by this plan.

The existing person session still addresses the first canonical pending person. Owned continuation children have no runtime question binding or result staging. This plan defines a bounded application-owned association layer for later incoming resolution responses and question answers, without introducing a second query or question owner.

## 2. Scope and exclusions

First implementation slice: dedicated association schemas, pure issuance/validation/consumption/invalidation helpers and deterministic tests. The data structure is capability-neutral; it does not implement keyword/genre question behavior merely by carrying those criterion values.

Excluded: provider lookup, uniqueness/provenance verification, candidate fetching, staging resolved facts, accepting identities, source selection, compound acceptance, capacity scheduling, mixed-parser adapter, UI, HTTP, CLI, persistence, retries and search execution. Existing person-session behavior remains unchanged until a separately tested integration slice.

## 3. Ownership and field contract

All authority comes from application storage and routing. A client/model may echo an issued reference but cannot supply authoritative session data, generations, revisions or offer contents. Shape validation alone is not authorization.

### Shared application session context

The caller loads the registry, search state, continuation and person clarification session from the same application-owned session context. The expected `sessionRef` comes from trusted routing, not from the response payload; every registry operation checks it. The current epoch is taken from the current stored registry, not a response-supplied registry snapshot. Incoming associations must match that epoch.

The existing `PersonClarificationSessionSchema` contains only sequence and active question. It cannot independently prove membership in a registry lifetime. That association is an explicit application-boundary prerequisite, not something inferred from matching question/query strings. No extra question copy, mandatory person-schema change or new storage framework is introduced in this foundational slice. The caller must not mix snapshots from different lifetimes.

### Registry and binding fields

- `sessionRef`: opaque lifetime identifier supplied by the application; never reused for a new session.
- `epoch`: nonnegative safe integer identifying the current authorization epoch. Advancing it withdraws all outstanding registry bindings, not the workflow or questions by itself.
- `sequence`: nonnegative safe integer retained across epochs. Successful issuance advances it; `bindingRef` is `continuation-binding-<sequence>`, meaningful only with sessionRef/epoch.
- `outstanding`: bounded list of immutable issued bindings; consumed/retired bindings are removed rather than kept as unbounded history.

Each binding contains `bindingRef`, `sessionRef`, `epoch`, `purpose`, `sourceRevision`, `target` and, only for question answers, `question`.

`purpose` is `query_resolution` or `question_answer`; purposes are not interchangeable. Parser invocation acceptance/lifetime remains separate integration work.

| Ownership | Required target fields | Authoritative lookup |
| --- | --- | --- |
| canonical | `ownership`, `criterion` person/keyword, `queryRef` | Current `SearchState.pendingQueries`; no copied query text or artificial parent |
| continuation | `ownership`, `criterion` person/keyword/genre, `intentionRef`, `queryRef`, `queryGeneration` | Current continuation parent and owned child |

Linked canonical children use the canonical variant, with no invented canonical generation. An owned child's parent generation is not an unconditional freshness requirement: refining a sibling advances the parent but does not itself alter this child. Source, criterion, ownership or operation changes must explicitly invalidate dependent bindings in their future atomic transitions; this slice cannot claim safety for unsupported mutations.

For `question_answer`, `question` has `kind` and `questionRef`, referring to the authoritative active question. No question text or candidates are copied. For `query_resolution`, `question` is forbidden. Initial question kinds match existing person-selection/person-no-match contracts; a person question cannot target keyword/genre work. Owned question issuance rejects until a real owned-question session exists.

### Logical keys and registry invariants

Within a registry, the logical key is `(ownership, criterion, queryRef, purpose)` for canonical targets and additionally `intentionRef` for owned targets. Compare structured field tuples, not ambiguous delimiter-concatenated strings.

`queryGeneration`, `sourceRevision`, `questionRef` and `bindingRef` are binding/freshness attributes, not extra logical-key slots. A changed generation or question cannot create a second outstanding binding for the same target/purpose.

Schema-level invariants:

- At most one entry per logical key, and unique binding references.
- Every entry has the registry's sessionRef and epoch.
- Each bindingRef encodes a positive safe-integer issuance sequence using the canonical decimal form, with no leading zeros, and at most the registry sequence. Encoded sequence values are unique; retired/consumed gaps are allowed. Sequence zero implies no outstanding entries.
- Counters never decrease or wrap through controlled transitions. Initialization is explicit; parsing stored registries must not silently default missing lifetime/counter data to a fresh registry. Historical monotonicity cannot be proven by a single snapshot schema.
- Registry bound and strict target/purpose variants apply. Existence and current freshness are checked against application context, not falsely guaranteed by structural parsing. Stale but structurally valid entries remain parseable for reconciliation.

## 4. Issuance, renewal and boundedness

Reuse existing reference/revision/generation schemas where semantics match. Add a named maximum in `src/lib/config/domain.ts`, derived as twice `MAX_PARSER_CONTINUATION_QUERIES` (currently 128); canonical and owned work share it. Preserve criterion limits and the separate person-limit migration.

Issuance validates the stored registry, routed lifetime, current state/continuation association and exact target. Question issuance additionally checks the authoritative current question and first-canonical-person restriction. No generic owned-question store is fabricated.

Creation and renewal are distinct explicit operations:

- Creation fails if a current binding already occupies the logical key.
- Renewal requires the expected existing `bindingRef` for that key. Check it against the original validated registry before working-copy cleanup; if absent/different, reject without retiring a newer binding. A matching but now stale existing entry may be replaced after current target/question validation.
- Successful renewal allocates a fresh sequence/reference and reports the replaced reference. It never modifies an old binding in place or evicts another logical key.

Before capacity evaluation, issuance computes a context-reconciled private registry copy and removes stale entries. On successful issuance, return that copy, the new binding and retired-reference facts together. If any check, sequence limit or capacity check fails, return rejection without committing cleanup. A standalone reconciliation operation remains available. No automatic generation/revision rebasing occurs.

Sequence exhaustion rejects issuance even if cleanup could free space; standalone cleanup/consumption remain usable. Epoch exhaustion rejects epoch advancement atomically; ordinary reconciliation/consumption still work. A terminated lifetime may be replaced only by a genuinely new application sessionRef, never counter wrapping or same-lifetime reinitialization.

## 5. Incoming validation, consumption and application processing

Look up the stored outstanding entry by its issued reference and match the expected routed lifetime, current registry epoch and expected purpose. Incoming sessionRef/epoch/reference are association values to compare, not authority to replace stored context. Unknown, consumed or retired entries reject.

Require the stored sourceRevision to equal current search revision. Resolve the current target and check criterion, ownership, parent association and owned child generation. For question answers, match the active question token, kind, query and revision from the authoritative person session. Closed/replaced/out-of-order questions reject even at unchanged revision. Never rewrite an incoming association to current revision/generation.

Separate three responsibilities:

1. A check helper validates the association without consuming or changing anything. Its returned binding is data, not a durable acceptance token.
2. A consume helper repeats the full association check against its current registry/context and returns a proposal removing exactly that entry. It does not know whether an external result payload is semantically valid.
3. The owning application function validates the payload, performs the domain/staging proposal, obtains the consume proposal and commits them together only if all steps succeed. A failed payload/domain step must not commit isolated consumption. Do not add a client-supplied `validated` flag or freely constructible proof object as a substitute for this boundary.

The consume check uses the same current pre-transition snapshot as payload association validation. If payload processing proposes a new state revision or closes the question, do not accidentally validate the original response against that proposed post-state; reconcile remaining bindings against the post-state separately.

Binding validity is not provider provenance, uniqueness, valid selection or identity acceptance. Technical-failure consumption and retry mapping are excluded until explicitly designed.

Caller-controlled atomic persistence uses compare-and-swap or equivalent concurrency control for registry and all changed stores. Two evaluations against the same old snapshot may both propose consumption; at most one may commit. Pure helpers alone do not guarantee exactly-once execution.

## 6. Reconciliation, epoch retirement and staged facts

- Query invalidations from refine/discard retire the exact targets. Missing parents/children retire their bindings. An affected intentionRef alone must not invalidate surviving unchanged children: the existing transition reports that ref even for single-child refinement. Check current membership/generation and explicit query invalidations.
- Search revision changes retire old incoming bindings, including unchanged siblings, without rebasing. A parent-generation-only edit can preserve an owned sibling binding when its generation, revision and lifetime remain current.
- Question closure/replacement retires question-answer bindings. An independent query-resolution binding survives unless its own association is invalid.
- `retireParserContinuationBindings()` proposes epoch + 1, an empty outstanding list and unchanged sequence. It returns retired references, starts nothing and changes no search/continuation/person session. It is not `pauseSession()` or `resetSession()`.
- The later workflow coordinator owns pause state and blocks new issuance until deliberate resume. Confirmed interruption must combine workflow pause, registry epoch retirement and closing active questions in one atomic result. That coordinator integration is not implemented by this foundational helper. Registry validity alone cannot establish that issuance is allowed while paused.
- Already validated staged facts are separate from outstanding authorizations. R06 retention of valid unchanged-child facts does not make old incoming responses current; no staged facts are stored in this slice.
- Target refs are never reused within a lifetime. The allocator must enforce this prerequisite; a bounded current registry cannot infer past reference reuse.

## 7. Proposed helpers and implementation files

Public helper contracts, with final TypeScript shapes derived from dedicated schemas rather than duplicated manual data interfaces:

| Helper | Explicit inputs | Proposed result |
| --- | --- | --- |
| `issueParserContinuationBinding` | Current application context, stored registry, issuance command with target/purpose/question and create-or-renew mode; renewal includes expected bindingRef | Issued binding, next registry and retired refs, or rejection |
| `checkParserContinuationBinding` | Current application context, stored registry, incoming association and expected purpose | Current matched binding, or rejection; no changes |
| `consumeParserContinuationBinding` | Same current inputs as check | Consumed binding, next registry and consumed ref, or rejection; no payload authorization |
| `reconcileParserContinuationBindings` | Current application context, stored registry, application-owned query invalidations | Unchanged or reconciled registry plus retired refs, or invalid-input/context rejection |
| `retireParserContinuationBindings` | Routed expected sessionRef and stored registry | Epoch-advanced registry plus retired refs, or rejection |

Application context explicitly carries the trusted expected sessionRef, current previously validated search state, continuation and authoritative person session needed for question checks. It references existing contracts and is not a second editable state model. Workflow issuance permission is enforced by the caller; no speculative generic workflow object is added here.

Common outcome reasons should distinguish invalid stored registry/context/command, session mismatch, unknown binding, epoch mismatch, purpose mismatch, unknown/mismatched target, stale revision/generation/question, unsupported owned question, occupied key, renewal mismatch and exhausted sequence/epoch/capacity. Final discriminated unions and validation precedence require code-level review before implementation approval; these names are semantic requirements, not claims of existing exports. No runtime schema is required for every internal helper result.

Affected files:

- `src/lib/config/domain.ts`: derived registry bound only.
- `src/lib/schemas/parser-continuation-binding.ts`: strict schemas, inferred types and structural registry invariants.
- `src/lib/domain/search/parser-continuation-binding.ts`: the pure helpers above. Validate external/stored boundaries; avoid repeated parsing in every internal collaborator. Exported functions receive TSDoc.
- `tests/unit/schemas/parser-continuation-binding.spec.ts`: project-specific structural combinations/invariants, not generic Zod tests.
- `tests/unit/domain/search/parser-continuation-binding.spec.ts`: real ownership/revision/lifecycle fixtures and scenarios below.

Reuse repository instructions, Typing and Testing guidance. The targeted review examined the current continuation schemas/transitions, person session/lifecycle, wrapper and its tests. It did not complete the full historical technical-plan or repository-wide caller review. Existing lifecycle behavior is preserved; no automatic barrel exports or generic session rewrite.

## 8. Required deterministic scenarios and review status

- Canonical/owned resolution issuance uses the current target without copying text; linked canonical children do not gain an artificial generation/parent.
- Child refinement rejects that child's old binding at unchanged search revision while preserving a valid unchanged sibling despite parent generation advancing.
- Search revision change retires incoming sibling bindings without discarding already validated facts in a future staging layer.
- Unknown/wrong-criterion/wrong-owner/wrong-parent/missing targets reject; missing work is not completion.
- Wrong routed lifetime, epoch or purpose rejects. The application boundary must not mix person sessions from other lifetimes merely because their question strings match.
- Closed/replaced/out-of-order/wrong-kind questions reject; owned-question issuance rejects until authoritative owned-question support exists.
- Check does not consume; consume rechecks current context; replay against the consumed registry rejects. A binding returned by an earlier check does not bypass revalidation.
- Application integration tests in the later owning slice must prove payload/domain failure does not persist isolated consumption, and successful state change is associated with the pre-transition snapshot before post-state reconciliation. Foundation tests do not pretend that integration already exists.
- Renewal checks expected bindingRef before cleanup; a stale renewal command never retires a newer binding. Successful renewal reports the old ref and receives a fresh sequence.
- Generation/question changes do not create extra logical-key slots. Binding-reference format, unique sequences, lifetime membership, sequence-zero emptiness and allowed gaps are covered.
- Issuance cleans a private copy before capacity evaluation; success returns cleanup and issuance together, failure preserves the complete input. Standalone cleanup works at capacity and sequence exhaustion.
- Epoch retirement clears outstanding entries, preserves sequence and leaves the person session untouched. Epoch exhaustion is atomic. It does not claim to pause a workflow; later integration tests must prove issuance stays blocked until deliberate resume.
- Query invalidations do not indiscriminately retire siblings because their intentionRef was listed. Output proposals do not alias mutable caller inputs.
- Concurrent commit exclusion is a caller/storage obligation, not a unit-test claim about a pure helper.

This revision records the four reviewed precision points plus cleanup ordering and scope boundaries. It does not mark all review gates closed. Before code approval finalize discriminated input/output shapes and precedence. After implementation run focused suites, `pnpm test`, `pnpm test:coverage`, `pnpm lint` and `pnpm typecheck`, preserving the documented coverage threshold. No validation commands were run for this documentation-only revision and no runtime behavior was added.
