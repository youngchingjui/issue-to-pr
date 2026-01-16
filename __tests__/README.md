# **tests** Directory

This directory contains automated and manual tests for the project.

## Structure

- `*.test.ts` / `*.spec.ts`: Fast, automated unit tests. These are run by default in CI and local `pnpm test` runs.
- `*.llm.test.ts`: Manual or expensive tests that interact with real LLMs or external APIs. These are **excluded** from regular test runs and CI by default.
- `*.integration.test.ts`: Integration tests that interact with the filesystem, run CLI commands, or have other external dependencies. These are **excluded** from regular test runs and CI by default.

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

## Filesystem Tests

Filesystem tests run actual CLI commands and interact with the filesystem. These are excluded from regular test runs to avoid side effects in CI/CD environments.

```bash
pnpm test:fs
```

## End-to-End Tests

E2E tests verify full integration flows from webhook receipt through queue processing to worker execution. These require multiple services to be running.

### Setup

1. **Create e2e environment file:**

   ```bash
   cp __tests__/.env.e2e.example __tests__/.env.e2e
   ```

2. **Configure test services:**
   Edit `__tests__/.env.e2e` with your test environment:

   ```env
   REDIS_URL=redis://localhost:6379
   NEO4J_URI=bolt://localhost:7687
   NEO4J_USER=neo4j
   NEO4J_PASSWORD=your-test-password
   GITHUB_WEBHOOK_SECRET=test-secret-for-e2e
   ```

3. **Start required services:**

   ```bash
   # Start Redis and Neo4j (if using docker-compose)
   pnpm docker:up
   ```

### Running E2E Tests

```bash
pnpm test:e2e
```

### What E2E Tests Cover

- **Webhook Handler Flow**: Validates authorization, user settings lookup, and job enqueueing
- **Queue Integration**: Verifies jobs are correctly added to BullMQ
- **Worker Processing**: Tests that workers pick up and process jobs correctly
- **Full Flow**: Traces a job from enqueueing through worker completion

**Note:** E2E tests use real Redis/Neo4j but mock external APIs (GitHub, OpenAI) to prevent side effects.

---

**Note:** This is currently focused on filesystem/CLI tests. Eventually, we plan to have a unified `pnpm test:integration` command that runs all integration tests (LLM, Neo4j, filesystem, etc.) together.

## Environment Variables

- **Agent tests**: Automatically load environment variables from `.env.local` (at project root) during test setup. Make sure your `.env.local` file contains all required variables for agent tests.
- **Neo4j integration tests**: Load environment variables from `__tests__/.env` for database configuration. This allows tests to use a separate test database.

## Notes

- LLM/manual tests are skipped by default to avoid unnecessary cost and latency.
- Integration tests are skipped by default to avoid filesystem side effects in CI/CD.
- Place new manual/LLM tests in this folder with the `.llm.test.ts` suffix.
- Place new filesystem/CLI integration tests with the `.integration.test.ts` suffix.
- See `test-utils/mocks/README.md` for info on test fixtures.
- When mocking, I'm only concerend about mocking external dependencies or API calls that might incur costs or affect databases state or cause side effects.
- Not sure if we need to mock other internal dependencies like other modules within our codebase.
