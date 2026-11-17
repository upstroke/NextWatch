# LLM parser contract

## Specification

### Purpose and dependencies

Implement the parser boundary of the [product and search flow](000-product-and-search-flow.md): user input becomes validated proposals for the existing general search draft, not executable TMDb requests.

Reuse [WP 009](009-search-state-and-filter-catalog.md) state/transitions and [WP 010](010-clarification-and-guardrails.md) clarification/guardrails. Implementation order is WP 011 → [WP 014](014-entity-resolution.md) → [WP 012](012-search-execution-and-discover.md). Package numbers remain unchanged.

### Scope

- Define validated parser input/output for supported filter changes and unresolved person/keyword queries. The parser proposes changes; the application owns validation and mutation.
- Extract requested media type and single/multiple person or keyword wishes. Preserve common acting participation for people joined by AND; do not reinterpret it as crew work or appearances as oneself. TV-person intent remains valid even though its execution differs from Movie.
- For a new request, use the application default permitting movies and series when media type is absent. For follow-ups, preserve the current media type unless explicitly changed. Missing criteria are not instructions to clear existing wishes.
- Distinguish supported additions, replacements and removals. Application-owned references identify existing targets; the model must not invent references, provider IDs, authoritative revisions or search authorization. Ambiguous targets require clarification.
- Validate output before applying any changes. Technical parser failures and unsupported or ambiguous interpretations must not silently erase wishes or execute a partial search.

### Existing state and application boundary

- Reuse `SearchState`, accepted ID/name records and referenced pending requests in `src/lib/schemas/search-state.ts`. Do not create a second editable draft or synchronize separate Movie/TV states.
- Map parser proposals explicitly to supported `PendingQueryCommandSchema` operations in `src/lib/schemas/search-transition.ts` and supported filter intents. The application supplies references and expected revisions.
- Apply pending changes through `applyPendingQueryCommand()` and filter changes through `applyIntent()`. Do not mutate accepted people through chat filter fields or bypass trusted identity acceptance.
- Preserve unrelated criteria, pending requests, accepted replacement sources and inactive genre wishes. Use existing compatibility transitions for media changes rather than reconstructing partial state.
- Define mixed filter/entity application and coupled replacement behavior before implementation. Independent valid changes may proceed only when unresolved related work remains represented; coupled changes must not become partial replacements.
- Reuse application-supplied catalogs and existing limits. Do not infer new product filters from the full TMDb parameter catalog.
- Specify the smallest necessary temporary clarification context for concrete unsupported cases. Do not introduce a general continuation framework, store or registry without demonstrated need and separate approval.

### Inputs and outputs

Inputs: current user text, relevant existing search state, application-supplied catalogs and trusted request association.

Outputs: validated proposals, explicit clarification/unsupported information and a controlled application result for the same general draft. Output is neither a complete replacement state nor a provider query.

### Out of scope

- Live person/keyword identity lookup and candidate enrichment: WP 014.
- Movie/TV request mapping, TV-credit execution helpers, readiness/confirmation and result retrieval: WP 012.
- UI rendering, persistence, provider credentials, automatic model retries and autonomous tool loops.
- A production model/HTTP integration without its own approved implementation scope.

### Implementation tasks and acceptance criteria

- Inspect current schemas, instructions, transitions, callers and tests before proposing file changes. Record concrete keep/adapt/merge/remove decisions.
- Define a minimal parser contract and pure application adapter with explicit validation/failure behavior. Reuse schemas where responsibilities match; do not duplicate state contracts.
- Test supported extraction, absent-field preservation, media changes, multiple-person AND intent, target ambiguity, stale associations and mixed changes using synthetic fixtures.
- Test that accepted people, unrelated pending work and inactive genres survive relevant changes, and that parser output cannot invent accepted identities or start a search.
- Adapt or remove obsolete tests only with the affected interface and preserve required behavior coverage. Update callers and documentation together.
- Run tests, coverage, ESLint and typecheck for implementation changes; report actual commands and results.

## Execution status

- Current status: in progress. The first minimal parser-contract/application slice is implemented; WP 011 as a whole is not complete. WP 009 and WP 010 remain the completed foundation.
- 2026-11-17: Product direction and specification aligned with one general search draft and derived Movie/TV execution. A targeted read-only inventory and file-level plan preceded the approved four-file implementation. This is not a complete repository-wide reference inventory.
- Commit `2ffdfee95864e7e6bac80077071c32ada25434cb` (`feat(parser): add minimal proposal contract and application`) introduced `src/lib/schemas/parser-proposal.ts`, `src/lib/domain/search/apply-parser-proposal.ts`, `tests/unit/schemas/parser-proposal.spec.ts` and `tests/unit/domain/search/apply-parser-proposal.spec.ts`. Existing state schemas and domain transitions were not changed.
- The schema validates supported filter proposals, unresolved person/keyword additions and explicit clarification/unsupported outcomes. It rejects model-supplied authority fields and accepted person/keyword IDs. Genre IDs require application-supplied catalog membership checks during application.
- `applyParserProposal()` uses `applyIntent()` and `applyPendingQueryCommand()` on a private working state. It checks the expected revision and fresh-reference bindings, preserves unrelated accepted/pending criteria and returns no intermediate state on rejection. Each effective internal transition retains its existing revision increment; a mixed successful proposal can advance revision more than once.
- Schema/domain unit tests cover mixed additions, unresolved people/keywords, absent-field/media preservation, Movie → TV → Movie genre restoration, optional scalar removal, no-ops, blocked proposals, stale revisions, invalid/reference-collision inputs, overflow rollback, contradictory years and catalog restrictions. These tests exercise synthetic proposals and real domain transitions, not natural-language extraction or live LLM behavior.
- On 2026-11-17 the user reported all tests passing and then explicitly confirmed that tests, coverage checking, ESLint and typecheck were all green for this implementation step. This is user-reported local validation associated with `2ffdfee`, not an assistant-executed run or independently certified CI result. No exact coverage percentage or command logs were supplied. Historical pre-WP-011 validation does not substitute for this separate report.
- Current limitations: entity additions only; entity replacement/refinement/removal routing and coupled multi-entity changes are not integrated into this adapter. Clarification/unsupported proposals remain wholly unapplied with their parsed proposal retained. New incompatible genre assignments are blocked with the proposal retained rather than silently reinterpreted. These limits do not remove the broader specification requirements.
- Remaining work includes the next approved proposal operations and clarification integration, any demonstrated domain-contract gaps, parser input/instruction composition and an approved model integration. Trusted original-request association and caller-side lifecycle/atomic adoption remain integration responsibilities; expected-revision checking alone is not end-to-end replay protection.
- No production parser caller, model/HTTP endpoint, identity-resolution implementation, Movie/TV execution, persistence, UI or automatic search was introduced by this slice. Provider identity resolution remains WP 014; confirmed result execution remains WP 012.
- This status update changes documentation only and leaves the Specification unchanged. No runtime files, schemas or tests changed and no validation commands were run by the assistant for this update.
