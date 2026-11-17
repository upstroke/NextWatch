# WP 011 — continuation request and question binding plan

Date: 2026-11-17. Target branch: `feat/011-llm-parser-contract`. Inspection baseline: `8348747`.

Status: proposed technical slice for review, not implemented runtime behavior. Approval to commit this document records the plan; application-code changes require a separate resolved write approval.

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

Proposed application registry:

- `sessionRef`: opaque lifetime identifier supplied by the application; never reused for a new session.
- `epoch`: nonnegative safe integer. Confirmed interruption/reset advances it and clears outstanding authorizations; resume uses the current epoch and deliberately issues fresh bindings.
- `sequence`: nonnegative safe integer, retained across epochs. Issuance advances it; `bindingRef` is derived as `continuation-binding-<sequence>` and is meaningful only with sessionRef/epoch.
- `outstanding`: bounded list of issued bindings only; consumed/retired bindings are removed, not retained as an unbounded history.

Each immutable binding contains `bindingRef`, `sessionRef`, `epoch`, `purpose`, `sourceRevision`, `target` and, only for question answers, `question`.

`purpose` is `query_resolution` or `question_answer`. A binding issued for one purpose cannot be consumed for the other. No parser-invocation acceptance is implied. Parser invocation lifetime remains its own integration work.

Target variants:

| Ownership | Required target fields | Authoritative lookup |
| --- | --- | --- |
| canonical | `ownership`, `criterion` person/keyword, `queryRef` | Current `SearchState.pendingQueries`; no copied query text or artificial parent |
| continuation | `ownership`, `criterion` person/keyword/genre, `intentionRef`, `queryRef`, `queryGeneration` | Current continuation parent and owned child |

Canonical query identity and revision come from the existing domain transition. Linked canonical children use the canonical variant even if a continuation intention refers to them. No canonical child generation is invented.

The owned child's parent generation is deliberately not an unconditional freshness requirement: refining one sibling advances its parent but must not by itself invalidate an unchanged child's association. Changes to a source, criterion, ownership or operation invalidate all dependent child bindings explicitly; those mutations require future atomic transition integration. The initial slice cannot claim safety for unsupported mutations.

For `question_answer`, `question` contains `kind` and `questionRef`, referencing the authoritative active clarification session. No question text, candidate list or mutable question copy is stored here. For `query_resolution`, `question` is forbidden. Question kind initially names the supported person selection/no-match shapes; additional kinds require explicit mappings and tests. A person question cannot be bound to a keyword/genre target.

## 4. Issuance and boundedness

- Reuse existing reference, revision and generation schemas where their semantics match. Add named bounds to `src/lib/config/domain.ts`; do not duplicate unexplained literals.
- Proposed maximum outstanding bindings: twice the existing maximum continuation-query count, allowing at most one binding per target and purpose. Canonical and owned queries share this budget; the numeric value is derived from the existing query bound.
- Issuance validates the application-owned registry, current state/continuation association, target membership, ownership and purpose. Question issuance additionally validates the actual current question and its target association.
- The initial question integration supports only existing canonical first-person questions. Owned query-resolution associations may be issued, but owned question issuance must reject until an authoritative owned-question session exists. Do not fabricate a question store to make the variant usable.
- Replacing an outstanding binding for the same target/purpose is explicit and retires the old one atomically; it does not silently evict unrelated work. Distinct target/purpose pairs do not exceed the bound.
- Sequence exhaustion rejects issuance without mutation. Retirement and consumption remain available at full capacity. Epoch exhaustion rejects interruption/reset atomically; a caller may terminate the lifetime and start a genuinely new sessionRef, never wrap counters.

## 5. Incoming response validation and consumption

Validate against the stored outstanding entry, not a caller-supplied copy of a purported binding:

1. Match the routed session lifetime, current epoch, issued binding reference and expected purpose. Unknown/consumed references reject.
2. Require `sourceRevision` to equal the current search revision. This is intentionally conservative: a canonical edit may retire incoming sibling responses even when their query text is unchanged. Never rewrite an incoming response's revision.
3. Resolve the exact current target and check criterion and ownership. For owned work, require the same parent association and child generation. Reject missing, transferred or refined targets.
4. For question answers, require the same active question token, kind and current target association from the authoritative clarification session; closed/replaced questions reject even at the same search revision.
5. Validate the response payload at its responsible boundary. Binding validity is not provider provenance, uniqueness, a valid selection or acceptance permission.
6. Remove the outstanding binding only as part of the successful owning response-processing result. Validation alone does not consume or authorize a write. Payload failure must not commit a partial consume; technical-failure consumption/retry policy needs an explicit response mapping.

Pure helpers return proposals. The caller commits consumption and resulting state/session/staged changes together with compare-and-swap or equivalent concurrency control. Two calls against the same old in-memory snapshot can both propose consumption; only one may commit. Do not advertise exactly-once processing from a pure helper alone.

## 6. Invalidations, interruption and staged facts

- Refinement/discard query invalidations retire outstanding bindings for those exact query targets.
- A removed intention retires its owned targets. An affected intention reference alone is not proof that all surviving children changed: `applyParserContinuationCommand()` reports the parent even for a single-child refinement. Compare surviving target membership/generation and use explicit query invalidations.
- Any search revision change makes old incoming bindings stale; reconcile them without rebasing. An unchanged owned sibling can retain an outstanding association across a parent-generation-only edit when its own generation, revision and lifetime still match.
- Question replacement/closure retires question-answer authorizations. It does not automatically cancel an independent query-resolution binding unless its own target/context/lifetime became invalid.
- Confirmed interruption advances epoch and retires all outstanding bindings and active questions atomically. Resume is deliberate; no automatic issuance, lookup or search. Registry epoch transition alone does not close an existing question until the later coordinator integrates both stores.
- Already validated staged facts are not outstanding authorizations. Later staging must retain valid unchanged-child facts according to R06 without treating old incoming responses as current. This slice stores no such facts.
- Ref allocation must never reuse a target reference within a session lifetime. A registry cannot infer past target reuse from a bounded current snapshot; the owning allocator must enforce this prerequisite.

## 7. Proposed file-level implementation

- `src/lib/config/domain.ts`: add the derived binding-registry bound, preserving criterion limits and the still-separate person-limit migration.
- `src/lib/schemas/parser-continuation-binding.ts`: strict target/purpose/registry schemas and inferred types; enforce registry membership, duplicate target/purpose pairs and sequence/reference consistency.
- `src/lib/domain/search/parser-continuation-binding.ts`: pure issue, check, consume and reconcile helpers, plus a proposed epoch-retirement transition. Keep current state/continuation/session inputs explicit and preserve inputs on rejection.
- `tests/unit/schemas/parser-continuation-binding.spec.ts`: meaningful structural combinations and registry invariants rather than generic Zod primitive tests.
- `tests/unit/domain/search/parser-continuation-binding.spec.ts`: real current ownership/revision fixtures and application-boundary scenarios below.

Before code approval, inspect repository instructions and actual field schemas, finalize helper signatures and outcome reasons, and review this draft for compatibility with the rest of the technical plan. Do not export a full generic session rewrite or modify the existing person lifecycle in the foundational slice.

## 8. Required deterministic scenarios

- Canonical and owned resolution issuance reference the real current target without copying text.
- A linked canonical query retains canonical ownership; unrelated parent edits do not invent a canonical generation.
- A refined owned child rejects its old association at unchanged search revision.
- An unchanged sibling remains valid after a parent-generation-only edit; the changed child does not.
- Changed search revision rejects old incoming bindings, including otherwise unchanged sibling responses.
- Unknown, wrong-criterion, wrong-owner and wrong-parent targets reject; missing work is not completion.
- Wrong lifetime, epoch, purpose, question kind or question token rejects. A closed/replaced question cannot be revived by its old answer.
- Issuance of an owned question rejects until a real authoritative owned-question session is implemented.
- Successful consumption removes one outstanding entry; replay against the returned registry rejects. Uncommitted validation is not consumption.
- Explicit replacement retires the old binding; capacity/exhaustion rejection never evicts existing bindings or mutates inputs.
- Retirement/cleanup works at capacity. Interruption retires all authorizations without starting work; old responses remain invalid after deliberate resume.
- Query invalidation does not indiscriminately invalidate unchanged siblings merely because the parent ref is listed.
- Returned registry and unchanged stores do not alias mutable caller inputs. Atomic persistence and concurrent commit exclusion remain caller obligations.

Run focused suites, `pnpm test`, `pnpm test:coverage`, `pnpm lint` and `pnpm typecheck` after implementation; preserve the documented coverage threshold. No validation commands were run for this documentation-only proposal and no runtime behavior was added.
