# **tests** Directory

This directory contains automated and manual tests for the project.

## Structure

- `*.test.ts` / `*.spec.ts`: Fast, automated unit and integration tests. These are run by default in CI and local `npx jest` runs.
- `*.llm.test.ts`: Manual or expensive tests that interact with real LLMs or external APIs. These are **excluded** from regular test runs and CI by default (see `jest.config.ts`).

## Running Manual/LLM Tests

### Using npm/pnpm script (Recommended)

```bash
# Run all agent tests (loads .env.local automatically)
pnpm test:agent
```

### Using Jest directly

- To run a specific LLM/manual test:
  ```bash
  npx jest __tests__/llm-lint.llm.test.ts
  ```
- To run all LLM/manual tests:
  ```bash
  npx jest "**/*.llm.test.ts"
  ```
- To run a specific test case inside a file, use `test.only` or:
  ```bash
  npx jest __tests__/llm-lint.llm.test.ts -t "test name"
  ```

## Environment Variables

Agent tests automatically load environment variables from `.env.local` during test setup. Make sure your `.env.local` file contains all required variables for agent tests.

## Notes

- LLM/manual tests are skipped by default to avoid unnecessary cost and latency.
- Place new manual/LLM tests in this folder with the `.llm.test.ts` suffix.
- See `test-utils/mocks/README.md` for info on test fixtures.
