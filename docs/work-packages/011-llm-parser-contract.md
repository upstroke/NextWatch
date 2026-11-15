# LLM parser contract

## Specification

### Purpose

Define validated parser input/output for LLM-assisted extraction of filters and entity queries. Follow the [WP 009 state-application contract](009-search-state-and-filter-catalog.md) and [WP 012 participation semantics](012-search-execution-and-discover.md#scope) rather than introducing a second state model.

### Scope

- Define parser inputs, outputs, filter fields, entity-query fields and validation boundaries.
- Extract one or multiple person names, keyword queries and requested media type. Preserve common participation when people are joined by AND.
- With no explicit media type, preserve the contract default permitting movies and series.
- Distinguish additions, replacements and removals for subsequent validated domain application; internal references are controlled by the application, not guessed by the model.
- Preserve acting-participation intent. Do not reinterpret it as crew work or appearances as oneself.
- Prepare extracted data for WP 009 pending-query operations and WP 010 clarification.

### Integration with existing WP 009 code

- Reuse `SearchState`, accepted ID/name records and structured pending person/keyword requests from `src/lib/schemas/search-state.ts`. Do not emit bare strings as an alternative domain-state format or invent resolved IDs.
- Define an explicit validated application adapter from parser output to `PendingQueryCommandSchema` in `src/lib/schemas/search-transition.ts`. The application supplies references and base revisions; it resolves replacement targets against the current accepted state rather than trusting model-generated IDs. Ambiguous targets require clarification.
- Apply pending changes through `applyPendingQueryCommand()` and supported filter intents through `applyIntent()`. Preserve existing atomicity boundaries; specify coordination for requests containing both filter and entity changes before implementation.
- Do not expand chat filter changes to edit `people` or `personIds`; validated person acceptance remains a separate trusted boundary.
- Complete genre catalogs are application-supplied inputs to existing genre compatibility handling, not model-generated lists or evidence of provider identity.
- Parser integration must retain inactive genre wishes and unrelated pending requests via the existing domain functions, not by reconstructing a partial state.

### Out of scope

- Person/keyword identity lookup or candidate selection: assigned to [WP 014](014-entity-resolution.md).
- Search execution (WP 012), result presentation, automatic error recovery and full LLM implementation.
- Inventing provider IDs, selecting popular candidates or applying unvalidated model output.

### Inputs and outputs

Inputs: user request, existing search state, filter catalog and validation schemas. Outputs: parser input/output contracts, extracted filters and unresolved entity queries ready for validated application.

### Implementation tasks and acceptance criteria

- Define and validate parser input/output and extraction fields.
- Extract single/multiple person requests and keyword queries without turning names into IDs.
- Preserve requested media type and AND semantics.
- Integrate with WP 009 operations; preserve unrelated accepted criteria.
- Test the application adapter, reference/revision ownership, replacement-target clarification and mixed filter/entity coordination without live entity lookup.
- Test extraction-contract validation and state-application compatibility without live entity lookup.

## Execution status

- Specification aligned on 2026-11-15; actual entity resolution is explicitly assigned to WP 014.
- Replaced the separate requirements-document reference with direct state-contract and participation-semantics links.
- Integration scope aligned with inspected code at `26aefe9`; WP 009 already supplies structured pending commands and person-state transitions. Parser extraction and its application adapter remain separate work, not implemented by this update.
- Documentation-only update, not a claim of parser implementation or completion of WP 009.
- No tests, coverage, lint or typecheck were run for this update.
