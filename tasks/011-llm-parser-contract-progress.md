# WP 011 — implementation progress

Updated: 2026-11-17. Branch: `feat/011-llm-parser-contract`.

The [work-package specification](../docs/work-packages/011-llm-parser-contract.md) remains product authority. The [implementation plan](011-llm-parser-contract-plan.md) remains the technical design reference. This ledger records implemented slices, validation evidence and remaining work; it does not close R01–R06 or redefine product requirements.

## Implemented slices

| Commit    | Scope                                                                                                               | Validation evidence                                                                                                       |
| --------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `b2e8407` | Parser proposal/context/invocation/envelope schemas, JSON Schema export, composition, response validation and tests | Subsequent user report, after the follow-ups below                                                                        |
| `0400ce4` | Keyword-reference and capacity-context tests                                                                        | Included in subsequent local green report                                                                                 |
| `4eac220` | Explicit nullable-source guard                                                                                      | User confirmed IDE warning gone and all checks green; parser statement coverage reported as 87%                           |
| `db830a5` | Bounded continuation ownership schema, canonical associations and tests                                             | User reported all checks green; no new numeric coverage supplied                                                          |
| `4e2a719` | Refine/discard command schema, pure transition and unit tests                                                       | User reported tests, typecheck and ESLint passing on 2026-11-17; established green convention includes coverage threshold |
| `da318aa` | Person-session application function and integration-style unit tests                                                | User reported all tests passing on 2026-11-17; separate fresh coverage/lint/typecheck results not supplied                |

A user report of green means tests, coverage threshold, ESLint and typecheck. The assistant did not execute those commands. Historical passing reports do not validate later commits; a test-only report is recorded as such rather than silently expanded to every check. No new numeric coverage percentage was supplied for either latest slice.

## Current transition contract

- Files: `src/lib/schemas/parser-continuation-command.ts`, `src/lib/domain/search/apply-parser-continuation-command.ts` and `tests/unit/domain/search/apply-parser-continuation-command.spec.ts`.
- Commands bind to current state revision, intention reference and expected parent generation. These are application-owned command associations, not LLM authority or full session/invocation authorization.
- Effective owned refinement preserves source, sibling queries and accepted criteria, while advancing child and parent generations. Exact owned no-ops preserve counters.
- Canonical refinement/removal delegates to `applyPendingQueryCommand()`. Existing domain revision increments remain authoritative; a parent discard involving several canonical children can advance revision through several private working-copy transitions.
- Explicit child discard retains siblings. Final-child discard removes the open intention, never the accepted replacement source. Whole-intention discard removes its linked open requests, not unrelated pending work or accepted identities.
- Both next stores are validated before an applied pair is returned. Intermediate working copies are not committed on failure. The caller must persist the returned pair together under concurrency control.
- Applied outcomes return affected intention/query references for invalidation. The pure transition itself does not reconcile session questions or staged results. The person-session application function below consumes query invalidations for the existing canonical person lifecycle; broader bindings and valid unchanged-child facts according to R06 remain follow-up work.
- No identity acceptance, new reference allocation, source resolution, question activation, automatic retry or title search occurs.

## Person-session application function

- Commit: `da318aa`. Files: `src/lib/domain/search/process-parser-continuation-command.ts` and `tests/unit/domain/search/process-parser-continuation-command.spec.ts`.
- `processParserContinuationCommand()` validates the application-owned stored person session before delegating to the pure continuation transition. Invalid sessions reject without exposing a partial transition.
- Rejected commands and no-ops return without reconciling the session, including when a stored question was already stale. This function is not a standalone stale-session cleanup operation.
- On an applied edit, a question whose query reference is invalidated is closed; the existing `reconcilePersonClarification()` then retires revision-stale, missing or out-of-order questions. A valid unmodified first-canonical-person question may remain active after a continuation-only change.
- Sequence values are preserved, including exhaustion; no new question reference is allocated. Closed questions are not replaced automatically.
- The applied result carries search state, continuation, person session and original transition invalidations together. The caller must persist the triple under concurrency control. This is not an implemented storage transaction or runtime integration.
- Tests exercise real transitions/lifecycle: canonical refinement and discard, rejection of an old answer, unrelated revision invalidation, preservation of an unmodified question and siblings, no question allocation, invalid sessions, stale questions after applied owned edits, and unchanged inputs for rejection/no-op.
- This slice does not create questions for owned continuation children, resolve identities, consume parser invocations, stage results or implement interruption/resumption. The existing first-canonical-pending-person restriction remains.

## Explicit limitations and follow-ups

1. Canonical pending records currently retain only one query string. Non-null correction hints are rejected as `unsupported-correction`, not dropped. Plan the necessary original/correction metadata extension without introducing a second editable query owner.
2. Bind to complete session lifetime and consumed invocations; generation/revision checks alone do not prove protection across pause/reset/resume or reference reuse.
3. Extend question bindings to owned continuation targets and non-person work, and reconcile staged results. The canonical person-session integration exists, but does not remove the first-canonical-request restriction.
4. Add staged trusted result ownership and unchanged-child retention, then current-state revalidation and atomic multi-replacement/whole-selection acceptance.
5. Implement protected reservation accounting, related capacity competition, ownership transfer and the mixed-change adapter, including retained unsupported/non-query work and group coupling.
6. Migrate `MAX_PERSON_CLARIFICATION_CANDIDATES` to `MAX_PERSON_IDS` after an actual caller/test reference inventory. Keep the value five and the known-title limit unchanged.
7. Review the technical plan/checklist and downstream documentation against implemented slices; no blanket review closure is implied by this ledger.

## Validation evidence and remaining checks

- `4e2a719`: the previous pending-validation entry is superseded by the user's local passing report for tests, typecheck and ESLint, with coverage threshold covered by the established green convention. No command logs or fresh numeric coverage were provided.
- `da318aa`: the user's latest report confirms all tests passing. Separate fresh `pnpm test:coverage`, `pnpm lint` and `pnpm typecheck` results remain unreported for this commit.
- The required statement-coverage threshold remains at least 80%, including unimported modules. The historical 87% parser-schema figure is not a current whole-project measurement.
- All passing results above are attributed to the user. The assistant did not execute test, coverage, lint or typecheck commands.

WP 011 remains incomplete. Dependency order remains WP 011 → WP 014 → WP 012. No PR, merge, provider integration, HTTP/browser journey, persistence or search execution is part of these slices.
