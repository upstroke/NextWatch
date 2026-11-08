# Typing

This document is the single source of truth for TypeScript typing conventions in NextWatch.

## Principles

- Zod schemas are the source of truth for validated external data contracts and runtime validation.
- TypeScript provides compile-time structure and developer tooling; it does not validate data at runtime.
- Do not duplicate a type that can be derived from an existing Zod contract.
- Do not create a Zod schema, interface or type alias for every internal function or implementation detail.

## Zod contracts

For every external structure, define exactly one Zod schema in `src/lib/schemas` and derive its TypeScript type from that schema:

```ts
export const TmdbRuntimeConfigSchema = z.object({
  apiReadAccessToken: z.string(),
  baseUrl: z.string(),
});

export type TmdbRuntimeConfig = z.infer<typeof TmdbRuntimeConfigSchema>;
```

Follow these rules:

- Do not create a separate manual `interface` or `type` for a structure that already has a Zod schema.
- Derive public domain types with `z.infer<typeof Schema>`.
- Services and UI code import the derived type, not the schema.
- Only boundaries call `.parse()` or `.safeParse()`: TMDb responses, query parameters, runtime configuration, and other external input.
- A semantic type alias may reference a derived type, for example `type TmdbConfig = TmdbRuntimeConfig`, but must not redefine its fields.
- Derive related field keys and dependent types from existing contracts instead of maintaining parallel lists or duplicate data-contract definitions.

## Internal functions

For functions without a Zod contract, type only the parameters TypeScript cannot infer from context. Prefer inferred return types; add an explicit return type only for a public contract or when inference is unclear.

Use a named `type` or `interface` only when a structure is reused, forms a public contract, or needs a distinct name. Do not create Zod schemas, interfaces or type aliases for every internal function.

When a function accepts or returns an object or another function, define the required structure at the relevant boundary. Reuse an existing type, derive it from an existing contract, or define it directly in the function signature when it is used only locally.

## Type assertions

Do not use `as` to suppress type errors or as a substitute for validation.

- Use Zod for external or untrusted data.
- Use a type predicate only after a real runtime check.
- Use `as` only when TypeScript cannot derive information that has already been established by a real check.

## Shared type locations

Store reusable TypeScript types in a dedicated, topic-based location.

| Type                             | Location                                           | Rule                                                              |
| -------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------- |
| Zod contract                     | `src/lib/schemas`                                  | One schema per external structure; derive its type with `z.infer` |
| Derived contract type            | Beside its schema or in the relevant domain module | Keep it directly associated with its contract                     |
| Cross-module type                | `src/types/<topic>.ts`                             | Use only for types shared by independent modules                  |
| Feature- or domain-specific type | Near its feature or domain                         | Keep it close to its use                                          |
| Local function type              | In the function's file                             | Do not centralize a type used by one function                     |
| Injected dependency type         | In the module defining the boundary                | Keep the contract with its consumer or provider                   |

Do not create a central catch-all `types.ts` or an automatic barrel export for types. Imports should point to the specific type file.

Prefer `type` for reusable TypeScript types. Use `interface` only when declaration merging or interface extension is intentionally required.

## Related documentation

- [Testing](testing.md): test boundaries, fixtures, mocks and test locations.
- [Service boundaries and ADR 001](../specs/architecture/001-service-boundaries.md): architecture decisions for API and state code.
