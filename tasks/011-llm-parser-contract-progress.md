# WP 011 — implementation progress

Updated: 2026-11-17. Branch: `feat/011-llm-parser-contract`. Latest user-confirmed tests: `ab704c3`. Fresh typecheck/ESLint/coverage for that refinement slice remain unreported. Earlier tests were confirmed for `fa026dc`; tests/typecheck/ESLint were confirmed for `f6d9db2`, with coverage open. Historical fully reported-green foundation baseline: `c5d4b3e`.

The [work-package specification](../docs/work-packages/011-llm-parser-contract.md) remains product authority. The [implementation plan](011-llm-parser-contract-plan.md) and [binding plan](011-parser-continuation-binding-plan.md) remain design references. This ledger records implemented slices, validation evidence and remaining work; it does not close R01–R06 or redefine product requirements.

## Implemented slices

| Commit    | Scope                                                                          | Validation evidence                                                                           |
| --------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `b2e8407` | Parser schemas, JSON Schema export, composition, response validation and tests | Subsequent user report after follow-ups                                                       |
| `0400ce4` | Keyword-reference and capacity-context tests                                   | Included in subsequent local green report                                                     |
| `4eac220` | Explicit nullable-source guard                                                 | User confirmed warning gone and checks green; parser statement coverage reported as 87%       |
| `db830a5` | Bounded continuation ownership and canonical associations with tests           | User reported checks green; no new numeric coverage                                           |
| `4e2a719` | Refine/discard schema, pure transition and tests                               | User-reported tests/typecheck/ESLint; historical green convention included coverage threshold |
| `da318aa` | Person-session application function and tests                                  | Historical tests passing; later foundation baseline reported green                            |
| `ebe4c41` | Bounded binding schemas, pure helpers, limit and two unit suites               | Foundation reported green after correction                                                    |
| `c5d4b3e` | Removed unused domain Zod import only                                          | Historical foundation checks green, including coverage under agreed convention                |
| `f6d9db2` | Registry reconciliation in edit application and extended tests                 | User-confirmed tests/typecheck/ESLint; coverage remained unconfirmed                          |
| `fa026dc` | Bound canonical-person clarification actions and unit tests                    | User reported all tests passing; fresh typecheck/ESLint/coverage unreported                   |
| `ab704c3` | Original-request schema, bound parsed person refinement and unit tests         | User reported all tests passing; fresh typecheck/ESLint/coverage unreported                   |

Earlier green reports included coverage under the historical convention. The latest test-only report is not silently expanded to other checks. No fresh numeric coverage percentage or command logs were supplied. The assistant did not execute validation commands.

## Edit transition and registry integration

- `applyParserContinuationCommand()` binds application edits to state revision, intention and expected generation. Owned refinement advances child/parent generations; canonical changes reuse pending operations. No-ops preserve counters.
- Explicit child/parent discard preserves accepted criteria; final-child cleanup removes only open work. The transition validates both next stores and returns query/intention invalidations. An affected parent ref alone does not invalidate all unchanged children.
- `processParserContinuationCommand()` was introduced in `da318aa` and extended in `f6d9db2`. Its fifth argument carries trusted expectedSessionRef and registry. It validates registry/lifetime/session before applying the edit, then reconciles questions and bindings against post-edit state/continuation/session and explicit query invalidations.
- Applied results return all four stores, original invalidations and ordered retiredBindingRefs. Rejected/no-op edits do not reconcile or expose partial stores. No binding/question, lookup, retry or search is started. Caller owns coherent lifetime loading and atomic persistence with concurrency control.
- Tests reside in `tests/unit/domain/search/apply-parser-continuation-command.spec.ts` and `tests/unit/domain/search/process-parser-continuation-command.spec.ts`, covering revision invalidation, sibling retention, explicit discards, closed questions, stale no-op data and boundary rejection.

## Binding foundation

- Design commits: `8be4d87`, `509a620`, `a2a456d`. Implementation: `ebe4c41` plus `c5d4b3e`. A saved design is not proof that every planned flow is implemented.
- `src/lib/config/domain.ts`: maximum outstanding bindings derives as twice the continuation-query bound, currently 128. Criterion and known-title limits are unchanged.
- `src/lib/schemas/parser-continuation-binding.ts`: strict canonical/owned targets, create/renew allocation, purpose-specific commands and stored bindings, incoming associations and bounded registry invariants; no duplicate canonical text or freshness-based key slots.
- `src/lib/domain/search/parser-continuation-binding.ts`: pure issue/check/consume/reconcile/retire helpers, with compare-and-renew protection, private cleanup, monotonic sequence and ordered retirement facts. Check does not consume; consume validates no identity payload.
- Epoch retirement withdraws registry bindings and preserves sequence only, not a workflow pause or question closure. Initial question bindings support existing canonical persons, not owned or non-person question flows.
- Foundation suites: `tests/unit/schemas/parser-continuation-binding.spec.ts` and `tests/unit/domain/search/parser-continuation-binding.spec.ts`; they cover invariants/bounds, renewal/replay, refinement/siblings, closure, invalidation, revision/epoch checks, isolation and exhaustion.

## Bound person clarification actions

Commit: `fa026dc`. New files: `src/lib/domain/search/process-bound-person-clarification-action.ts` and `tests/unit/domain/search/process-bound-person-clarification-action.spec.ts`. Existing modules were not changed by this commit.

- `processBoundPersonClarificationAction(context, registryInput, associationInput, actionInput)` handles existing structured refine, more-candidates, remove and discard-change actions for current canonical person questions. Identity-selection responses are excluded.
- It checks stored question-answer authority before calling the existing action boundary once. An action still must match current question token, request and revision and pass availability rules; registry validity does not repair a mismatched action.
- For removal, the real pending transition advances revision once. A private continuation copy loses only the removed canonical link. Surviving parent generation advances; exhausted generation rejects the entire proposal. Final-child discard removes the empty intention without incrementing its exhausted counter or deleting accepted people. Unlinked canonical requests, including replacements, need no artificial parent.
- It validates the resulting continuation against new pending work before consumption. Question-binding consumption rechecks the original pre-state and original stored authority, never the proposed post-state.
- Successful actions close the answered question without changing its sequence; remaining bindings reconcile against the post-state and the registry after consumption. The consumed ref is not reported twice as retired. No replacements are issued automatically.
- `applied` and `follow-up` return state, continuation, session, registry, consumedBindingRef, retiredBindingRefs and invalidated query/intention refs. Only follow-up also returns the existing normalized action/request context. Rejected stages return no partial stores.
- Refine/navigation return ephemeral follow-up data, leaving query text, generations and revision unchanged. A current independent resolution binding may remain. This is not another query owner or durable authorization to execute the follow-up; future processing must revalidate current context and obtain fresh bindings where required.
- The caller must commit all changed stores together with concurrency control. Search revision alone is insufficient to detect concurrent follow-up actions that close a question without changing criteria. No persistence or exactly-once external execution is implemented.
- Unit scenarios include linked and unlinked discard, replacement-source preservation, parent/final-child cleanup and exhaustion rejection, normalized follow-ups with replay rejection, wrong action/question/revision, unavailable navigation, wrong purpose/epoch/lifetime, malformed authority, closed questions and input isolation. Tests do not certify unimplemented provider/UI/runtime behavior or every later failure integration.

## Bound parser refinement

Commit: `ab704c3`. Added files:

- `src/lib/schemas/bound-person-refinement-request.ts`
- `src/lib/domain/search/process-bound-person-refinement.ts`
- `tests/unit/domain/search/process-bound-person-refinement.spec.ts`

`BoundPersonRefinementRequestSchema` combines the original question association, refinement action and existing parser invocation snapshot. The original request must be loaded from trusted application storage; structural parsing does not establish its provenance. The invocation remains immutable processing context, not a second editable query owner.

`processBoundPersonRefinement()` checks current binding authority and the original action, then matches invocation revision, question sequence, submitted text and pending-query context. It reuses `validateParserResponse()` and accepts exactly one matching canonical person-refine item. Different targets, broader/mixed proposals and non-null correction hints reject without partial stores or isolated consumption. Rejecting unsupported proposals is not an implemented mechanism for retaining them in a mixed-result workflow.

Linked edits reuse `applyParserContinuationCommand()`; unlinked edits reuse `applyPendingQueryCommand()`. The existing reference, addition/replacement operation, accepted replacement source and unrelated query/criterion data are preserved. Effective edits advance revision once and, where linked, parent generation; counter exhaustion rejects. Canonical correction metadata is still unsupported rather than silently discarded.

Successful results return all four stores, `requestRef`, `queryChanged`, consumed and retired binding refs and query/intention invalidations. Consumption checks the same pre-transition context; remaining bindings reconcile against the validated post-state. A successful query no-op still closes the answered question and consumes its binding, but preserves revision/generation, emits no query invalidations and may retain independent resolution bindings. Query changes retire old-revision response bindings, including unchanged siblings, without deleting sibling query data.

This is an alternative entry point while the original question is still live, not a consumer of `processBoundPersonClarificationAction()`'s already-consumed `followUp`. Calling that deferred action path first makes this request stale. No productive caller, original-request creation/storage coordinator, processing lock, global invocation allocation or atomic persistence was added. The caller must associate the immutable invocation with the original submission and commit the proposal with concurrency control. This slice does not establish complete invocation replay safety, start a parser/provider call, issue fresh bindings/questions, accept identities or execute a search.

Tests reuse the synthetic parser fixture and real domain/binding helpers. Scenarios include linked/unlinked edits, replacement-source preservation, no-ops at counter limits, revision/generation exhaustion, parser rejection without consumption, unsupported/misdirected interpretation, original invocation mismatch, stale authority, replay after completion, rejection after deferred consumption and input isolation. These are unit-level scenarios, not end-to-end/runtime guarantees.

## Withdrawn constant migration

On 2026-11-17 the user explicitly withdrew the migration from `MAX_PERSON_CLARIFICATION_CANDIDATES` to `MAX_PERSON_IDS`. Search-state person capacity and offered candidate-group size remain independent rules, currently five each; `MAX_PERSON_CLARIFICATION_KNOWN_TITLES` stays at two. See decision supplement section 6.

`1591fb4` documented the domain constants; `fefbf7a` corrected the comments to state their independence. Neither changed names, values or runtime behavior. The migration is withdrawn, not completed. Its preparatory reference inspection was incomplete and is not recorded as a completed audit; removal-oriented inventory work is no longer required for this cancelled task.

`528bc21` reconciled implemented portions of R01–R06 without closing the findings. This documentation amendment removes the withdrawn migration from the active specification, plan, review and follow-up queue while preserving the other implementation and validation gaps.

## Validation evidence and next gate

- On 2026-11-17 the user reported all tests passing for `ab704c3`. Fresh `pnpm typecheck`, `pnpm lint` and `pnpm test:coverage` results remain unreported for this latest code. Do not infer them from older checks.
- Historical `fa026dc` evidence: the user reported all tests passing; typecheck/ESLint/coverage were not separately confirmed for that action slice. Historical `f6d9db2` evidence: tests, typecheck and ESLint passed according to the user; integration coverage remained unconfirmed. Historical foundation baseline `c5d4b3e` was reported green under the agreed convention.
- Current coverage threshold remains at least 80% statements, including unimported modules. The earlier 87% parser-schema figure is not a current whole-project measurement.
- Immediate next gate: complete current typecheck, lint and coverage checks; handle failures before claiming fully green. All evidence is user-reported; the assistant did not run these commands. Reports do not validate later changes.

## Explicit limitations and follow-ups

1. Productive refinement routing and deferred follow-up coordination remain missing. Keep the two entry points distinct; candidate continuation and fresh resolution authority require separately reviewed scope. No automatic parser/provider call or replay of closed questions.
2. Canonical correction metadata remains missing; non-null correction hints reject as unsupported-correction rather than being dropped. Preserve a single canonical query owner.
3. Integrate resolution-result/identity-selection handling and complete invocation lifetime, routing and allocator safeguards. Bound structured actions, parsed refinement and edit reconciliation do not prove end-to-end replay safety or complete pause/reset/resume.
4. Add authoritative owned-target/non-person questions, staged trusted results and unchanged-child retention/reconciliation, then current-state atomic replacement/whole-selection acceptance.
5. Implement protected reservations, capacity competition, ownership transfer and mixed-change adapter coupling/unsupported retention.
6. Align technical-plan/checklist/downstream documentation without blanket review closure or exhaustive-inventory claims. The withdrawn constant migration is not an open follow-up.

WP 011 remains incomplete. Dependency order remains WP 011 → WP 014 → WP 012. No PR, merge, provider integration, HTTP/browser journey, persistence or title-search execution is part of these slices.
