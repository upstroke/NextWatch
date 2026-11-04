# NextWatch Studio — AI development rules

## Purpose

NextWatch is a controlled search application. The LLM proposes structured filter changes; the application validates and executes them.

## Non-negotiables

- Do not create autonomous search or recommendation agents.
- Do not expose TMDb credentials to the client.
- Do not call TMDb directly from browser code.
- Do not apply unvalidated LLM output to search state.
- Do not guess TMDb keyword IDs.
- Do not store real user conversations permanently.
- Do not push, merge or deploy without explicit user approval.

## Contract rules

- Zod schemas are the source of truth for runtime validation.
- TypeScript types are derived with `z.infer`.
- Validate LLM output before changing state.
- Validate TMDb responses at the server boundary.
- Search state changes only through validated, domain-approved changes.

## Workflow

1. Define the task.
2. Read the relevant specification, schemas and tests.
3. Create a plan with affected files.
4. Obtain user approval.
5. Implement only the approved scope.
6. Run automated validation.
7. Review against specifications and guardrails.
8. Obtain user approval before committing or opening a pull request.
