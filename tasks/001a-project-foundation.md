# 001a — Project foundation

## Task

Create the initial NextWatch Studio repository foundation.

## Affected areas

- Project configuration
- Nuxt application shell
- Zod contract layer
- Initial schema tests
- Studio specifications and documentation

## Requirements

- Use pnpm.
- Use strict TypeScript.
- Use Zod as the single source of truth for runtime contracts.
- Derive TypeScript types with `z.infer`.
- Keep TMDb credentials server-side only.
- Do not implement TMDb or LLM behavior in this task.

## Definition of done

- Initial schema tests pass.
- Linting, formatting and type checking are configured.
- The repository contains a clear starting structure for later tasks.
- The commit remains limited to the foundation scope.
