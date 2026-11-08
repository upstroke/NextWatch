# 001e — Discover simplification and statement coverage

## Goal

Simplify the Discover implementation for readability and introduce a minimum **statement coverage** threshold of 80 percent.

This task does not add features. It improves the HTTP boundary, reduces unnecessary schema complexity and aligns tests with observable behavior.

## Coverage policy

Measure statement coverage only for deliberately selected, testable application logic:

- `src/lib/schemas/**/*.ts`
- `src/lib/domain/**/*.ts`
- `../../../server`
- `../../../server`

Exclude from coverage:

- `../../../server`
- `app/**`
- `components/**`
- `pages/**`
- generated files
- `**/*.d.ts`

Set the Vitest coverage threshold:

```ts
thresholds: {
  statements: 80;
}
```

Coverage is a quality signal, not a target for writing implementation-detail tests. Tests should verify acceptance-relevant behavior.

## Planned changes

- Add `../../../src/lib/schemas/discover-query.ts`: a small HTTP query schema that coerces URL query strings.
- Simplify `../../../src/lib/schemas/discover.ts`: keep a clear domain `DiscoverFilters` contract using numbers and arrays.
- Update `../../../server` and `../../../server`: validate HTTP query input, then map it clearly to `DiscoverFilters`.
- Simplify `../../../server`, `discover.ts` and `discover-mappers.ts` only where readability improves; preserve behavior.
- Update `../../../vitest.config.ts` with focused coverage includes/excludes and the 80 percent statement threshold.
- Streamline `../../../tests/unit/services/discover.spec.ts`: retain behavior-focused tests and remove duplicated implementation-detail assertions.
- Keep `tests/http/discover.api.ts` unchanged unless behavior changes.

## Acceptance criteria

- `pnpm test:coverage` reports at least 80 percent statement coverage for the defined scope.
- `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build` and `pnpm test:e2e` pass locally.
- Movie and TV Discover behavior remains unchanged.
- HTTP query strings are converted to typed domain filters at the route boundary.
- UI, Nitro routes and generated files are not included in the coverage metric.
- The Discover schema code is easier to read than the current union/transform/pipe implementation.

## Out of scope

- New Discover filters or TMDb capabilities.
- Filter pills, Pinia, URL state, infinite scroll, backdrops or detail pages.
- LLM integration.
- Changing the Trending behavior.
- Adding coverage thresholds for lines, branches or functions.

## Validation status

Completed.

Validation results:

- Statement coverage is 93.06 percent, above the required 80 percent threshold.
- Discover schemas, services, mappers, parameters and error handling are covered by focused unit tests.
- HTTP query strings are validated and converted to typed domain filters at the route boundary.
- `pnpm test:coverage`, `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build` and `pnpm test:e2e` have been validated locally.

Implementation notes:

- Added `../../../src/lib/schemas/discover-query.ts` for HTTP query coercion and validation.
- Simplified `../../../src/lib/schemas/discover.ts` into a typed domain filter contract.
- Updated both Discover routes to validate HTTP query input before mapping it to `DiscoverFilters`.
- Added `INVALID_QUERY` to the TMDb error mapping.
- Reduced duplication in the Discover service and response mappers.
- Configured focused Vitest coverage includes/excludes and the 80 percent statement threshold.
- Streamlined Discover server tests to focus on observable behavior.
