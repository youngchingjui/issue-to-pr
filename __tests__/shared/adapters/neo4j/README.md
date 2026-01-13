# Neo4j Integration Tests

This directory contains read-only integration tests for the Neo4j StorageAdapter and query helpers.

## Purpose

These tests verify that:

- The StorageAdapter can correctly retrieve data from Neo4j
- Query helper functions work as expected
- Mappers correctly transform Neo4j records to domain objects
- Database connections and sessions work properly

## Setup

### Prerequisites

1. **Neo4j Database**: You need a local Neo4j instance running
   - Download from: https://neo4j.com/download/
   - Or use Docker: `docker run -p 7474:7474 -p 7687:7687 -e NEO4J_AUTH=neo4j/password neo4j:latest`

2. **Environment Variables**: Create or update `.env.local` in the project root:

   ```env
   NEO4J_URI=bolt://localhost:7687
   NEO4J_USER=neo4j
   NEO4J_PASSWORD=your-password
   ```

3. **Test Data**: The tests are designed to work with existing data in your database. While they will pass on an empty database, they're most useful when you have:
   - WorkflowRun nodes
   - Repository nodes
   - User/GithubUser nodes
   - Relationships between these nodes (TARGETS, BASED_ON_ISSUE, INITIATED_BY)

## Running the Tests

### Run all Neo4j integration tests:

```bash
pnpm test:neo4j
```

### Run tests in watch mode:

```bash
pnpm test:neo4j:watch
```

### Run a specific test file:

```bash
pnpm test:neo4j StorageAdapter
```

## Test Files

### `StorageAdapter.neo4j.test.ts`

Tests the main StorageAdapter methods:

- `workflow.run.getById()` - Retrieve a workflow run by ID
- `workflow.run.list()` - List workflow runs (placeholder)
- `workflow.run.listEvents()` - List events for a run (placeholder)
- Database connectivity and session management

### `queries.neo4j.test.ts`

Tests the query helper functions:

- `listByInitiator` - Find workflow runs by user
- `listForIssue` - Find workflow runs for an issue
- `listForRepo` - Find workflow runs for a repository
- `listEventsForWorkflowRun` - Get events for a workflow run
- Query mappers and performance

### `testUtils.ts`

Shared utilities for Neo4j integration tests:

- `createTestDataSource()` - Create Neo4j data source from env vars
- `verifyConnection()` - Check database connectivity
- `cleanupTestData()` - Remove test data (for write tests in the future)
- Helper functions for querying test data

## Important Notes

### Read-Only Tests

These tests are **read-only** by design. They:

- ✅ Query existing data
- ✅ Verify data retrieval works correctly
- ✅ Test mappers and transformations
- ❌ Do NOT create new data
- ❌ Do NOT modify existing data
- ❌ Do NOT delete data

### Running Against Production Data

**⚠️ WARNING**: Do not point these tests at a production database. While the tests are read-only, they should only be run against local development databases.

### Graceful Degradation

The tests are designed to gracefully handle empty databases:

- If no data exists for a query, the test will log a warning and skip
- Tests verify the queries execute without errors even on empty results
- Some tests check for data existence first before testing retrieval

## Configuring for Different Environments

### Local Neo4j Desktop

```env
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=neo4j
```

### Local Docker Container

```env
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password
```

### Remote Development Database

```env
NEO4J_URI=bolt://dev-server.example.com:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=secure-password
```

## Troubleshooting

### Connection Errors

**Error**: `NEO4J_URI, NEO4J_USER, and NEO4J_PASSWORD must be set`

- **Solution**: Create `.env.local` with the required environment variables

**Error**: `ServiceUnavailable: Could not perform discovery`

- **Solution**: Ensure Neo4j is running and accessible at the specified URI

### No Test Data

**Warning**: `No workflow runs found in database. Skipping test.`

- **Expected**: This is normal for empty databases
- **To Fix**: Run the application and create some workflow runs, or populate test data manually

### Authentication Errors

**Error**: `AuthenticationError: The client is unauthorized`

- **Solution**: Check that NEO4J_USER and NEO4J_PASSWORD are correct

## Future Enhancements

When write operations are needed:

1. Create separate write test files (e.g., `StorageAdapter.write.neo4j.test.ts`)
2. Use `cleanupTestData()` in `afterEach` to clean up created data
3. Consider using a separate test database
4. Add transaction rollback for test isolation

## CI/CD Integration

To run these tests in CI:

1. Set up a Neo4j service container
2. Populate with fixture data
3. Set environment variables
4. Run `pnpm test:neo4j`

Example GitHub Actions:

```yaml
services:
  neo4j:
    image: neo4j:latest
    env:
      NEO4J_AUTH: neo4j/password
    ports:
      - 7687:7687
      - 7474:7474

steps:
  - name: Run Neo4j integration tests
    env:
      NEO4J_URI: bolt://localhost:7687
      NEO4J_USER: neo4j
      NEO4J_PASSWORD: password
    run: pnpm test:neo4j
```
