# WP 011 — implementation progress

Updated: 2026-11-17. Branch: `feat/011-llm-parser-contract`. Current reported-green code baseline: `c5d4b3e`.

The [work-package specification](../docs/work-packages/011-llm-parser-contract.md) remains product authority. The [implementation plan](011-llm-parser-contract-plan.md) remains the technical design reference. This ledger records implemented slices, validation evidence and remaining work; it does not close R01–R06 or redefine product requirements.

## Implemented slices

| Commit    | Scope                                                                                                               | Validation evidence                                                                                         |
| --------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `b2e8407` | Parser proposal/context/invocation/envelope schemas, JSON Schema export, composition, response validation and tests | Subsequent user report, after the follow-ups below                                                          |
| `0400ce4` | Keyword-reference and capacity-context tests                                                                        | Included in subsequent local green report                                                                   |
| `4eac220` | Explicit nullable-source guard                                                                                      | User confirmed IDE warning gone and all checks green; parser statement coverage reported as 87%             |
| `db830a5` | Bounded continuation ownership schema, canonical associations and tests                                             | User reported all checks green; no new numeric coverage supplied                                            |
| `4e2a719` | Refine/discard command schema, pure transition and unit tests                                                       | User reported tests, typecheck and ESLint passing; established green convention includes coverage threshold |
| `da318aa` | Person-session application function and integration-style unit tests                                                | Historical test-only report; latest combined code baseline subsequently reported green                      |
| `ebe4c41` | Bounded binding schemas, five pure binding helpers, derived registry limit and two unit suites                      | User reported combined baseline green after the import correction below                                     |
| `c5d4b3e` | Removed only the unused domain-module Zod import                                                                    | User reported tests green, typecheck and lint passing on 2026-11-17                                         |

A user report of green means tests, coverage threshold, ESLint and typecheck. The assistant did not execute those commands. Historical passing reports do not validate later changes; the latest combined-code report covers the baseline identified above. No fresh numeric coverage percentage or command logs were provided.

## Current transition contract

- Files: `src/lib/schemas/parser-continuation-command.ts`, `src/lib/domain/search/apply-parser-continuation-command.ts` and `tests/unit/domain/search/apply-parser-continuation-command.spec.ts`.
- Commands bind to current state revision, intention reference and expected parent generation. These are application-owned command associations, not LLM authority or full session/invocation authorization.
- Effective owned refinement preserves source, sibling queries and accepted criteria, while advancing child and parent generations. Exact owned no-ops preserve counters.
- Canonical refinement/removal delegates to `applyPendingQueryCommand()`. Existing domain revision increments remain authoritative; a parent discard involving several canonical children can advance revision through several private working-copy transitions.
- Explicit child discard retains siblings. Final-child discard removes the open intention, never the accepted replacement source. Whole-intention discard removes its linked open requests, not unrelated pending work or accepted identities.
- Both next stores are validated before an applied pair is returned. Intermediate working copies are not committed on failure. The caller must persist the returned pair together under concurrency control.
- Applied outcomes return affected intention/query references for invalidation. The pure transition itself does not reconcile session questions or staged results. The person-session application function below consumes query invalidations for the existing canonical person lifecycle; registry and staged-result integration remain separate.
- No identity acceptance, new reference allocation, source resolution, question activation, automatic retry or title search occurs in the edit transition.

## Person-session application function

- Commit: `da318aa`. Files: `src/lib/domain/search/process-parser-continuation-command.ts` and `tests/unit/domain/search/process-parser-continuation-command.spec.ts`.
- `processParserContinuationCommand()` validates the application-owned stored person session before delegating to the pure continuation transition. Invalid sessions reject without exposing a partial transition.
- Rejected commands and no-ops return without reconciling the session, including when a stored question was already stale. This function is not a standalone stale-session cleanup operation.
- On an applied edit, a question whose query reference is invalidated is closed; the existing `reconcilePersonClarification()` then retires revision-stale, missing or out-of-order questions. A valid unmodified first-canonical-person question may remain active after a continuation-only change.
- Sequence values are preserved, including exhaustion; no new question reference is allocated. Closed questions are not replaced automatically.
- The applied result currently carries search state, continuation, person session and original transition invalidations together. It does not yet carry or reconcile the binding registry. The caller must persist changed stores under concurrency control; no storage transaction is implemented.
- Tests exercise real transitions/lifecycle: canonical refinement and discard, rejection of an old answer, unrelated revision invalidation, preservation of an unmodified question and siblings, no question allocation, invalid sessions, stale questions after applied owned edits, and unchanged inputs for rejection/no-op.
- This slice does not create questions for owned continuation children, resolve identities, consume parser invocations, stage results or implement interruption/resumption. The existing first-canonical-pending-person restriction remains.

## Binding foundation

Design history: `8be4d87` introduced the [binding plan](011-parser-continuation-binding-plan.md), `509a620` clarified lifetime/consumption and `a2a456d` recorded discriminated input/output forms and precedence. The plan remains a design reference; implementation and validation evidence are recorded here rather than treating every planned scenario or integration as complete.

Implementation: `ebe4c41`, followed by the single-import correction `c5d4b3e`.

- `src/lib/config/domain.ts`: `MAX_PARSER_CONTINUATION_BINDINGS` derives from twice the continuation-query limit, currently 128; existing person/genre/keyword limits and the known-title limit are unchanged.
- `src/lib/schemas/parser-continuation-binding.ts`: strict canonical/owned targets, create/renew allocation, purpose-specific commands/stored bindings, incoming associations and bounded registry invariants. Canonical query text is not duplicated; freshness values do not create extra logical-key slots.
- `src/lib/domain/search/parser-continuation-binding.ts`: `issueParserContinuationBinding()`, `checkParserContinuationBinding()`, `consumeParserContinuationBinding()`, `reconcileParserContinuationBindings()` and `retireParserContinuationBindings()`.
- Issuance uses current application-owned context, explicit compare-and-renew references, private stale-entry cleanup, monotonically advancing sequence and ordered retirement facts. Failed proposals preserve caller inputs.
- Checking does not consume. Consumption rechecks the incoming association and proposes removal of exactly its stored binding; it does not validate provider payloads or establish identity acceptance.
- Reconciliation retires stale/invalidated targets without rebasing or blanket sibling invalidation from a parent-generation-only edit. Question closure invalidates question-answer bindings independently of still-current resolution bindings.
- Epoch retirement withdraws registry authorizations and preserves sequence; it neither closes a person question nor pauses a workflow. Caller-controlled lifetime/routing, workflow permissions and atomic persistence remain prerequisites.
- Initial question bindings support existing canonical person questions only. Owned-person question commands are explicitly rejected; schemas carrying other resolution criteria do not implement their question flows.
- Unit suites: `tests/unit/schemas/parser-continuation-binding.spec.ts` and `tests/unit/domain/search/parser-continuation-binding.spec.ts`. They include registry associations/bounds, renewal/replay guards, real child refinement with sibling retention, question closure, invalidation, revision/epoch checks, no-op isolation and exhausted-counter cases. Passing tests do not certify unimplemented integration or all review gates.

## Next scoped integration

Connect binding-registry reconciliation to `processParserContinuationCommand()` in a separately approved file-level change. Applied edits should return state, continuation, person session and reconciled registry together, using the edit's explicit query invalidations and current post-edit context. Rejection/no-op must not expose partial updates; valid unchanged siblings remain, and no question, lookup or retry starts automatically. Add tests using real existing transitions and binding helpers. This is the next proposed slice, not an implemented capability.

## Explicit limitations and follow-ups

1. Canonical pending records currently retain only one query string. Non-null correction hints are rejected as `unsupported-correction`, not dropped. Plan the necessary original/correction metadata extension without introducing a second editable query owner.
2. Integrate registry lifetime and consumption with edit/response processing and complete parser invocation lifecycle. Primitive checks do not themselves prove end-to-end replay safety, coherent storage/routing or pause/reset/resume behavior.
3. Extend authoritative questions to owned continuation targets and non-person work, and reconcile staged results. Existing canonical person-session integration retains its first-canonical-request restriction.
4. Add staged trusted result ownership and unchanged-child retention, then current-state revalidation and atomic multi-replacement/whole-selection acceptance.
5. Implement protected reservation accounting, related capacity competition, ownership transfer and the mixed-change adapter, including retained unsupported/non-query work and group coupling.
6. Migrate `MAX_PERSON_CLARIFICATION_CANDIDATES` to `MAX_PERSON_IDS` after an actual caller/test reference inventory. Keep the value five and the known-title limit unchanged.
7. Review the technical plan/checklist and downstream documentation against implemented slices; no blanket review closure is implied by this ledger.

## Validation evidence and remaining checks

- `4e2a719`: user-reported tests/typecheck/ESLint passing, with coverage threshold covered by the established green convention.
- `da318aa`: initially a test-only report; the latest combined branch-code report now supersedes the absence of a current lint/typecheck report, without inventing historical command runs.
- `ebe4c41` plus `c5d4b3e`: on 2026-11-17 the user reported tests green and explicitly confirmed typecheck and lint. Coverage threshold is included under the agreed green convention; no new numeric percentage or command logs were supplied.
- Required statement coverage remains at least 80%, including unimported modules. The historical 87% parser-schema figure is not a fresh whole-project measurement.
- The assistant did not execute test, coverage, lint or typecheck commands. Further code changes require fresh validation; current evidence does not validate future registry integration.

WP 011 remains incomplete. Dependency order remains WP 011 → WP 014 → WP 012. No PR, merge, provider integration, HTTP/browser journey, persistence or search execution is part of these slices.
