# WP 011 — continuation request and question binding plan

Date: 2026-11-17. Target branch: `feat/011-llm-parser-contract`. Initial inspection baseline: `8348747`; targeted consistency review and clarifications: `8be4d87`. Concrete input/output forms follow the clarified plan in `509a620`.

Status: concrete technical proposal, not implemented runtime behavior or completed review of all WP 011 gates. Approval to commit this document records the plan; application-code changes require a separate resolved write approval.

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

| Ownership    | Required target fields                                                                       | Authoritative lookup                                                            |
| ------------ | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| canonical    | `ownership`, `criterion` person/keyword, `queryRef`                                          | Current `SearchState.pendingQueries`; no copied query text or artificial parent |
| continuation | `ownership`, `criterion` person/keyword/genre, `intentionRef`, `queryRef`, `queryGeneration` | Current continuation parent and owned child                                     |

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

## 7. Helpers and implementation files

The exact discriminated data forms, outcome fields and validation precedence are specified in section 9. These are design contracts, not existing runtime exports.

| Helper                                | Explicit inputs                                                                              | Success status              |
| ------------------------------------- | -------------------------------------------------------------------------------------------- | --------------------------- |
| `issueParserContinuationBinding`      | Current application context, stored registry, issuance command                               | `issued`                    |
| `checkParserContinuationBinding`      | Current application context, stored registry, incoming association, trusted expected purpose | `current`                   |
| `consumeParserContinuationBinding`    | Same inputs as check                                                                         | `consumed`                  |
| `reconcileParserContinuationBindings` | Current application context, stored registry, application-owned query invalidations          | `unchanged` or `reconciled` |
| `retireParserContinuationBindings`    | Routed expected sessionRef, stored registry                                                  | `retired`                   |

Application context references existing contracts; it is not a second editable state model. Workflow issuance permission is enforced by the caller; no speculative generic workflow object is added here. No runtime schema is required for every internal helper result.

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
- Unknown variant fields and forbidden cross-variant fields reject; issuance-command and stored-binding capabilities remain distinct.
- Simultaneous-error cases verify section 9 validation precedence; no-op reconciliation returns an isolated registry and no retired-reference field.

The reviewed precision points, cleanup ordering and concrete forms are recorded here; this does not mark all review gates closed or approve application implementation. After implementation run focused suites, `pnpm test`, `pnpm test:coverage`, `pnpm lint` and `pnpm typecheck`, preserving the documented coverage threshold. No validation commands were run for this documentation-only revision and no runtime behavior was added.

## 9. Concrete discriminated input/output forms

All boundary objects and nested variants are strict. Missing required fields reject; fields absent from a variant are forbidden, not optional null placeholders. Reference fields reuse the existing reference contract; revisions/generations/counters are nonnegative safe integers. Stored/command/association types derive from their dedicated Zod schemas; helper results are TypeScript discriminated unions without extra runtime schemas.

### 9.1 Target and question forms

Discriminator: `ownership`.

| Variant      | Exact required fields                                                                                             |
| ------------ | ----------------------------------------------------------------------------------------------------------------- |
| canonical    | `ownership: canonical`, `criterion: person or keyword`, `queryRef`                                                |
| continuation | `ownership: continuation`, `criterion: person or keyword or genre`, `intentionRef`, `queryRef`, `queryGeneration` |

Query text and parent generation are forbidden. Canonical targets have no intentionRef or queryGeneration. Owned queryGeneration is an expected current child generation, not a logical-key component.

Question form: exactly `kind` (`person-selection` or `person-no-match`) and `questionRef`. Derive the allowed kind values from the existing question contracts. No candidates, text or revision copy.

### 9.2 Issuance command

The strict top-level command combines `allocation` with a purpose-discriminated payload:

| `allocation.mode` | Exact allocation fields             |
| ----------------- | ----------------------------------- |
| create            | `mode: create`                      |
| renew             | `mode: renew`, `expectedBindingRef` |

| `purpose`        | Additional required command fields |
| ---------------- | ---------------------------------- |
| query_resolution | `target`                           |
| question_answer  | `target`, `question`               |

Thus each complete command has allocation, purpose and target, plus question only for question_answer. Resolution commands forbid question. Question commands structurally require a person target but may express either ownership; owned-person question commands reject semantically as unsupported-owned-question. This distinction makes the capability boundary explicit.

No command-selected bindingRef, sessionRef, epoch or sourceRevision is allowed. The application issues these from the current registry/context. expectedBindingRef belongs only to renewal allocation.

### 9.3 Stored binding and registry

Each stored binding requires exactly bindingRef, sessionRef, epoch, sourceRevision, purpose and target, plus question only for question_answer. The purpose discriminator has the same two values as the issuance command.

Unlike an issuance command, a stored question_answer binding permits only a canonical person target. Owned question bindings cannot legitimately be issued by this foundational implementation and reject structurally if found in its registry. Resolution bindings allow all section 9.1 targets.

Registry requires exactly sessionRef, epoch, sequence and outstanding, with no initialization defaults. Apply section 3 logical-key, bound, membership and canonical bindingRef-sequence invariants. Structurally valid but context-stale entries remain parseable for cleanup.

### 9.4 Incoming association and trusted context

Incoming association has exactly sessionRef, epoch and bindingRef. It carries no target, purpose, revision, generation or result payload copy. Select the authoritative target from the stored binding.

Check/consume receive expectedPurpose (`query_resolution` or `question_answer`) as a separate application-owned argument, never as a response-selected processing mode. Invalid expected-purpose values at the boundary are invalid-command.

Current application context has expectedSessionRef from trusted routing, state (previously validated SearchState), continuation and personSession. The latter two are current application-owned values validated at their relevant boundary; registry is a separate argument. A structurally valid but stale active question is not invalid-context: question freshness is checked only where relevant. A malformed person session or inconsistent continuation association is invalid-context. Retire needs only routed expectedSessionRef and registry.

Reconciliation receives an explicit application-owned list of query references to invalidate, using existing reference rules and bounded by MAX_PARSER_CONTINUATION_QUERIES. Duplicates are harmless set membership, not additional work. Intention refs are not treated as blanket child invalidations. Invalid list shape is invalid-invalidations. Issuance internally reconciles with no explicit query invalidations; its caller must first apply any external invalidation facts atomically with the responsible state transition.

### 9.5 Outcome forms

Discriminator: status. Each row lists the only fields besides status.

| Helper       | status     | Required fields                       |
| ------------ | ---------- | ------------------------------------- |
| issue        | issued     | registry, binding, retiredBindingRefs |
| check        | current    | binding                               |
| consume      | consumed   | registry, binding                     |
| reconcile    | unchanged  | registry                              |
| reconcile    | reconciled | registry, retiredBindingRefs          |
| retire       | retired    | registry, retiredBindingRefs          |
| every helper | rejected   | reason                                |

No rejected result includes proposed next stores. Returned binding/registry values do not alias mutable caller data. retiredBindingRefs is unique, follows original registry order, and includes a renewed old reference exactly once. issued uses this same form for creation and renewal; its retired list may be empty. reconciled requires at least one removed entry; unchanged forbids retiredBindingRefs. consumed removes exactly the returned binding, performs no unrelated cleanup and adds no redundant consumed-ref field. retired always advances epoch, even from an empty registry; its retired list may be empty. None of these results means an identity was accepted or persistence completed.

### 9.6 Rejection reasons

Use operation-specific subsets of these literal reasons, not one indiscriminate error type for every helper:

| Category            | reason literals                                                                                |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| Structural boundary | invalid-registry, invalid-context, invalid-command, invalid-association, invalid-invalidations |
| Lifetime            | session-mismatch, epoch-mismatch                                                               |
| Association         | unknown-binding, purpose-mismatch, unknown-target, target-mismatch                             |
| Freshness           | stale-revision, stale-generation, stale-question                                               |
| Capability          | unsupported-owned-question                                                                     |
| Issuance            | binding-exists, renewal-mismatch, sequence-exhausted, capacity-exceeded                        |
| Epoch advancement   | epoch-exhausted                                                                                |

unknown-target means the referenced query cannot be found; target-mismatch means a current ref has the wrong criterion, ownership or parent. stale-generation applies to owned children. stale-question covers closed/replaced/out-of-order questions and kind/token/query/revision mismatch. Invalid person-session structure is invalid-context instead. Unknown/consumed/retired binding refs share unknown-binding; no tombstone history is required.

Issue can return structural registry/context/command, session-mismatch, renewal-mismatch, target/freshness/capability, binding-exists, sequence-exhausted and capacity-exceeded reasons. Check/consume can return invalid-registry/context/association/command, session-mismatch, epoch-mismatch, unknown-binding, purpose-mismatch and target/freshness reasons. Reconcile rejects only invalid-registry/context/invalidations or session-mismatch; individually stale/missing bindings are retired rather than rejecting the entire cleanup. Retire rejects only invalid-registry, invalid-context for malformed routed reference, session-mismatch or epoch-exhausted.

### 9.7 Validation precedence

Common gate, stopping at the first failure:

1. Stored registry structure and internal invariants.
2. Trusted expected sessionRef/context validity and registry-versus-routed session match.
3. Operation command/association/invalidations shape, including expectedPurpose where applicable.
4. Incoming association session match, then epoch match, for check/consume.

Check and consume then look up binding, compare expected purpose, check source revision, resolve target/ownership/parent, check child generation, then validate active question. Consume repeats this full path against its own current inputs; a previously returned current binding is not an authorization token.

Issue then checks renewal's expected binding against the original registry; resolves the proposed target and question capability; checks expected child generation and active question; computes private cleanup; checks remaining logical-key occupancy for create; checks sequence exhaustion; checks capacity; and only then allocates the next reference. Every failure returns no cleanup proposal.

For reconcile, invalid stored context rejects before scanning entries. Otherwise scan original order and retire entries failing their current association or matching explicit query invalidations; retain survivors unchanged. Output unchanged if none retired. For retire, after its applicable common gate check epoch exhaustion, then return epoch + 1, original sequence and empty outstanding. No question/workflow mutation occurs.
