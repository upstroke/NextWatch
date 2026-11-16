# WP 011 — LLM parser contract implementation plan

## Status and approval

- Status: Draft — concrete contract proposed; application implementation awaiting approval.
- Created and consolidated: 2026-11-16.
- Target branch: `feat/011-llm-parser-contract`; documentation/review baseline: `13747850705c67df124976504b53fe19303a41d2`.
- Product authority: [WP 011](../docs/work-packages/011-llm-parser-contract.md). The [supplement](../docs/work-packages/011-parser-contract-decisions.md) is retained as historical evidence, not a competing specification.
- Saving this plan approves documentation only, not implementation, code commit, PR, merge or provider/CLI work. Proposed fields and limits below are not implemented APIs.
- Follow [AGENTS](../AGENTS.md), [Typing](../docs/typing.md), [Testing](../docs/testing.md), WP 009/010 and the WP 012/014 ownership boundaries. Do not reopen completed WP 010 or restart a repository-wide audit.

## 1. Evidence and limitations

The earlier targeted review used `5c85d69`, with follow-up at `a6fe74b`. The recorded tree/blob comparison found identical application/test/config trees between those two baselines; it did not establish passing tests or a complete inventory. Historical prompt/schema alignment is `a8dbca0`; initial plan is `99b5a2d`.

Directly inspected for this consolidation at `1374785`: AGENTS, WP 011, the accessible current plan, `search-state.ts`, `search-transition.ts`, `tests/unit/domain/search/pending-operations.spec.ts`, plus original plan history and instruction translation diff. The current plan response was truncated in the file map; the original `99b5a2d` patch supplied the original remaining sequence, matrix and gates. Do not claim a complete read of every intervening plan revision or a full test/caller audit.

| Area | Evidence and disposition |
| --- | --- |
| Accepted/pending people | `search-state.ts` supports singular replacement query/target and one replacement per source. Multi-replacement requires a planned extension, not repeated independent acceptance. |
| Trusted acceptance | `search-transition.ts` accepts one person per request. `pending-operations.spec.ts` covers ID deduplication, source retention, one-to-one replacement, stale/wrong-kind references, bounds and mutation isolation. Preserve those regressions. |
| Keywords | Inspected state supports pending additions; inspected transition file has no controlled keyword acceptance. Targeted/whole-selection keyword replacement is a gap, not existing support. |
| Existing application | Prior review: `applyIntent()` applies filter groups atomically; `extraction.ts` whole-list replacement differs from targeted replacement. Reuse rather than bypass. |
| Clarification | Prior review: lifecycle/correction paths assume the first pending person. Explicit non-first targeting needs focused caller/test inspection. Source offers need an eligible matching subset rather than every accepted person. |
| Guardrails | Reuse replacement-target, year-conflict and keyword-meaning guards. Preserve request, revision and question-sequence checks. |
| Genres | Active/inactive genres form one unique bounded wish in the directly read state schema. Exact catalog, normalization and whole-selection mapping still need focused inspection. |
| Prompt | Translation commit `166e144` changed the saved draft to English, revision `0.1.1-draft`. The old plan's German/0.1.0 description was historical, not current. No runtime connection. |
| Tooling | Prior review recorded Zod 4.6.7 and native `z.toJSONSchema()` as the starting approach. Installation and concrete export/provider compatibility remain unverified. |

Remote inspection does not establish local cleanliness, unpushed changes or validation success. No runtime commands were run for this consolidation.

## 2. Proposed request contract

Use an internal request envelope and a separate model-visible projection. All objects are strict. Types derive from Zod schemas through `z.infer`; do not maintain a parallel handwritten JSON Schema.

### Internal envelope, not model output

| Field | Proposed meaning |
| --- | --- |
| `requestRef` | Application-issued parser invocation reference. |
| `baseRevision` | Existing state revision captured before the call. |
| `sessionSequence` | Application-owned generation for session-only changes and replay protection. |
| `context` | Immutable projection actually supplied to this invocation. |
| `userInput` | Current ephemeral input; never permanent conversation storage. |

Consume the invocation once. Validate both criteria and session association, including cancelled/replaced questions at unchanged criteria revision. A reset cannot revive old associations.

### Model-visible composition

Compose three logical parts: fixed English instructions, serialized context JSON, current untrusted user input. A later provider adapter maps these to API roles/options.

Context fields:

- `contractVersion`: proposed literal `0.1.0-draft`, independent of instruction revision.
- `catalogVersion`: existing capability-catalog version.
- `capabilities`: allowed fields, operations and valid scalar values/ranges derived from the existing catalog; not blanket permission to emit identity IDs.
- `criteria`: scalar values and relevant accepted criterion descriptors `{ref, criterion, label, activity}`. `criterion` is person/keyword/genre; `activity` is active/inactive. IDs remain in the application binding, not the model-facing descriptor.
- `pending`: ordered descriptors `{ref, criterion, operation, queries, source, status}` derived from existing state/continuation records. `source` is null or a readable description and supplied accepted-target reference where known. No duplicate authoritative state store.
- `activeClarification`: null or `{pendingRef, subject}`. A null value forbids interpreting a bare name as an answer to a closed question. UI candidate selection uses application actions, not model identity selection.
- `genreCatalogs`: complete application-supplied Movie/TV catalogs projected as supported labels/aliases and media-type association. Catalog mapping remains application-owned; do not collapse same labels across media types without validation.

No authoritative revision, question token, credential, result cache or full history needs to be exposed to the model. Explicit reference to another pending request takes priority over the active question.

### Proposed technical bounds

These require technical approval, not changes to product criterion limits: input 8,000 characters; query/label/target wording 512; opaque reference 128; at most 32 response groups, 64 total interpretation items and 64 total query entries per response; at most 64 retained continuation query entries and 64,000 retained text characters per session. Count all nesting, not only each array separately. Provider/output-byte bounds must also be configured before connection.

Do not truncate input, names, response arrays or pending work to fit. Reject over-capacity composition/application without changing state/session; preserve the current input in the caller's ephemeral editor and return a structured capacity fact. Do not call the model if required context cannot be supplied intact. Finalize full-capacity UX and concrete schema bounds before coding the envelope.

## 3. Proposed response contract

Top-level required fields: `contractVersion` and `groups`. Each group is `{items: [...]}` with at least one item. Groups and items preserve mention order. Groups represent coupled intentions; different groups are only candidates for independent application, never model authorization. Empty `groups` means no extracted change, not permission to execute.

The adapter may combine dependencies across groups, especially edits to the same target or year range; it must not split a coupled group to obtain partial success. If independence cannot be established safely, retain/clarify the related intention rather than guess. Group positions are local structure, not model-allocated target references.

Every item requires `kind` and `inputExcerpt`, a non-empty excerpt of the relevant current input. Excerpt text is evidence of wording, not identity provenance. Validate excerpt containment locally. Operation-specific fields below are the only permitted additional fields; no generic unknown `value` or catch-all passthrough.

Reusable query: `{text, correction}` where `text` preserves the supplied term and `correction` is null or an optional proposed corrected search form. Both are non-empty bounded strings when present. No confidence score or provider ID. A correction cannot silently replace the original term or establish uniqueness.

Reusable accepted-source selector: either `{mode: "reference", ref}` for a supplied accepted criterion of the matching kind, or `{mode: "unresolved", description}` preserving source wording for clarification. An unresolved selector never authorizes immediate removal/replacement.

### Operation-specific variants

| Variant | Required additional fields |
| --- | --- |
| `filter`, `set` | `field` and typed `value`; mediaType movie/tv/all, minRating number 0–10, minYear/maxYear integer 1900–2100, sortBy one of the existing two values. Implement as field-dependent strict variants, not a broad cross-product. |
| `filter`, `remove` | `field` restricted to optional minRating/minYear/maxYear; no value. Reuse domain default/removal semantics after confirming the existing mapping. No undefined media type or sort order. |
| `entity`, `add` | `entityType` person/keyword and non-empty `queries` array. Related additions remain together for overflow handling. |
| `entity`, `refine` | `entityType`, supplied `pendingRef` and one `query`. Reference must designate the exact refinable pending query, including an application-projected child query of a compound intention. |
| `entity`, `replace` | `entityType`, `source` selector and non-empty `queries`. One person source may have several replacements. Keyword mapping requires the planned extension. |
| `entity`, `remove` | `entityType`, `source` selector; no replacement queries. |
| `entity`, `discard` | `entityType` and supplied `pendingRef`; no accepted source. Discard scope is exactly the referenced pending intention/query as described by the application, not all pending work. |
| `entity`, `replace_all` | `entityType` restricted to keyword and non-empty `queries`; implicit target is the complete keyword selection. No person replace_all is introduced. |
| `genre`, `add` | Non-empty `queries`; query correction is a hint, mapping comes from supplied catalogs. |
| `genre`, `refine` | Supplied genre `pendingRef` and one `query`, for retained unresolved genre intentions. |
| `genre`, `replace` | Accepted-genre `source` selector and non-empty `queries`. |
| `genre`, `remove` | Accepted-genre `source` selector. |
| `genre`, `discard` | Supplied genre `pendingRef`. |
| `genre`, `replace_all` | Non-empty `queries`; applies to the complete active/inactive selection. |
| `clarification` | `subject`, `reason`, `relatedPendingRef` (supplied ref or null). Reasons: missing_value, ambiguous_meaning, ambiguous_reference. Subject identifies the criterion or workflow. No generated UI question/options. |
| `unsupported` | `reason`: unsupported_criterion or unsupported_operation. The common excerpt preserves the requested part; no invented substitute. |

An empty whole-selection replacement is not the encoding for removal of everything; an explicit clear-all contract is deferred. Preserve such input as clarification rather than guessing or advertising an unimplemented operation. Cancellation/reset/resumption and search are not arbitrary executable parser commands. Their exact free-text interpretation mapping remains a gate; labelled controls retain the existing application-owned workflow.

Incomplete names remain entity queries, not automatic clarification. Year bounds may each be in range while jointly contradictory: allow extraction, then route to the year-conflict guardrail. Missing values and out-of-range values are never silently repaired; use clarification for understood input that cannot supply a valid scalar.

### Complete synthetic response examples

All references below must have been supplied with the stated target kind. These are draft fixtures, not provider-tested JSON Schema examples.

1. Addition, “und Brad Pitt”:
`{"contractVersion":"0.1.0-draft","groups":[{"items":[{"kind":"entity","inputExcerpt":"und Brad Pitt","operation":"add","entityType":"person","queries":[{"text":"Brad Pitt","correction":null}]}]}]}`

2. Active refinement, “Chris Evans”, with pending-ref c supplied:
`{"contractVersion":"0.1.0-draft","groups":[{"items":[{"kind":"entity","inputExcerpt":"Chris Evans","operation":"refine","entityType":"person","pendingRef":"c","query":{"text":"Chris Evans","correction":null}}]}]}`

3. Multi-replacement, “Ersetze Tom Hanks durch Tom Cruise und Brad Pitt”, with accepted person-ref p supplied:
`{"contractVersion":"0.1.0-draft","groups":[{"items":[{"kind":"entity","inputExcerpt":"Ersetze Tom Hanks durch Tom Cruise und Brad Pitt","operation":"replace","entityType":"person","source":{"mode":"reference","ref":"p"},"queries":[{"text":"Tom Cruise","correction":null},{"text":"Brad Pitt","correction":null}]}]}]}`

4. Whole-selection replacement, “Nur noch Komödien und Thriller”:
`{"contractVersion":"0.1.0-draft","groups":[{"items":[{"kind":"genre","inputExcerpt":"Nur noch Komödien und Thriller","operation":"replace_all","queries":[{"text":"Komödien","correction":null},{"text":"Thriller","correction":null}]}]}]}`

5. Typo, “Mit Tom Hnaks”:
`{"contractVersion":"0.1.0-draft","groups":[{"items":[{"kind":"entity","inputExcerpt":"Mit Tom Hnaks","operation":"add","entityType":"person","queries":[{"text":"Tom Hnaks","correction":"Tom Hanks"}]}]}]}`

6. Mixed, “Nur Serien und mit Chris”:
`{"contractVersion":"0.1.0-draft","groups":[{"items":[{"kind":"filter","inputExcerpt":"Nur Serien","operation":"set","field":"mediaType","value":"tv"}]},{"items":[{"kind":"entity","inputExcerpt":"mit Chris","operation":"add","entityType":"person","queries":[{"text":"Chris","correction":null}]}]}]}`

Invalid fixtures: fabricated/unknown/wrong-kind references; provider IDs or authoritative revisions; unknown fields; set mediaType to a number; empty queries for replacement; person replace_all; remove carrying replacement queries; refinement targeting accepted rather than pending state; excerpts absent from input; oversized nesting. Distinguish structural failure from well-formed but stale or unoffered references in application validation.

## 4. Pure application and continuation design

Validate completion/status, JSON, the entire external schema and request/context association before mutation. Normalize refusal, incomplete, timeout, transport_error, malformed_json and schema_invalid outside valid interpretation objects. Application rejection distinguishes stale/unknown-reference/capacity from retained semantic clarification. No repair, repeated model call, provider failover or search.

Use a single pure `apply-parser-result.ts` entry point with explicit state/session/context/catalog inputs and reference allocation dependency. Work on copies; return validated next state/session and outcome facts. Preserve transition-level revision semantics; synchronous new commands use the immediately preceding transition revision, never rebase old asynchronous results. Caller commits state/session together under concurrency control.

Retain compound/overflow intentions in a bounded ephemeral envelope, referencing canonical state rather than copying accepted filters. Application-issued child references may address individual unresolved terms without losing their parent operation. Track the ordered original/corrected queries, source binding, staged trusted resolution facts and active question association. These are not extra accepted slots. Resolve exact envelope schema, session generation and full-capacity behavior before implementation.

Expected semantic blockers retain the entire affected group; independently valid groups may proceed. Unresolved replacements keep previous values. Unsupported parts are reported, never marked fulfilled or silently ignored at search readiness. Unexpected internal inconsistency rejects the entire working-copy result.

Multi-person replacement must not be implemented by calling singular acceptance repeatedly: stage trusted resolutions, then validate/deduplicate the complete final set plus reservations and commit the source/removals/additions atomically. Handle destinations already accepted, equal names/different IDs, source included in destinations, overflow and stale staged results. Whole genre/keyword replacement likewise retains previous selection until complete validation. WP 014 supplies provenance; no model IDs cross acceptance.

## 5. Affected files and focused inspection

Proposed new files only when used:

- `src/lib/schemas/parser.ts`: dedicated request/proposal schemas, inferred types, normalized response outcomes and derived JSON Schema. Verify native `z.toJSONSchema()` conversion of the actual strict variants; no added converter dependency without approval.
- `src/lib/schemas/parser-application.ts`: bounded continuation/context association; reuse canonical schemas.
- `src/lib/parser/compose-request.ts`: pure projection/composition, no network.
- `src/lib/parser/validate-response.ts`: completion/JSON/schema boundary, no repair/retry.
- `src/lib/domain/search/apply-parser-result.ts`: pure adapter and real-transition coordination.

Existing files requiring targeted review before changes:

- `src/lib/parser/instructions.ts`: single maintained English prompt; align and increment instruction revision when changing it, not in this documentation commit.
- `search-state.ts`, `search-transition.ts`, `pending-operations.ts`: minimal atomic multi-person acceptance, reservation accounting and controlled keyword operations. Reuse single-person duplicate/provenance rules.
- `semantic-guardrails.ts` schema/domain: eligible source subsets and preserved complete replacement context; existing year and keyword guards remain.
- `person-clarification-session.ts`, `person-correction.ts`, related flow schemas; `person-clarification-lifecycle.ts`, `apply-person-correction.ts`, affected action/selection callers: explicit non-first targeting, invalidation and replay protection. Do not reorder unrelated wishes merely to bypass first-item checks.
- Existing genre compatibility/catalog/application modules: targeted versus whole-selection mapping, active/inactive order and final validation. Confirm exact affected paths before coding; no invented transition API.
- `src/lib/config/domain.ts`, `src/lib/schemas/clarification.ts` and every discovered caller/test: shared-limit migration, preserving `MAX_PERSON_CLARIFICATION_KNOWN_TITLES`.

Tests: extend existing affected regressions; proposed parser/parser-application schema suites, parser composition/validation suites and `tests/unit/domain/search/apply-parser-result.spec.ts`. Use synthetic fixtures, real internal transitions and required coverage-intent comments. No automatic barrels, endpoint, provider dependency, UI file, HTTP integration suite or browser E2E work.

## 6. Implementation sequence, tests and gates

1. Review this concrete contract before coding. Complete the targeted caller/test inventory only for proposed changes; inspect current package scripts, typing/testing rules and genre/numeric semantics. Do not repeat the full audit.
2. Finalize exact continuation schema, bounds/full-capacity outcome, source subset policy, group dependency classification and free-text workflow mapping. Resolve any gap as a safe explicit unsupported/clarification outcome, not silent omission. Clear-all/empty-list replacement remains deferred.
3. Add failing composition/response tests, then implement strict schemas, JSON-schema derivation and pure validators.
4. Add failing continuation/reference/replay tests; implement minimal session contracts.
5. Add failing multi-replacement/whole-selection tests, then approved domain extensions and adapter with real transitions.
6. Extend non-first clarification/source-subset paths; preserve ordering, cancellation and stale-candidate rules.
7. Migrate the shared limit through a repository-wide reference inventory.
8. Run validation, review specification/scope and record actual outcomes; obtain explicit approval before application-code commit, PR or merge.

Test new boundary behavior: typo original/hint preservation, no Tom-to-surname expansion, no numeric guessing, attempted prompt overrides, supplied versus fabricated refs, same-revision obsolete sessions, group coupling, independent TV plus unresolved replacement, multiple destinations/deduplication/source retention, reserved-slot overflow, no arbitrary subset, retained unselected wishes, keyword acceptance provenance, full active/inactive genre replacement, contradictory-year routing, input immutability and atomic unexpected-failure handling. Preserve existing no-match/technical-error distinction and duplicate regressions. All outcomes lack implicit search/retry authorization.

Use focused runs during development, then `pnpm test`, `pnpm test:coverage`, `pnpm lint`, `pnpm typecheck`. Verify at least 80% statements including unimported application modules. Do not report fixture tests as HTTP/live-provider/browser validation. No commands run for this document update.

## 7. Downstream and approval log

- Only documentation consolidation and concrete design drafting were requested for this step; code implementation is not approved by saving it.
- The historical instruction artifact `d4138d9` was narrowly approved; its English translation is `166e144`. Neither authorizes the rest of the plan or runtime use.
- Existing AGENTS already identifies WP 011 and the branch; do not report the original stale-WP-010 finding as current. Its historical plan-commit/backlink-follow-up wording may need a separate small alignment; do not rewrite shared rules incidentally.
- WP 012/WP 014 and the wizard task require separately reviewed alignment for confirmation, snapshots, retries and cancellation/resumption. Their files were not updated or fully audited here.
- First later interactive test: real-LLM CLI, mocked search data/execution initially; provider/model selection remains open. No network/provider/CLI scaffolding in this slice.
- This plan retains pre-code approval gates. It does not claim complete caller coverage, passing validation, local cleanliness, a PR or a merge.
