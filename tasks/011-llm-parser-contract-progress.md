# WP 011 — implementation progress

Updated: 2026-11-17. Branch: `feat/011-llm-parser-contract`.

The [work-package specification](../docs/work-packages/011-llm-parser-contract.md) remains product authority. The [implementation plan](011-llm-parser-contract-plan.md) remains the technical design reference. This ledger records implemented slices, validation evidence and remaining work; it does not close R01–R06 or redefine product requirements.

## Implemented slices

| Commit | Scope | Validation evidence |
| --- | --- | --- |
| `b2e8407` | Parser proposal/context/invocation/envelope schemas, JSON Schema export, composition, response validation and tests | Subsequent user report, after the follow-ups below |
| `0400ce4` | Keyword-reference and capacity-context tests | Included in subsequent local green report |
| `4eac220` | Explicit nullable-source guard | User confirmed IDE warning gone and all checks green; parser statement coverage reported as 87% |
| `db830a5` | Bounded continuation ownership schema, canonical associations and tests | User reported all checks green; no new numeric coverage supplied |
| `4e2a719` | Refine/discard command schema, pure transition and unit tests | Not yet locally validated/reported |

A user report of green means tests, coverage threshold, ESLint and typecheck. The assistant did not execute those commands. Historical passing reports do not validate later commits.

## Current transition contract

- Files: `src/lib/schemas/parser-continuation-command.ts`, `src/lib/domain/search/apply-parser-continuation-command.ts` and `tests/unit/domain/search/apply-parser-continuation-command.spec.ts`.
- Commands bind to current state revision, intention reference and expected parent generation. These are application-owned command associations, not LLM authority or full session/invocation authorization.
- Effective owned refinement preserves source, sibling queries and accepted criteria, while advancing child and parent generations. Exact owned no-ops preserve counters.
- Canonical refinement/removal delegates to `applyPendingQueryCommand()`. Existing domain revision increments remain authoritative; a parent discard involving several canonical children can advance revision through several private working-copy transitions.
- Explicit child discard retains siblings. Final-child discard removes the open intention, never the accepted replacement source. Whole-intention discard removes its linked open requests, not unrelated pending work or accepted identities.
- Both next stores are validated before an applied pair is returned. Intermediate working copies are not committed on failure. The caller must persist the returned pair together under concurrency control.
- Applied outcomes return affected intention/query references for invalidation. No session question, candidate set or staged-result store is actually reconciled by this function. The later coordinator must consume these facts before authorizing further responses, while preserving valid unchanged-child facts according to R06.
- No identity acceptance, new reference allocation, source resolution, question activation, automatic retry or title search occurs.

## Explicit limitations and follow-ups

1. Canonical pending records currently retain only one query string. Non-null correction hints are rejected as `unsupported-correction`, not dropped. Plan the necessary original/correction metadata extension without introducing a second editable query owner.
2. Bind to complete session lifetime and consumed invocations; generation/revision checks alone do not prove protection across pause/reset/resume or reference reuse.
3. Connect invalidation facts to existing clarification sessions and future staged-result reconciliation. The existing person lifecycle's first-canonical-request restriction is not removed by this slice.
4. Add staged trusted result ownership and unchanged-child retention, then current-state revalidation and atomic multi-replacement/whole-selection acceptance.
5. Implement protected reservation accounting, related capacity competition, ownership transfer and the mixed-change adapter, including retained unsupported/non-query work and group coupling.
6. Migrate `MAX_PERSON_CLARIFICATION_CANDIDATES` to `MAX_PERSON_IDS` after an actual caller/test reference inventory. Keep the value five and the known-title limit unchanged.
7. Review the technical plan/checklist and downstream documentation against implemented slices; no blanket review closure is implied by this ledger.

## Validation pending for the transition slice

- Focused continuation-command unit suite.
- Existing continuation-schema and pending-operation regression suites.
- `pnpm test`, `pnpm test:coverage`, `pnpm lint`, `pnpm typecheck`.
- Preserve at least 80% statement coverage including unimported modules; no current percentage is asserted for `4e2a719`.

No PR, merge, provider integration, HTTP/browser journey, persistence or search execution is part of these slices.
