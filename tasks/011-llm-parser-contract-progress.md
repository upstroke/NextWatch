# WP 011 — implementation progress

Updated: 2026-11-17. Branch: `feat/011-llm-parser-contract`. Latest code with user-confirmed tests/typecheck/ESLint: `f6d9db2`; its coverage result remains unconfirmed. Historical fully reported-green foundation baseline: `c5d4b3e`.

The [work-package specification](../docs/work-packages/011-llm-parser-contract.md) remains product authority. The [implementation plan](011-llm-parser-contract-plan.md) remains the technical design reference. This ledger records implemented slices, validation evidence and remaining work; it does not close R01–R06 or redefine product requirements.

## Implemented slices

| Commit | Scope | Validation evidence |
| --- | --- | --- |
| `b2e8407` | Parser schemas, JSON Schema export, composition, response validation and tests | Subsequent user report after follow-ups |
| `0400ce4` | Keyword-reference and capacity-context tests | Included in subsequent local green report |
| `4eac220` | Explicit nullable-source guard | User confirmed warning gone and all checks green; parser statement coverage reported as 87% |
| `db830a5` | Bounded continuation ownership and canonical associations with tests | User reported checks green; no new numeric coverage |
| `4e2a719` | Refine/discard schema, pure transition and tests | User-reported tests/typecheck/ESLint passing; historical green convention included coverage threshold |
| `da318aa` | Person-session application function and tests | Historical tests passing; later foundation baseline reported green |
| `ebe4c41` | Bounded binding schemas, five pure helpers, registry limit and two unit suites | Foundation reported green after import correction |
| `c5d4b3e` | Removed unused domain Zod import only | Historical foundation tests/typecheck/lint green, including coverage threshold under agreed convention |
| `f6d9db2` | Registry reconciliation in continuation edit application and extended tests | User confirmed tests, typecheck and ESLint passing; integration coverage remains unconfirmed |

Earlier green reports included coverage under the established convention. For `f6d9db2`, record only the specifically confirmed checks: the latest exchange explicitly left coverage open. No fresh numeric percentage or command logs were supplied. The assistant did not execute validation commands.

## Current transition contract

- Files: `src/lib/schemas/parser-continuation-command.ts`, `src/lib/domain/search/apply-parser-continuation-command.ts` and its unit suite.
- Commands bind to state revision, intention reference and expected parent generation; these are application-owned edit associations, not full session/invocation authority.
- Effective owned refinement advances child/parent generations and preserves siblings/source/accepted criteria; exact no-ops preserve counters. Canonical changes delegate to `applyPendingQueryCommand()` and retain its revision increments. Several canonical removals may advance revision through multiple private transitions.
- Child discard preserves siblings; final-child discard removes the intention, never its accepted replacement source. Parent discard removes linked open work, not unrelated accepted identities.
- Both next stores are validated before an applied pair is returned. Failed working copies are not exposed. Query/intention invalidations describe the edit; an affected parent reference alone does not invalidate all unchanged children.
- No identity acceptance, source resolution, question activation, retry or search occurs in the edit transition.

## Person-session application and registry edit integration

Initial slice: `da318aa`. Registry extension: `f6d9db2`. Files: `src/lib/domain/search/process-parser-continuation-command.ts` and `tests/unit/domain/search/process-parser-continuation-command.spec.ts`.

- Required fifth argument: `{ expectedSessionRef, registry }`, using trusted routing and application-owned storage. Search state, continuation, person session and registry must belong to the same lifetime; structural checks alone cannot prove that loading prerequisite.
- Registry structure, expected reference and lifetime match are checked before person-session validation and command application. Invalid registry/routing/session returns rejection without partial stores. Existing application tests supply the new required argument.
- Rejected and unchanged commands do not reconcile session or registry, including already stale entries. This is not a standalone cleanup operation.
- On an applied edit, explicitly affected questions close; the existing person lifecycle reconciles revision, request membership and first-person order without opening a new question. Question sequence is preserved, including exhaustion.
- Binding reconciliation then uses the post-edit state/continuation and reconciled person session with the transition's explicit query invalidations. Old revisions, removed/refined targets and closed question bindings retire without rebasing. Unchanged owned siblings can remain valid across parent-generation-only edits.
- Applied results return state, continuation, session, registry, original invalidations and ordered `retiredBindingRefs` together. An unchanged registry yields an empty retired-ref list in this application result. A downstream rejection returns no private partial proposals.
- Caller must persist all changed stores together under concurrency control. No persistence transaction, incoming response consumption, new binding/question issuance, provider call, retry or search is implemented here.
- Tests use real binding issuance/checking and domain transitions. They cover canonical revision invalidation and rejected old bindings, sibling retention, child/parent/final-child discard without source deletion, closed-question reconciliation, unchanged stale inputs, invalid registries/routing, and existing person-session regression scenarios. No passing result is claimed for unimplemented flows.

## Binding foundation

Design history: `8be4d87`, `509a620`, `a2a456d`; see [binding plan](011-parser-continuation-binding-plan.md). Foundation implementation: `ebe4c41` plus `c5d4b3e`. The plan remains a design reference, not proof that every scenario/integration is implemented.

- `src/lib/config/domain.ts`: `MAX_PARSER_CONTINUATION_BINDINGS` is twice the continuation-query limit, currently 128. Criterion and known-title limits are unchanged.
- `src/lib/schemas/parser-continuation-binding.ts`: strict canonical/owned targets, create/renew allocation, purpose-specific commands and stored bindings, incoming associations and bounded registry invariants. No duplicate canonical text or freshness-based extra logical-key slots.
- `src/lib/domain/search/parser-continuation-binding.ts`: pure issue/check/consume/reconcile/retire functions. Issuance uses explicit compare-and-renew, private cleanup, monotonic sequence and ordered retirements. Failure preserves inputs.
- Checking does not consume; consumption rechecks one association and proposes removal of exactly its binding, not payload validation or identity acceptance. Application-level response processing remains missing.
- Epoch retirement preserves sequence and withdraws registry bindings only; it does not close a question or pause a workflow. Storage/routing, workflow permission and atomic persistence remain caller obligations.
- Initial question bindings support canonical persons only. Owned-person question commands reject explicitly; other resolution criterion values do not implement their question flows.
- Foundation suites: `tests/unit/schemas/parser-continuation-binding.spec.ts` and `tests/unit/domain/search/parser-continuation-binding.spec.ts`, covering project-specific invariants/bounds, renewal/replay, real refinement/sibling retention, closure, invalidation, revisions/epochs, isolation and counter exhaustion.

## Validation evidence and next gate

- `f6d9db2`: on 2026-11-17 the user confirmed all tests passing, then explicitly confirmed typecheck and ESLint green. Coverage validation remains unconfirmed; neither a current coverage result nor a new percentage was supplied. Do not infer it from earlier foundation checks.
- Required statement coverage remains at least 80%, including unimported application modules. The historical 87% parser-schema figure is not a current whole-project measurement.
- Next validation gate: obtain the current integration coverage result and address any threshold failure before calling this slice fully green.
- All reports are attributed to the user. The assistant did not run tests, coverage, lint or typecheck. Reports do not validate subsequent code changes.

## Explicit limitations and follow-ups

1. Canonical correction metadata: only one query string is stored; non-null correction hints reject as `unsupported-correction`, not silently dropped. Extend without a second query owner.
2. Integrate registry consumption with response processing and complete parser invocation lifetime. Edit reconciliation is implemented, but does not establish end-to-end replay safety, coherent loading/storage or pause/reset/resume.
3. Add authoritative owned-target and non-person questions; first-canonical-pending-person restriction remains.
4. Add staged trusted result ownership, unchanged-child retention and reconciliation, followed by current-state revalidation and atomic replacement/whole-selection acceptance.
5. Implement protected reservations, related capacity competition, ownership transfer and the mixed-change adapter, including unsupported/non-query retention and coupling.
6. Migrate `MAX_PERSON_CLARIFICATION_CANDIDATES` to `MAX_PERSON_IDS` after an actual caller/test inventory; preserve five and the known-title limit.
7. Review technical-plan/checklist and downstream documentation alignment; no blanket review closure or exhaustive repository-wide inventory is claimed. Further implementation requires separately reviewed scope and approval.

WP 011 remains incomplete. Dependency order remains WP 011 → WP 014 → WP 012. No PR, merge, provider integration, HTTP/browser journey, persistence or search execution is part of these slices.
