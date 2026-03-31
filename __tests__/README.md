# Tests Directory

This directory contains automated tests organized into 3 categories based on cost and infrastructure requirements.

## Test Categories

### Category 1: Unit Tests (Free)

**No external services required. Runs on every commit/PR in CI.**

```bash
pnpm test
```

| Pattern     | Description         |
| ----------- | ------------------- |
| `*.test.ts` | Standard unit tests |

Examples: `markdown.test.ts`, `auth-performance.test.ts`

**When to write unit tests (and when not to):** In a strongly-typed TypeScript codebase, the compiler already enforces data shapes, return types, and interface contracts. Don't write unit tests that just re-assert what the type system guarantees — that's low-value busywork.

Skip unit tests for:

- Adapter methods that follow an established pattern (e.g. `getAnthropicKey` mirrors `getOpenAIKey` — types enforce the contract)
- Simple pass-through / delegation code
- Anything where a type error would catch the bug at compile time

Do write unit tests for:

- **Conditional branching / routing logic** — types say `provider` is `"openai" | "anthropic"`, but can't prove the right branch executes
- **Edge cases in data transforms** — empty strings, whitespace trimming, null coalescing (e.g. treating `""` as `null`)
- **Regression-prone defaults** — someone accidentally changes a fallback value; types won't catch it

Prefer integration tests (Category 2) over unit tests with mocked infrastructure. They test real queries against real databases and catch actual breakage. Unit tests with mocked DB calls mostly test your mocks.

### Category 2: Service Tests (Local Infrastructure)

**Requires Docker services (Redis, Neo4j). Run manually or in special CI workflow.**

```bash
pnpm docker:up      # Start services first
pnpm test:services
```

| Pattern                 | Description                         |
| ----------------------- | ----------------------------------- |
| `*.integration.test.ts` | Tests requiring Redis or filesystem |
| `*.neo4j.test.ts`       | Tests requiring Neo4j database      |

Examples: `auth-real-redis.integration.test.ts`, `queries.neo4j.test.ts`

### Category 3: External Tests (API Calls)

**Makes real API calls. Costs money or uses rate limits. Run manually and carefully.**

```bash
pnpm test:external
```

| Pattern            | Description                                  |
| ------------------ | -------------------------------------------- |
| `*.openai.test.ts` | OpenAI/LLM API tests (costs tokens)          |
| `*.github.test.ts` | GitHub API tests (uses rate limits)          |
| `*.llm.test.ts`    | Legacy LLM tests (same as openai)            |
| `*.e2e.test.ts`    | End-to-end tests (touches multiple services) |

Examples: `resolveIssue.llm.test.ts`, `webhook-to-workflow.e2e.test.ts`

---

## Quick Reference

| Command              | Category | Cost          | CI               |
| -------------------- | -------- | ------------- | ---------------- |
| `pnpm test`          | Unit     | Free          | ✓ Every commit   |
| `pnpm test:services` | Services | Free (Docker) | Special workflow |
| `pnpm test:external` | External | $$$           | Manual only      |

---

## Directory Structure

```
__tests__/
├── config/                    # Jest configurations
│   ├── jest.config.base.ts    # Shared config
│   ├── jest.config.unit.ts    # Category 1
│   ├── jest.config.services.ts # Category 2
│   └── jest.config.external.ts # Category 3
├── lib/                       # Tests for lib/ code
│   └── auth/                  # Auth performance tests
├── api/                       # Tests for API routes
├── shared/                    # Tests for shared/ code
│   └── adapters/neo4j/        # Neo4j integration tests
├── e2e/                       # End-to-end tests
└── mocks/                     # Shared test mocks
```

---

## Environment Setup

### For Service Tests (Category 2)

1. Start Docker services:

   ```bash
   pnpm docker:up
   ```

2. Create test environment file (optional):

   ```bash
   cp __tests__/.env.example __tests__/.env
   ```

### For External Tests (Category 3)

Ensure `.env.local` contains required API keys:

- `OPENAI_API_KEY` - For LLM tests
- `GITHUB_TOKEN` - For GitHub API tests

---

## Writing New Tests

1. **Determine the category** based on what services the test needs
2. **Use the appropriate suffix**:
   - Unit test → `myfeature.test.ts`
   - Needs Redis/Neo4j → `myfeature.integration.test.ts` or `myfeature.neo4j.test.ts`
   - Calls OpenAI → `myfeature.openai.test.ts`
   - Calls GitHub API → `myfeature.github.test.ts`
   - Full E2E → `myfeature.e2e.test.ts`

3. **Place in the right directory** mirroring the source structure

---

## Notes

- Unit tests should be fast and deterministic
- Service tests may take longer due to DB operations (30s timeout)
- External tests have 120s timeout for API calls
- External tests run serially to avoid rate limiting
