# LLM parser contract

## Specification

### Purpose

Define validated parser input/output for LLM-assisted extraction of filters and entity queries. Follow the approved [person search contract](../person-search-contract.md) and the WP 009 state-application contract rather than introducing a second state model.

### Scope

- Define parser inputs, outputs, filter fields, entity-query fields and validation boundaries.
- Extract one or multiple person names, keyword queries and requested media type. Preserve common participation when people are joined by AND.
- With no explicit media type, preserve the contract default permitting movies and series.
- Distinguish additions, replacements and removals for subsequent validated domain application; internal references are controlled by the application, not guessed by the model.
- Preserve acting-participation intent. Do not reinterpret it as crew work or appearances as oneself.
- Prepare extracted data for WP 009 pending-query operations and WP 010 clarification.

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
- Test extraction-contract validation and state-application compatibility without live entity lookup.

## Execution status

- Specification aligned on 2026-11-15; actual entity resolution is explicitly assigned to WP 014.
- Documentation-only update, not a claim of parser implementation.
- No tests, coverage, lint or typecheck were run for this update.
