# Neo4j Integration Tests

This directory contains integration tests for the Neo4j StorageAdapter and query helpers.

## Quick Start

```bash
# 1. Start test infrastructure (Neo4j + Redis)
pnpm test:infra:up

# 2. Run Neo4j integration tests
pnpm test:neo4j

# 3. Stop test infrastructure when done
pnpm test:infra:down
```

## Setup

### Prerequisites

1. **Docker**: Required to run the test infrastructure
2. **Environment File**: Copy the example config:
   ```bash
   cp __tests__/.env.neo4j.example __tests__/.env.neo4j
   ```

The default config uses the shared test infrastructure (same Neo4j instance as e2e tests):
- Port: 17687 (separate from dev port 7687)
- Password: `e2e-test-password`

### Test Infrastructure

The test infrastructure is shared between Neo4j integration tests and e2e tests:

```bash
# Start (Neo4j on port 17687, Redis on port 16379)
pnpm test:infra:up

# Stop and remove volumes
pnpm test:infra:down
```

## Test Files

| File | Description |
|------|-------------|
| `StorageAdapter.neo4j.test.ts` | Tests StorageAdapter methods (getById, list, etc.) |
| `workflowRuns.neo4j.test.ts` | Tests workflow run creation and progressive attachment |
| `visibility.neo4j.test.ts` | Tests workflow run visibility (users only see their own runs) |
| `queries.neo4j.test.ts` | Tests query helpers (listByUser, listForIssue, etc.) |
| `testUtils.ts` | Shared utilities for test setup/cleanup |

## Running Tests

```bash
# Run all Neo4j integration tests
pnpm test:neo4j

# Run specific test file
pnpm test:neo4j visibility
pnpm test:neo4j StorageAdapter

# Run with verbose output
pnpm test:neo4j --verbose
```

## Test Isolation

Tests use hardcoded test IDs (prefixed with `test-`) and clean up after themselves. Each test file manages its own test data to avoid conflicts.

## Troubleshooting

### Connection Errors

**Error**: `NEO4J_URI, NEO4J_USER, and NEO4J_PASSWORD must be set`
- Ensure `__tests__/.env.neo4j` exists with correct values

**Error**: `ServiceUnavailable: Could not perform discovery`
- Run `pnpm test:infra:up` to start the test database

### Port Conflicts

The test infrastructure uses offset ports to avoid conflicts:
- Neo4j: 17687 (dev uses 7687)
- Redis: 16379 (dev uses 6379)
