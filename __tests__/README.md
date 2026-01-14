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

## Neo4j Integration Tests

Neo4j integration tests require a running Neo4j database. **IMPORTANT: Use a separate test database, not your production or development database!**

### Setup

1. **Create test environment file:**

   ```bash
   cp __tests__/.env.example __tests__/.env
   ```

2. **Configure test database credentials:**
   Edit `__tests__/.env` and fill in your test Neo4j database credentials:

   ```env
   NEO4J_URI=bolt://localhost:7687
   NEO4J_USER=neo4j
   NEO4J_PASSWORD=your-test-password
   ```

3. **Ensure Neo4j is running:**
   - If using Docker:
     ```bash
     docker run -d \
       --name neo4j-test \
       -p 7687:7687 -p 7474:7474 \
       -e NEO4J_AUTH=neo4j/your-test-password \
       neo4j:latest
     ```
   - Or use a local Neo4j installation pointing to a test database

### Running Neo4j Tests

```bash
pnpm test:neo4j
```

### Test Database Isolation

- Tests use hardcoded test data IDs (prefixed with `test-` or `test-prog-`)
- Cleanup functions remove only these specific test nodes
- Tests are designed to be idempotent and can be run multiple times

## Environment Variables

- **Agent tests**: Automatically load environment variables from `.env.local` (at project root) during test setup. Make sure your `.env.local` file contains all required variables for agent tests.
- **Neo4j integration tests**: Load environment variables from `__tests__/.env` for database configuration. This allows tests to use a separate test database.

## Notes

- LLM/manual tests are skipped by default to avoid unnecessary cost and latency.
- Place new manual/LLM tests in this folder with the `.llm.test.ts` suffix.
- See `test-utils/mocks/README.md` for info on test fixtures.

## LLM Agent Tool Call Regression Test

- The file `__tests__/lib/agents/lint.llm.test.ts` includes a test that instantiates a TestAgent, seeds it with a real message mock including a tool call, and runs one agent iteration. This verifies that, **with TypeScript strict mode enabled**, LLM agents can successfully call tools with OpenAI-compatible function schemas.
- This serves as the regression test for LLM agent + tool integration and structured tool call compatibility (see GitHub issue: "consider turning on strict mode").
