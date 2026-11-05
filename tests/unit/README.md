# Unit tests

Isolated tests for schemas, services, utilities, and other testable application logic.

## Structure

```text
unit/
├── schemas/       # Zod and domain schema tests
├── services/      # Service, mapper, parameter, and error tests
└── utils/         # Utility tests
```

## Conventions

- Use the `.spec.ts` suffix.
- Start each test with a coverage intent comment:
  - `// Statement coverage: ...`
  - `// Branch coverage: ...`
- Keep tests focused on observable behavior.
- Mock external network boundaries; do not mock the module under test.
