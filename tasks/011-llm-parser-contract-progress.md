# WP 011 — implementation progress

Updated: 2026-11-17. Branch: `feat/011-llm-parser-contract`. Latest user-confirmed tests: `fa026dc`. Fresh typecheck/ESLint/coverage for that action slice remain unreported. Earlier tests/typecheck/ESLint were confirmed for `f6d9db2`, with coverage open; historical fully reported-green foundation baseline: `c5d4b3e`.

The [work-package specification](../docs/work-packages/011-llm-parser-contract.md) remains product authority. The [implementation plan](011-llm-parser-contract-plan.md) and [binding plan](011-parser-continuation-binding-plan.md) remain design references. This ledger records implemented slices, validation evidence and remaining work; it does not close R01–R06 or redefine product requirements.

## Implemented slices

| Commit | Scope | Validation evidence |
| --- | --- | --- |
| `b2e8407` | Parser schemas, JSON Schema export, composition, response validation and tests | Subsequent user report after follow-ups |
| `0400ce4` | Keyword-reference and capacity-context tests | Included in subsequent local green report |
| `4eac220` | Explicit nullable-source guard | User confirmed warning gone and checks green; parser statement coverage reported as 87% |
| `db830a5` | Bounded continuation ownership and canonical associations with tests | User reported checks green; no new numeric coverage |
| `4e2a719` | Refine/discard schema, pure transition and tests | User-reported tests/typecheck/ESLint; historical green convention included coverage threshold |
| `da318aa` | Person-session application function and tests | Historical tests passing; later foundation baseline reported green |
| `ebe4c41` | Bounded binding schemas, pure helpers, limit and two unit suites | Foundation reported green after correction |
| `c5d4b3e` | Removed unused domain Zod import only | Historical foundation checks green, including coverage under agreed convention |
| `f6d9db2` | Registry reconciliation in edit application and extended tests | User-confirmed tests/typecheck/ESLint; coverage remained unconfirmed |
| `fa026dc` | Bound canonical-person clarification actions and unit tests | User reported all tests passing; fresh typecheck/ESLint/coverage unreported |

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

## Validation evidence and next gate

- On 2026-11-17 the user reported all tests passing for `fa026dc`. Fresh `pnpm typecheck`, `pnpm lint` and `pnpm test:coverage` results remain unreported for this new code. Do not carry `f6d9db2` or foundation checks forward.
- Historical `f6d9db2` evidence: tests, typecheck and ESLint passed according to the user; integration coverage remained unconfirmed. Historical foundation baseline `c5d4b3e` was reported green under the agreed convention.
- Current coverage threshold remains at least 80% statements, including unimported modules. The earlier 87% parser-schema figure is not a current whole-project measurement.
- Immediate next gate: complete current typecheck, lint and coverage checks; handle failures before claiming fully green. All evidence is user-reported; the assistant did not run these commands. Reports do not validate later changes.

## Explicit limitations and follow-ups

1. Controlled follow-up processing remains a proposed next direction: validate current target/context again before applying interpreted refinement or preparing fresh resolution authority. No automatic parser/provider call or replay of closed questions. Concrete contracts/file scope require separate review and approval.
2. Canonical correction metadata remains missing; non-null correction hints reject as unsupported-correction rather than being dropped. Preserve a single canonical query owner.
3. Integrate resolution-result/identity-selection handling and complete invocation lifetime, routing and allocator safeguards. Bound structured actions and edit reconciliation do not prove end-to-end replay safety or complete pause/reset/resume.
4. Add authoritative owned-target/non-person questions, staged trusted results and unchanged-child retention/reconciliation, then current-state atomic replacement/whole-selection acceptance.
5. Implement protected reservations, capacity competition, ownership transfer and mixed-change adapter coupling/unsupported retention.
6. Migrate MAX_PERSON_CLARIFICATION_CANDIDATES to MAX_PERSON_IDS after an actual caller/test inventory; preserve five and the known-title limit.
7. Align technical-plan/checklist/downstream documentation without blanket review closure or exhaustive-inventory claims.

WP 011 remains incomplete. Dependency order remains WP 011 → WP 014 → WP 012. No PR, merge, provider integration, HTTP/browser journey, persistence or title-search execution is part of these slices.
