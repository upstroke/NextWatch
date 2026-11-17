# Title disambiguation and providers

## Specification

### Purpose

Clarify ambiguous title candidates and retrieve provider information for the selected Movie/TV title. Follow the [product and search flow](000-product-and-search-flow.md); title lookup is separate from the criteria-based main search.

### Scope

- Define title-candidate selection and disambiguation states. Preserve media type and provider ID throughout selection.
- Validate selection against the offered candidates and relevant request context; do not guess a title merely to avoid clarification.
- Define provider lookup/output for a selected title and prepare it for later display.
- Keep provider region distinct from content language and distinguish streaming, rental and purchase where available.
- Reuse existing provider/service contracts before introducing new ones.

### Boundaries

Provider information for a selected title belongs here. Provider availability used to filter a criteria-based result set belongs to [WP 012](012-search-execution-and-discover.md), only within an agreed product filter contract. This package does not add provider-selection filters to the main draft.

Natural-language extraction belongs to [WP 011](011-llm-parser-contract.md); person/keyword identity resolution belongs to [WP 014](014-entity-resolution.md). Do not replace Discover filtering with Multi-Search plus incomplete post-filtering.

### Inputs and outputs

Inputs: title candidates, validated selected-title context and provider contracts. Outputs: disambiguation state, selected title and provider information.

### Out of scope

Criteria-based/Discover execution, result/UI rendering, automatic recovery and full LLM implementation.

### Acceptance criteria

- Ambiguous titles require controlled selection; Movie/TV identity is retained.
- Provider information can be retrieved and returned for the selected title through our server API.
- Errors, absent provider information and valid empty availability are distinguishable.
- Inspect concrete callers, schemas and tests and obtain a file-level plan approval before implementation.

## Execution status

- Planned integration. Existing technical title/provider services are not proof of an implemented interactive selection flow.
- 2026-11-17: Documentation structure and WP-012 boundary clarified. No runtime code, schemas or tests changed; no validation commands run.
