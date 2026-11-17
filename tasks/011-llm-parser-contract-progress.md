# WP 011 — Current branch status

Updated 2026-11-17. Active branch: feat/011-shared-change-adapter. Baseline: b742dd84b52a3a3d710d9a7e86a4cf23734bb7ae, immediately before db830a50.

## Purpose and authority

This is the current implementation/status record, not a new product specification or replacement architecture. Read [WP 011](../docs/work-packages/011-llm-parser-contract.md), its [decision supplement](../docs/work-packages/011-parser-contract-decisions.md), the existing [plan](011-llm-parser-contract-plan.md) and [review](011-llm-parser-contract-review.md).

The original plan already calls for a shared pure application adapter with existing WP 009/010 boundaries. It is not declared fundamentally wrong by this restart. The plan and review remain unchanged in this commit, including their historical branch/status references and technical proposals. Use this record for present implementation evidence; do not treat their earlier all-design/no-runtime wording as a current code inventory, or their withdrawn migration wording as an active requirement. Exact technical mechanisms remain review proposals, not automatic implementation approval.

## Present at the baseline

- b2e8407 introduced dedicated parser schemas, JSON Schema export code, request composition/response validation, synthetic fixtures and unit suites.
- 0400ce4 added keyword-reference and capacity-context tests; 4eac220 clarified a nullable-source guard; b742dd8 formatted that baseline.
- Source files include src/lib/schemas/parser.ts and src/lib/parser/instructions.ts, compose-request.ts and validate-response.ts. Existing state, intent application, pending operations, person selection/correction, genre compatibility and guardrails are retained.
- Existing parser unit suites include tests/unit/schemas/parser.spec.ts, parser-context.spec.ts and tests/unit/parser/compose-request.spec.ts, validate-response.spec.ts. Presence does not prove complete application coverage.
- Instruction artifact is 0.1.2-draft; provider connection and complete shared adapter are not implemented.
- Independent person and candidate constants are already five each; known-title limit is two. No migration occurred or is required.

## Reference-branch work is not present implementation

The former feat/011-llm-parser-contract branch is retained, not reset, deleted or merged by this change. Its later continuation schema/commands, binding registry and bound-person wrappers/tests are not imported or a mandatory sequence for the new branch. The separate result-store plan was proposed but never committed.

The user's local checkout is reported, not independently inspected. Remote evidence does not establish local cleanliness or absence of unpushed work. Later user test reports and code on the reference branch are not a claim of active-branch feature completion.

## Next concrete step

Review the exact common adapter input/output for the already specified mixed case: apply TV while retaining the entire unresolved replacement of Tom Hanks by Chris. Reuse applyIntent(), pending commands, controlled acceptance and existing clarification/wizard boundaries. Determine the smallest genuinely missing representation/API from that complete case before code; do not create a generic additional store or complete workflow per criterion first.

The full shared application adapter, broader mixed/coupled operations, source/meaning/year/capacity mappings, correction metadata, protected reservations, compound/whole-selection acceptance and valid unchanged-result retention remain open as required by the product specification. This status update closes no R01–R06 finding and does not cancel those requirements.

## Validation

Historical user reports for the parser baseline included tests, coverage, lint and typecheck; 87% was reported for the parser schema, not as a fresh whole-project measurement. No test, coverage, typecheck, lint, schema-export check, model evaluation or provider call was run by the assistant for this documentation alignment. Obtain current results for subsequent code; preserve at least 80% statement coverage including unimported modules.

## Scope of this commit

Only AGENTS.md, README.md, the WP 011 specification's limited migration/status corrections, the decision history's later decisions/status and this new record change. The implementation plan, review and existing wizard document remain intact. The earlier proposed wholesale seven-document rewrite was withdrawn, not committed.

No runtime code, schemas, tests, constants, instructions, wizard UI, provider/HTTP/CLI, persistence, retries, title execution, PR or merge. WP 011 remains incomplete; dependency order remains WP 011 → WP 014 → WP 012.
